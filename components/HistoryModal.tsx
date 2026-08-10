
import React from 'react';
import { Device } from '../types';
import { translations } from '../translations';
import { X, History, User, Calendar } from 'lucide-react';

interface Props {
  device: Device;
  onClose: () => void;
  lang: 'en' | 'vi';
}

const HistoryModal: React.FC<Props> = ({ device, onClose, lang }) => {
  const t = translations[lang];
  
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100">
        <div className="flex items-center justify-between p-6 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t.handoverHistory}</h2>
              <p className="text-xs text-slate-400 font-medium">{device.manufacturer} {device.model}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto">
          {device.history && device.history.length > 0 ? (
            <div className="relative border-l-2 border-slate-100 ml-3 pl-8 space-y-8 py-2">
              {device.history.slice().reverse().map((entry) => (
                <div key={entry.id} className="relative">
                  <div className="absolute -left-[41px] top-1 w-5 h-5 bg-white border-2 border-indigo-600 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <User size={14} className="text-slate-400" />
                      {entry.assignee || t.unassigned}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {entry.date}
                    </span>
                    {entry.notes && (
                      <div className="text-xs text-slate-500 mt-1 bg-slate-50 p-3 rounded-xl italic border border-slate-100">
                        "{entry.notes}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 text-sm font-medium">No history records found.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-50 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
