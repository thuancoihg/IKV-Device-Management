
import React, { useState, useEffect, useRef } from 'react';
import { Device, DeviceType, HistoryEntry, CloudPayload, Branch } from './types';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
import { firebaseService } from './services/firebaseService';
import { translations } from './translations';
import Dashboard from './components/Dashboard';
import DeviceTable from './components/DeviceTable';
import DeviceForm from './components/DeviceForm';
import HistoryModal from './components/HistoryModal';
import HandoverModal from './components/HandoverModal';
import { 
  Plus, Download, Upload, Sparkles, LayoutDashboard, 
  Database, LogOut, Loader2, CheckCircle2, Cloud, 
  Settings as SettingsIcon, AlertCircle, RefreshCw, Languages,
  Share2, Copy, Check, Lock, ShieldCheck, Key, X, Menu, ChevronLeft, ChevronRight,
  Info, AlertTriangle, Trash2, MapPin, Database as DbIcon, Shield, Printer
} from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

/**
 * Utility to remove Vietnamese diacritics
 */
export const removeAccents = (str: string): string => {
  if (!str) return '';
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D');
};

const App: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'vi'>('en');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authInput, setAuthInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [masterKey, setMasterKey] = useState<string>('');
  
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [externalExpiringFilter, setExternalExpiringFilter] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'settings'>('dashboard');
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newBranchInput, setNewBranchInput] = useState('');
  const [newBranchCompany, setNewBranchCompany] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [handoverMode, setHandoverMode] = useState<'handover' | 'return'>('handover');
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [historyDevice, setHistoryDevice] = useState<Device | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const initialSettings = storageService.getSettings();
  const [projectId, setProjectId] = useState<string>(initialSettings.projectId);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [passCurrent, setPassCurrent] = useState('');
  const [passNew, setPassNew] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  useEffect(() => {
    const current = storageService.getSettings();
    setProjectId(current.projectId);
  }, [lang]);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 4000);
  };

  const handleSync = async (
    direction: 'pull' | 'push', 
    updatedDevices?: Device[], 
    updatedBranches?: Branch[],
    keyToUse?: string
  ) => {
    const finalKey = keyToUse || masterKey;
    if (!projectId || !finalKey) return;
    setIsSyncing(true);
    try {
      const targetDevices = updatedDevices || devices;
      const targetBranches = updatedBranches || branches;

      const payload: CloudPayload = {
        devices: targetDevices,
        branches: targetBranches,
        version: '2.0',
        updatedAt: new Date().toISOString()
      };

      const result = await firebaseService.syncWithFirebase(
        projectId,
        finalKey,
        direction === 'push' ? payload : undefined
      );

      if (direction === 'pull' && result) {
        setDevices(result.devices);
        if (result.branches) setBranches(result.branches);
        await storageService.saveDataSecure(result.devices, result.branches || targetBranches, finalKey);
        setSyncStatus('success');
      } else if (direction === 'push') {
        setSyncStatus('success');
      } else if (direction === 'pull' && !result) {
        setSyncStatus('idle');
      }
    } catch (error) {
      setSyncStatus('error');
      let msg = "Lỗi đồng bộ Đám mây (Cloud Sync failed)";
      if (error instanceof Error) {
        msg = error.message;
        if (msg.startsWith('{') && msg.endsWith('}')) {
          try {
            const parsed = JSON.parse(msg);
            if (parsed && parsed.error) {
              msg = `Lỗi Firestore (${parsed.operationType}): ${parsed.error}`;
            }
          } catch {
            // keep original msg
          }
        }
      }
      addToast(msg, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    try {
      const dataPackage = await storageService.getDataSecure(authInput);
      setDevices(dataPackage.devices);
      setBranches(dataPackage.branches);
      setMasterKey(authInput);
      setIsAuthorized(true);
      handleSync('pull', undefined, undefined, authInput);
      addToast(lang === 'vi' ? "Mở khóa thành công" : "System unlocked", "success");
    } catch (err) {
      if (!localStorage.getItem('device_master_encrypted') && authInput === '123456') {
        const defaultBranches: Branch[] = [
          { id: '1', name: 'Hồ Chí Minh', companyName: 'INABATA VIETNAM CO., LTD', address: 'Unit 902B, Sun Red River Building, 23 Phan Chu Trinh Str, Hoan Kiem Dist., Hanoi, Vietnam' },
          { id: '2', name: 'Đà Nẵng', companyName: 'INABATA VIETNAM CO., LTD', address: 'Unit 902B, Sun Red River Building, 23 Phan Chu Trinh Str, Hoan Kiem Dist., Hanoi, Vietnam' }
        ];
        setBranches(defaultBranches);
        setMasterKey(authInput);
        setIsAuthorized(true);
        handleSync('pull', undefined, undefined, authInput);
        addToast(lang === 'vi' ? "Chào mừng bạn!" : "Welcome!", "success");
        return;
      }
      setAuthError(true);
      addToast("Invalid Master Key", "error");
    }
  };

  const handleUpdateMasterKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passCurrent !== masterKey) {
      addToast(t.wrongCurrentPass, "error");
      return;
    }
    if (passNew !== passConfirm) {
      addToast(t.passMismatch, "error");
      return;
    }
    if (passNew.length < 4) {
      addToast(lang === 'vi' ? "Mã mới quá ngắn" : "Key too short", "warning");
      return;
    }

    setIsUpdatingPass(true);
    try {
      await storageService.saveDataSecure(devices, branches, passNew);
      setMasterKey(passNew);
      setPassCurrent('');
      setPassNew('');
      setPassConfirm('');
      await handleSync('push', devices, branches, passNew);
      addToast(t.passSuccess, "success");
    } catch (err) {
      addToast("Lỗi khi đổi mã", "error");
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const handleSaveConfig = () => {
    storageService.saveSettings({ projectId });
    addToast(t.configSaved, "success");
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    addToast(lang === 'vi' ? "Đang xử lý file..." : "Processing file...", "info");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const imported = storageService.parseCSV(text, branches[0]?.name || 'Hồ Chí Minh');
        if (imported.length === 0) { addToast(t.importEmpty, "warning"); return; }
        const currentSerials = new Set(devices.map(d => d.serialNumber.toLowerCase()));
        const newDevices = imported.filter(d => !currentSerials.has(d.serialNumber.toLowerCase()));
        if (newDevices.length === 0) { addToast(t.importNoNew, "warning"); return; }
        const updated = [...devices, ...newDevices];
        setDevices(updated);
        await storageService.saveDataSecure(updated, branches, masterKey);
        addToast(t.importSuccess.replace('{count}', newDevices.length.toString()), "success");
        handleSync('push', updated, branches);
      } catch (err) { addToast(t.importError, "error"); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveDevice = async (newDeviceData: Device) => {
    let updatedDevices: Device[];
    const now = new Date().toISOString().split('T')[0];
    if (editingDevice) {
      const isAssigneeChanged = editingDevice.assignedTo !== newDeviceData.assignedTo;
      const isStatusChanged = editingDevice.status !== newDeviceData.status;
      const newHistory = [...(newDeviceData.history || [])];
      if (isAssigneeChanged || isStatusChanged) {
        newHistory.push({
          id: Math.random().toString(36).substr(2, 9),
          assignee: newDeviceData.assignedTo || t.unassigned,
          date: newDeviceData.handoverDate || now,
          notes: isAssigneeChanged ? (lang === 'vi' ? `Bàn giao mới tại ${newDeviceData.branch}` : `New handover at ${newDeviceData.branch}`) : `Cập nhật: ${newDeviceData.status}`
        });
      }
      updatedDevices = devices.map(d => d.id === newDeviceData.id ? { ...newDeviceData, history: newHistory } : d);
    } else {
      updatedDevices = [...devices, { ...newDeviceData, history: [{ id: 'init', assignee: 'Stock', date: now, notes: `Khởi tạo tại ${newDeviceData.branch}` }] }];
    }
    setDevices(updatedDevices);
    await storageService.saveDataSecure(updatedDevices, branches, masterKey);
    setIsFormOpen(false);
    handleSync('push', updatedDevices, branches);
  };

  const handleAddBranch = async () => {
    if (!newBranchInput.trim()) return;
    
    let updatedBranches: Branch[];
    if (editingBranchId) {
      updatedBranches = branches.map(b => b.id === editingBranchId ? {
        ...b,
        name: newBranchInput.trim(),
        companyName: newBranchCompany.trim() || 'INABATA VIETNAM CO., LTD',
        address: newBranchAddress.trim() || 'Unit 902B, Sun Red River Building, 23 Phan Chu Trinh Str, Hoan Kiem Dist., Hanoi, Vietnam'
      } : b);
      addToast(lang === 'vi' ? "Đã cập nhật chi nhánh" : "Branch updated", "success");
    } else {
      if (branches.some(b => b.name === newBranchInput.trim())) {
        addToast(lang === 'vi' ? "Chi nhánh đã tồn tại" : "Branch already exists", "warning");
        return;
      }
      const newBranch: Branch = {
        id: Math.random().toString(36).substr(2, 9),
        name: newBranchInput.trim(),
        companyName: newBranchCompany.trim() || 'INABATA VIETNAM CO., LTD',
        address: newBranchAddress.trim() || 'Unit 902B, Sun Red River Building, 23 Phan Chu Trinh Str, Hoan Kiem Dist., Hanoi, Vietnam'
      };
      updatedBranches = [...branches, newBranch];
      addToast(lang === 'vi' ? "Đã thêm chi nhánh" : "Branch added", "success");
    }

    setBranches(updatedBranches);
    setNewBranchInput('');
    setNewBranchCompany('');
    setNewBranchAddress('');
    setEditingBranchId(null);
    await storageService.saveDataSecure(devices, updatedBranches, masterKey);
    handleSync('push', devices, updatedBranches);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setNewBranchInput(branch.name);
    setNewBranchCompany(branch.companyName);
    setNewBranchAddress(branch.address);
  };

  const handleDeleteBranch = async (branchId: string) => {
    const updatedBranches = branches.filter(b => b.id !== branchId);
    setBranches(updatedBranches);
    await storageService.saveDataSecure(devices, updatedBranches, masterKey);
    handleSync('push', devices, updatedBranches);
    addToast(lang === 'vi' ? "Đã xóa chi nhánh" : "Branch deleted", "info");
  };

  const toggleLanguage = () => { setLang(prev => prev === 'en' ? 'vi' : 'en'); addToast(lang === 'vi' ? "Switched to English" : "Đã đổi sang Tiếng Việt", "info"); };
  const generateInsights = async () => { if (devices.length === 0) return; setIsAnalyzing(true); try { const result = await geminiService.analyzeInventory(devices); setAiInsights(result); addToast(lang === 'vi' ? "Đã cập nhật phân tích AI" : "AI Insights updated", "success"); } catch (error) { setAiInsights(lang === 'vi' ? "Phân tích AI thất bại." : "AI Analysis failed."); addToast("AI Error", "error"); } finally { setIsAnalyzing(false); } };
  const handleLogout = () => { setIsAuthorized(false); setMasterKey(''); setDevices([]); setMobileMenuOpen(false); addToast(lang === 'vi' ? "Đã đăng xuất" : "Signed out", "info"); };
  const handleShowExpiring = () => { setExternalExpiringFilter(true); setActiveTab('inventory'); setTimeout(() => setExternalExpiringFilter(false), 500); };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <ToastContainer toasts={toasts} />
        <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-2xl p-10 rounded-[40px] border border-slate-800 shadow-2xl relative z-10 text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center overflow-hidden mb-6 shadow-xl">
              <img 
                src="https://inabata.vn/wp-content/uploads/2021/05/logo-inabata.png" 
                alt="Logo" 
                className="w-full h-full object-contain p-2" 
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://inabata.vn/favicon.ico'; }}
              />
            </div>
            <h1 className="text-2xl font-black text-white mb-2 tracking-tight">{t.loginTitle}</h1>
            <p className="text-slate-400 text-sm">{t.loginDesc}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type="password" 
              placeholder={t.enterKey} 
              className="w-full pl-6 pr-6 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono tracking-widest text-center"
              value={authInput}
              onChange={(e) => setAuthInput(e.target.value)}
              autoFocus
            />
            {authError && <div className="text-red-400 text-xs font-bold">{t.accessDenied}</div>}
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
              <ShieldCheck size={18} /> {t.unlock}
            </button>
          </form>
          <div className="mt-8 pt-8 border-t border-slate-800 flex justify-center">
             <button onClick={toggleLanguage} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-400">
               {lang === 'en' ? 'Tiếng Việt' : 'English'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <ToastContainer toasts={toasts} />
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300" onClick={() => setMobileMenuOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-300 transition-all duration-500 ease-in-out flex flex-col print:hidden ${sidebarExpanded ? 'w-72' : 'w-20'} ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'} md:relative md:flex`}>
        <button onClick={() => setSidebarExpanded(!sidebarExpanded)} className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-indigo-600 rounded-full items-center justify-center text-white border-2 border-slate-900 hover:bg-indigo-50 transition-all z-10">
          {sidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className={`p-6 mb-4 flex items-center gap-3 overflow-hidden ${(!sidebarExpanded && !mobileMenuOpen) && 'justify-center'}`}>
          <div className="min-w-[40px] w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-700 shrink-0">
            <img 
              src="https://inabata.vn/wp-content/uploads/2021/05/logo-inabata.png" 
              alt="Logo" 
              className="w-full h-full object-contain p-1" 
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://inabata.vn/favicon.ico'; }}
            />
          </div>
          {(sidebarExpanded || mobileMenuOpen) && (
            <div className="truncate whitespace-nowrap animate-in fade-in slide-in-from-left-2">
              <h1 className="font-bold text-white text-base leading-tight">IKV Device Master</h1>
              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">{t.subName}</p>
            </div>
          )}
        </div>
        <nav className="flex-1 px-3 space-y-2">
          <SidebarLink active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} icon={<LayoutDashboard size={20} />} label={t.dashboard} expanded={sidebarExpanded || mobileMenuOpen} />
          <SidebarLink active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); setMobileMenuOpen(false); }} icon={<Database size={20} />} label={t.inventory} expanded={sidebarExpanded || mobileMenuOpen} />
          <SidebarLink active={false} onClick={() => { setHandoverMode('handover'); setIsHandoverOpen(true); setMobileMenuOpen(false); }} icon={<Printer size={20} />} label={t.handover} expanded={sidebarExpanded || mobileMenuOpen} />
          <SidebarLink active={false} onClick={() => { setHandoverMode('return'); setIsHandoverOpen(true); setMobileMenuOpen(false); }} icon={<RefreshCw size={20} />} label={t.return} expanded={sidebarExpanded || mobileMenuOpen} />
          <SidebarLink active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }} icon={<SettingsIcon size={20} />} label={t.settings} expanded={sidebarExpanded || mobileMenuOpen} />
        </nav>
         <div className={`mt-4 px-3 mb-4 ${(sidebarExpanded || mobileMenuOpen) ? 'block' : 'flex justify-center'}`}>
          <div className={`bg-slate-800/50 rounded-2xl border border-slate-700/50 transition-all duration-300 ${ (sidebarExpanded || mobileMenuOpen) ? 'p-4' : 'p-2'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Cloud size={(sidebarExpanded || mobileMenuOpen) ? 18 : 20} className={projectId ? "text-indigo-400" : "text-amber-400"} />
                  {projectId && <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-800 ${syncStatus === 'error' ? 'bg-red-500' : 'bg-green-500'}`} />}
                </div>
                {(sidebarExpanded || mobileMenuOpen) && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cloud Storage</span>}
              </div>
              {(sidebarExpanded || mobileMenuOpen) && isSyncing && <RefreshCw size={12} className="animate-spin text-indigo-400" />}
            </div>
            {(sidebarExpanded || mobileMenuOpen) && (
              <div className="mt-3 space-y-2 animate-in fade-in duration-500">
                <div className={`flex items-center gap-2 text-[10px] font-bold ${syncStatus === 'error' ? 'text-red-400' : 'text-green-400'}`}>{syncStatus === 'error' ? (lang === 'vi' ? "Lỗi DB" : "DB Error") : (projectId ? "Online" : t.notConfigured)}</div>
                {projectId && <button onClick={() => handleSync('pull')} disabled={isSyncing} className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"><RefreshCw size={10} className={isSyncing ? "animate-spin" : ""} />{t.syncNow}</button>}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 mt-auto border-t border-slate-800">
          <button onClick={handleLogout} className={`flex items-center gap-4 text-slate-400 hover:text-white transition-colors w-full px-4 py-3 rounded-2xl ${(sidebarExpanded || mobileMenuOpen) ? '' : 'justify-center'}`}><LogOut size={20} />{(sidebarExpanded || mobileMenuOpen) && <span className="font-medium text-sm animate-in fade-in">{t.signOut}</span>}</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden print:hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-slate-100 rounded-xl md:hidden text-slate-600 hover:bg-indigo-50 transition-all"><Menu size={20} /></button>
            <h2 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight capitalize truncate">{activeTab === 'settings' ? t.settings : activeTab === 'dashboard' ? t.dashboard : t.inventory}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={generateInsights} disabled={isAnalyzing} className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100 md:px-4 md:py-2.5 md:flex md:items-center md:gap-2">{isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}<span className="hidden md:inline font-bold text-sm">{t.aiInsights}</span></button>
            
            {/* Always visible on mobile header now */}
            <button onClick={toggleLanguage} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"><Languages size={18} /></button>
            
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-6 w-px bg-slate-200 mx-1"></div>
              <button onClick={() => storageService.exportToCSV(devices)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"><Download size={18} /></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"><Upload size={18} /></button>
              <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            </div>
            <button onClick={() => { setEditingDevice(null); setIsFormOpen(true); }} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 md:px-6 md:py-2.5 md:flex md:items-center md:gap-2"><Plus size={18} /><span className="hidden md:inline font-bold text-sm">{t.addDevice}</span></button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {activeTab === 'dashboard' && <Dashboard devices={devices} lang={lang} onExpiringClick={handleShowExpiring} />}
            {activeTab === 'inventory' && <DeviceTable devices={devices} branches={branches} onEdit={(d) => { setEditingDevice(d); setIsFormOpen(true); }} onDelete={(id) => setDeleteConfirmId(id)} onViewHistory={(d) => setHistoryDevice(d)} lang={lang} externalExpiringFilter={externalExpiringFilter} />}
            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-6 pb-12">
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{t.manageBranches}</h3>
                      <p className="text-xs text-slate-500">{t.branchName}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t.branchName}</label>
                        <input 
                          type="text" 
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                          placeholder={t.branchName} 
                          value={newBranchInput} 
                          onChange={e => setNewBranchInput(e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{lang === 'vi' ? 'Tên Công Ty' : 'Company Name'}</label>
                        <input 
                          type="text" 
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                          placeholder={lang === 'vi' ? 'Tên Công Ty' : 'Company Name'} 
                          value={newBranchCompany} 
                          onChange={e => setNewBranchCompany(e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{lang === 'vi' ? 'Địa Chỉ' : 'Address'}</label>
                        <textarea 
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all h-20 resize-none" 
                          placeholder={lang === 'vi' ? 'Địa Chỉ' : 'Address'} 
                          value={newBranchAddress} 
                          onChange={e => setNewBranchAddress(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddBranch} disabled={isSyncing} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                        {isSyncing ? <Loader2 className="animate-spin" size={18} /> : (editingBranchId ? <Check size={18} /> : <Plus size={18} />)} 
                        {editingBranchId ? (lang === 'vi' ? 'Cập Nhật' : 'Update') : t.addBranch}
                      </button>
                      {editingBranchId && (
                        <button onClick={() => { setEditingBranchId(null); setNewBranchInput(''); setNewBranchCompany(''); setNewBranchAddress(''); }} className="px-6 py-3 bg-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all">
                          {t.cancel}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {branches.map(branch => (
                      <div key={branch.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {lang === 'en' ? removeAccents(branch.name) : branch.name}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleEditBranch(branch)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                              <SettingsIcon size={16} />
                            </button>
                            <button onClick={() => handleDeleteBranch(branch.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 space-y-1">
                          <p><span className="font-bold uppercase tracking-wider opacity-60 mr-1">{lang === 'vi' ? 'Công ty:' : 'Company:'}</span> {branch.companyName}</p>
                          <p><span className="font-bold uppercase tracking-wider opacity-60 mr-1">{lang === 'vi' ? 'Địa chỉ:' : 'Address:'}</span> {branch.address}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{t.securitySettings}</h3>
                      <p className="text-xs text-slate-500">{t.changePass}</p>
                    </div>
                  </div>
                  <form onSubmit={handleUpdateMasterKey} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="md:col-span-2">
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t.currentPass}</label>
                         <input 
                           type="password" 
                           required 
                           className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500/20" 
                           value={passCurrent} 
                           onChange={e => setPassCurrent(e.target.value)} 
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t.newPass}</label>
                         <input 
                           type="password" 
                           required 
                           className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500/20" 
                           value={passNew} 
                           onChange={e => setPassNew(e.target.value)} 
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t.confirmPass}</label>
                         <input 
                           type="password" 
                           required 
                           className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500/20" 
                           value={passConfirm} 
                           onChange={e => setPassConfirm(e.target.value)} 
                         />
                       </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isUpdatingPass} 
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isUpdatingPass ? <Loader2 className="animate-spin" size={18} /> : <Key size={18} />}
                      {t.updatePass}
                    </button>
                  </form>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <Cloud size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{lang === 'vi' ? 'Đồng bộ Google Firebase Cloud' : 'Google Firebase Cloud Sync'}</h3>
                      <p className="text-xs text-slate-500">{lang === 'vi' ? 'Quản lý cấu hình lưu trữ đám mây bảo mật của bạn' : 'Manage your secure cloud-hosted storage settings'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.projectId}</label>
                      <input 
                        type="text" 
                        value={projectId}
                        onChange={e => setProjectId(e.target.value)}
                        placeholder="my-project-id"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button 
                      onClick={handleSaveConfig}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                      <Check size={18} />
                      {t.saveConfig}
                    </button>
                    
                    <button 
                      onClick={() => handleSync('pull')}
                      disabled={isSyncing}
                      className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Download size={18} className={isSyncing ? "animate-spin" : ""} />
                      {t.pullFromCloud}
                    </button>

                    <button 
                      onClick={() => handleSync('push')}
                      disabled={isSyncing}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Upload size={18} className={isSyncing ? "animate-spin" : ""} />
                      {t.pushToCloud}
                    </button>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                      <AlertTriangle size={16} />
                      {lang === 'vi' ? 'Bảo mật siêu cấp Zero-Knowledge' : 'Zero-Knowledge Security'}
                    </div>
                    <p className="text-xs text-amber-600 leading-relaxed">
                      {lang === 'vi' 
                        ? 'Dữ liệu được đồng bộ trực tiếp lên hệ thống đám mây Firebase Firestore của Google. Mọi thiết bị và chi nhánh đều được mã hóa đầu cuối (AES-GCM 256-bit) bằng Mã Khóa (Master Key) của bạn trước khi đưa lên mây. Firebase hoàn toàn KHÔNG THỂ đọc được dữ liệu của bạn.'
                        : 'Data is synced directly to Google Firebase Firestore. Standard collections remain secure since they are completely end-to-end encrypted (AES-GCM 256-bit) using your custom Master Key. Google/Firebase has zero access to your plaintext assets.'
                      }
                    </p>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </main>
      
      {isFormOpen && <DeviceForm device={editingDevice} branches={branches} onSave={saveDevice} onClose={() => setIsFormOpen(false)} lang={lang} />}
      {historyDevice && <HistoryModal device={historyDevice} onClose={() => setHistoryDevice(null)} lang={lang} />}
      <HandoverModal 
        isOpen={isHandoverOpen} 
        onClose={() => setIsHandoverOpen(false)} 
        devices={devices} 
        branches={branches} 
        lang={lang} 
        mode={handoverMode}
      />
      
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[150] p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto"><Trash2 size={40} /></div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">{lang === 'vi' ? 'Xác nhận xóa?' : 'Confirm Delete?'}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{lang === 'vi' ? 'Hành động này không thể hoàn tác.' : 'This action cannot be undone.'}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">{t.cancel}</button>
              <button onClick={async () => { 
                const updated = devices.filter(d => d.id !== deleteConfirmId); 
                setDevices(updated); 
                await storageService.saveDataSecure(updated, branches, masterKey); 
                handleSync('push', updated, branches); 
                setDeleteConfirmId(null); 
                addToast(lang === 'vi' ? "Đã xóa thiết bị" : "Device deleted", "info"); 
              }} className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20">{lang === 'vi' ? 'Có, Xóa' : 'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ToastContainer = ({ toasts }: { toasts: Toast[] }) => (
  <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 items-center pointer-events-none w-full max-w-sm">
    {toasts.map(toast => (
      <div key={toast.id} className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto ${toast.type === 'success' ? 'bg-green-50/90 border-green-200 text-green-800' : ''} ${toast.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' : ''} ${toast.type === 'warning' ? 'bg-amber-50/90 border-amber-200 text-amber-800' : ''} ${toast.type === 'info' ? 'bg-indigo-50/90 border-indigo-200 text-indigo-800' : ''}`}>
        {toast.type === 'success' && <CheckCircle2 size={18} className="text-green-600 shrink-0" />}
        {toast.type === 'error' && <AlertCircle size={18} className="text-red-600 shrink-0" />}
        {toast.type === 'warning' && <AlertTriangle size={18} className="text-amber-600 shrink-0" />}
        {toast.type === 'info' && <Info size={18} className="text-indigo-600 shrink-0" />}
        <span className="text-sm font-bold tracking-tight">{toast.message}</span>
      </div>
    ))}
  </div>
);

const SidebarLink = ({ active, onClick, icon, label, expanded }: any) => (
  <button onClick={onClick} className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${active ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'} ${!expanded && 'justify-center'}`}>
    <div className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors shrink-0`}>{icon}</div>
    {expanded && <span className="text-sm tracking-wide truncate animate-in fade-in slide-in-from-left-2">{label}</span>}
  </button>
);

export default App;
