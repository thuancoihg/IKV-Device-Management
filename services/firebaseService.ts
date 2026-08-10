import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { CloudPayload } from '../types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check database connection as required by rules
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Simple crypto utilities for encryption/decryption of document payload in firebase
const cryptoUtils = {
  deriveKey: async (password: string, salt: Uint8Array) => {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  encrypt: async (data: string, password: string) => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await cryptoUtils.deriveKey(password, salt);
    
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...combined));
  },

  decrypt: async (encryptedBase64: string, password: string) => {
    try {
      const combined = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const data = combined.slice(28);
      
      const key = await cryptoUtils.deriveKey(password, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      throw new Error('Decryption failed');
    }
  }
};

export const firebaseService = {
  syncWithFirebase: async (
    projectId: string,
    password: string,
    payload?: CloudPayload
  ): Promise<CloudPayload | null> => {
    if (!projectId) return null;
    const documentPath = `projects/${projectId}`;
    
    if (payload) {
      // Upload (push) payload to Firestore
      let encryptedData: string;
      try {
        encryptedData = await cryptoUtils.encrypt(JSON.stringify(payload), password);
      } catch (err) {
        throw new Error('Lỗi mã hóa dữ liệu trước khi đẩy lên Cloud');
      }

      try {
        await setDoc(doc(db, 'projects', projectId), {
          payload: encryptedData,
          updatedAt: new Date().toISOString(),
          version: payload.version || '2.0'
        });
        return payload;
      } catch (error) {
        console.error('Firebase Write Error:', error);
        handleFirestoreError(error, OperationType.WRITE, documentPath);
      }
    } else {
      // Download (pull) from Firestore
      let docSnap;
      try {
        const docRef = doc(db, 'projects', projectId);
        docSnap = await getDoc(docRef);
      } catch (error) {
        console.error('Firebase Read Error:', error);
        handleFirestoreError(error, OperationType.GET, documentPath);
      }
      
      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        if (data.payload) {
          try {
            const decrypted = await cryptoUtils.decrypt(data.payload, password);
            return JSON.parse(decrypted) as CloudPayload;
          } catch (decryptErr) {
            throw new Error(
              `Mật khẩu Master Key không khớp với dữ liệu mã hóa đã lưu trên Cloud (Dự án: ${projectId}).`
            );
          }
        }
      }
      return null;
    }
  }
};
