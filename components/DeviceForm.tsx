
import React, { useState, useEffect } from 'react';
import { Device, DeviceType, Branch } from '../types';
import { translations } from '../translations';
import { X, Plus } from 'lucide-react';
import { removeAccents } from '../App';

interface Props {
  device?: Device | null;
  branches: Branch[];
  onSave: (device: Device) => void;
  onClose: () => void;
  lang: 'en' | 'vi';
}

const DeviceForm: React.FC<Props> = ({ device, branches, onSave, onClose, lang }) => {
  const t = translations[lang];
  
  const formatDateForInput = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error("Lỗi định dạng ngày:", dateStr);
    }
    return '';
  };

  const [formData, setFormData] = useState<Partial<Device>>({
    type: DeviceType.LAPTOP,
    manufacturer: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyExpiry: '',
    handoverDate: '',
    assignedTo: '',
    status: 'Available',
    branch: branches[0]?.name || '',
    notes: ''
  });

  useEffect(() => {
    if (device) {
      setFormData({
        ...device,
        purchaseDate: formatDateForInput(device.purchaseDate),
        warrantyExpiry: formatDateForInput(device.warrantyExpiry),
        handoverDate: formatDateForInput(device.handoverDate),
        branch: device.branch || branches[0]?.name || ''
      });
    } else {
      setFormData({
        type: DeviceType.LAPTOP,
        manufacturer: '',
        model: '',
        serialNumber: '',
        purchaseDate: '',
        warrantyExpiry: '',
        handoverDate: '',
        assignedTo: '',
        status: 'Available',
        branch: branches[0]?.name || '',
        notes: ''
      });
    }
  }, [device, branches]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: device?.id || Math.random().toString(36).substr(2, 9),
      history: formData.history || []
    } as Device);
  };

  const inputBaseClass = "w-full px-4 py-3 bg-slate-800 text-white rounded-xl border border-slate-700 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all font-semibold placeholder:text-slate-500 shadow-inner";
  const labelClass = "text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1";

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex justify-center items-start z-[110] p-4 overflow-y-auto min-h-screen pt-10 pb-20">
      <div className="bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-800 relative">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800/50 bg-slate-900 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              {device ? <Plus size={24} className="rotate-45" /> : <Plus size={24} />}
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {device ? t.editDevice : t.newRegistration}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label className={labelClass}>{t.deviceType}</label>
              <select className={inputBaseClass} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as DeviceType })}>
                {Object.values(DeviceType).map(type => <option key={type} value={type} className="bg-slate-800">{type}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>{t.branch}</label>
              <select className={inputBaseClass} value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })}>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.name} className="bg-slate-800">
                    {lang === 'en' ? removeAccents(branch.name) : branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>{t.manufacturer}</label>
              <input required className={inputBaseClass} value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
            </div>

            <div>
              <label className={labelClass}>{t.model}</label>
              <input required className={inputBaseClass} value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
            </div>

            <div>
              <label className={labelClass}>{t.serial}</label>
              <input required className={inputBaseClass} value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} />
            </div>

            <div>
              <label className={labelClass}>{t.purchaseDate}</label>
              <input type="date" required className={inputBaseClass} value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} />
            </div>

            <div>
              <label className={labelClass}>{t.expiry}</label>
              <input type="date" required className={inputBaseClass} value={formData.warrantyExpiry} onChange={e => setFormData({ ...formData, warrantyExpiry: e.target.value })} />
            </div>

            <div>
              <label className={labelClass}>{t.status}</label>
              <select className={inputBaseClass} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                <option value="Available" className="bg-slate-800">{t.available}</option>
                <option value="Assigned" className="bg-slate-800">{t.assigned}</option>
                <option value="Maintenance" className="bg-slate-800">{t.maintenance}</option>
                <option value="Retired" className="bg-slate-800">{t.retired}</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>{t.assignee}</label>
              <input className={inputBaseClass} value={formData.assignedTo} onChange={e => setFormData({ ...formData, assignedTo: e.target.value })} />
            </div>

            <div>
              <label className={labelClass}>{t.handoverDate}</label>
              <input type="date" className={inputBaseClass} value={formData.handoverDate} onChange={e => setFormData({ ...formData, handoverDate: e.target.value })} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>{t.notes}</label>
              <textarea className={`${inputBaseClass} h-24 resize-none`} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-800/50 mt-4">
            <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-all">{t.cancel}</button>
            <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95">
              {device ? t.updateRecords : t.saveAsset}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceForm;
