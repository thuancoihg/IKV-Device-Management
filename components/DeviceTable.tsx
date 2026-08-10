
import React, { useState, useEffect } from 'react';
import { Device, DeviceType, Branch } from '../types';
import { translations } from '../translations';
import { Search, Edit2, Trash2, Filter, History, AlertTriangle, MapPin } from 'lucide-react';
import { LIFESPAN_MAP } from './Dashboard';
import { removeAccents } from '../App';

interface Props {
  devices: Device[];
  branches: Branch[];
  onEdit: (device: Device) => void;
  onDelete: (id: string) => void;
  onViewHistory: (device: Device) => void;
  lang: 'en' | 'vi';
  externalExpiringFilter?: boolean;
}

const DeviceTable: React.FC<Props> = ({ devices, branches, onEdit, onDelete, onViewHistory, lang, externalExpiringFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [showOnlyExpiring, setShowOnlyExpiring] = useState(false);
  
  const t = translations[lang];

  useEffect(() => {
    if (externalExpiringFilter) {
      setShowOnlyExpiring(true);
      setTypeFilter('All');
      setStatusFilter('All');
      setBranchFilter('All');
    }
  }, [externalExpiringFilter]);

  const filteredDevices = devices.filter(d => {
    const matchesSearch = 
      d.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'All' || d.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchesBranch = branchFilter === 'All' || d.branch === branchFilter;
    
    let matchesExpiring = true;
    if (showOnlyExpiring) {
      // If the device is Retired, it should NOT show up in the expiring filter
      if (d.status === 'Retired') {
        matchesExpiring = false;
      } else if (d.purchaseDate) {
        const today = new Date();
        const alertThreshold = new Date();
        alertThreshold.setDate(today.getDate() + 60);
        
        const purchaseDate = new Date(d.purchaseDate);
        const lifespanYears = LIFESPAN_MAP[d.type] || 5;
        const lifecycleExpiry = new Date(purchaseDate);
        lifecycleExpiry.setFullYear(purchaseDate.getFullYear() + lifespanYears);
        matchesExpiring = lifecycleExpiry < alertThreshold;
      } else {
        matchesExpiring = false;
      }
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesBranch && matchesExpiring;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-700';
      case 'Assigned': return 'bg-blue-100 text-blue-700';
      case 'Maintenance': return 'bg-amber-100 text-amber-700';
      case 'Retired': return 'bg-slate-200 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  /**
   * Helper to translate device status based on current language
   */
  const translateStatus = (status: string) => {
    switch (status) {
      case 'Available': return t.available;
      case 'Assigned': return t.assigned;
      case 'Maintenance': return t.maintenance;
      case 'Retired': return t.retired;
      default: return status;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {/* Filters Section */}
      <div className="p-6 border-b border-slate-100 space-y-4 bg-white z-30 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder={t.searchPlaceholder}
              className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-slate-400" />
              <select 
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer"
                value={branchFilter}
                onChange={e => { setBranchFilter(e.target.value); if(e.target.value !== 'All') setShowOnlyExpiring(false); }}
              >
                <option value="All">{t.allBranches}</option>
                {branches.map(b => (
                  <option key={b.id} value={b.name}>
                    {lang === 'en' ? removeAccents(b.name) : b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select 
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer"
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value); if(e.target.value !== 'All') setShowOnlyExpiring(false); }}
              >
                <option value="All">{t.allTypes}</option>
                {Object.values(DeviceType).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select 
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer"
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); if(e.target.value !== 'All') setShowOnlyExpiring(false); }}
              >
                <option value="All">{t.allStatus}</option>
                <option value="Available">{t.available}</option>
                <option value="Assigned">{t.assigned}</option>
                <option value="Maintenance">{t.maintenance}</option>
                <option value="Retired">{t.retired}</option>
              </select>
            </div>

            <button 
              onClick={() => setShowOnlyExpiring(!showOnlyExpiring)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${showOnlyExpiring ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
            >
              <AlertTriangle size={14} />
              {t.expiringSoon}
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-auto max-h-[calc(100vh-215px)] relative border-b border-slate-100">
        <table className="w-full text-left border-collapse min-w-[1640px] table-fixed">
          <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
            <tr>
              <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 w-32">{t.branch}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 w-32">{t.deviceType}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 w-28">{t.manufacturer}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 w-48">{t.model}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 w-60">{t.assignee}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 w-44">{t.serial}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 w-36">{t.dates}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 w-36">{t.status}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 w-60">{t.notes}</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right bg-slate-50 w-40">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredDevices.map(device => (
              <tr key={device.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-5">
                   <div className="flex items-center gap-2">
                     <MapPin size={12} className="text-indigo-600 shrink-0" />
                     <span className="text-sm font-bold text-slate-700 truncate">
                       {lang === 'en' ? removeAccents(device.branch) : device.branch}
                     </span>
                   </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap">
                    {device.type}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <span className="text-sm font-semibold text-slate-700 truncate">{device.manufacturer}</span>
                </td>
                <td className="px-6 py-5">
                  <span className="text-sm text-slate-600 truncate">{device.model}</span>
                </td>
                <td className="px-6 py-5">
                  <span className="text-sm font-semibold text-slate-800 leading-snug block whitespace-normal">
                    {device.assignedTo || t.unassigned}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <code className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-1.5 rounded-lg border border-slate-200/50 block truncate">{device.serialNumber}</code>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col text-[11px] font-medium text-slate-600">
                    <span className="whitespace-nowrap">{lang === 'vi' ? 'M:' : 'P:'} {device.purchaseDate}</span>
                    <span className="whitespace-nowrap text-indigo-600">{lang === 'vi' ? 'BH:' : 'W:'} {device.warrantyExpiry}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap inline-block ${getStatusColor(device.status)}`}>
                    {translateStatus(device.status)}
                  </span>
                </td>
                <td className="px-6 py-5 w-60">
                  <div 
                    className="text-sm text-slate-500 font-medium truncate cursor-help"
                    title={device.notes || ''}
                  >
                    {device.notes || '—'}
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button 
                      onClick={() => onViewHistory(device)} 
                      className="p-2.5 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-100 shrink-0" 
                      title={t.handoverHistory}
                    >
                      <History size={15}/>
                    </button>
                    <button 
                      onClick={() => onEdit(device)} 
                      className="p-2.5 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all border border-slate-100 shrink-0" 
                      title={t.editDevice}
                    >
                      <Edit2 size={15}/>
                    </button>
                    <button 
                      onClick={() => onDelete(device.id)} 
                      className="p-2.5 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-slate-100 shrink-0" 
                      title="Delete"
                    >
                      <Trash2 size={15}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDevices.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <div className="text-sm font-medium">Không tìm thấy thiết bị nào phù hợp.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceTable;
