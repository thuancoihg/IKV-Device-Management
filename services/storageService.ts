
import { Device, DeviceType, CloudPayload, Branch } from '../types';

/** 
 * CẤU HÌNH HỆ THỐNG MẶC ĐỊNH - BẮT BUỘC
 * Đây là cấu hình "Sẵn trong App", mọi thiết bị mới sẽ tự động dùng thông tin này.
 */
const DEFAULT_API_URL = 'https://inabata.vn/ikvdevicemaster/api.php'; 
const DEFAULT_PROJECT_ID = 'ikv_device_master';

const LOCAL_STORAGE_KEY = 'device_master_encrypted';
const SETTINGS_KEY = 'device_master_settings';

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

export const storageService = {
  getSettings: () => {
    const settings = localStorage.getItem(SETTINGS_KEY);
    const parsed = settings ? JSON.parse(settings) : {};
    
    // Luôn ưu tiên dùng Default từ mã nguồn nếu Storage trống (máy mới)
    return {
      projectId: parsed.projectId || DEFAULT_PROJECT_ID
    };
  },

  saveSettings: (settings: { projectId: string }) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  saveDataSecure: async (devices: Device[], branches: Branch[], password: string): Promise<void> => {
    const payload: CloudPayload = {
      devices,
      branches,
      version: '2.0',
      updatedAt: new Date().toISOString()
    };
    const json = JSON.stringify(payload);
    const encrypted = await cryptoUtils.encrypt(json, password);
    localStorage.setItem(LOCAL_STORAGE_KEY, encrypted);
  },

  getDataSecure: async (password: string): Promise<CloudPayload> => {
    const encrypted = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!encrypted) return { 
      devices: [], 
      branches: [
        { id: '1', name: 'Hồ Chí Minh', companyName: 'INABATA VIETNAM CO., LTD', address: 'Unit 902B, Sun Red River Building, 23 Phan Chu Trinh Str, Hoan Kiem Dist., Hanoi, Vietnam' },
        { id: '2', name: 'Đà Nẵng', companyName: 'INABATA VIETNAM CO., LTD', address: 'Unit 902B, Sun Red River Building, 23 Phan Chu Trinh Str, Hoan Kiem Dist., Hanoi, Vietnam' }
      ], 
      version: '2.0', 
      updatedAt: '' 
    };
    
    const decryptedJson = await cryptoUtils.decrypt(encrypted, password);
    const parsed = JSON.parse(decryptedJson);

    // Migration: if branches is string[], convert to Branch[]
    if (parsed.branches && parsed.branches.length > 0 && typeof parsed.branches[0] === 'string') {
      parsed.branches = parsed.branches.map((name: string, index: number) => ({
        id: (index + 1).toString(),
        name,
        companyName: 'INABATA VIETNAM CO., LTD',
        address: 'Unit 902B, Sun Red River Building, 23 Phan Chu Trinh Str, Hoan Kiem Dist., Hanoi, Vietnam'
      }));
    }

    return parsed as CloudPayload;
  },

  exportToCSV: (devices: Device[]) => {
    const headers = ['Type', 'Branch', 'Manufacturer', 'Model', 'Serial', 'Purchase Date', 'Warranty Expiry', 'Handover Date', 'Assigned To', 'Status', 'Notes'];
    const rows = devices.map(d => [
      d.type,
      d.branch || '',
      d.manufacturer,
      d.model,
      d.serialNumber,
      d.purchaseDate,
      d.warrantyExpiry,
      d.handoverDate,
      d.assignedTo,
      d.status,
      d.notes || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `devices_backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  parseCSV: (csvText: string, defaultBranch: string = 'Hồ Chí Minh'): Device[] => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];
    const header = lines[0];
    const delimiter = header.includes(';') ? ';' : ',';
    const result: Device[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === delimiter && !inQuotes) { values.push(current.trim()); current = ''; }
        else current += char;
      }
      values.push(current.trim());
      if (values.length >= 4) {
        const clean = (val: string) => (val || '').replace(/^"|"$/g, '').trim();
        result.push({
          id: Math.random().toString(36).substr(2, 9),
          type: (clean(values[0]) || DeviceType.LAPTOP) as DeviceType,
          branch: clean(values[1]) || defaultBranch,
          manufacturer: clean(values[2]),
          model: clean(values[3]),
          serialNumber: clean(values[4]),
          purchaseDate: clean(values[5]),
          warrantyExpiry: clean(values[6]),
          handoverDate: clean(values[7]),
          assignedTo: clean(values[8]),
          status: (clean(values[9]) || 'Available') as any,
          notes: clean(values[10]),
          history: []
        });
      }
    }
    return result;
  }
};
