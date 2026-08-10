
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Device, DeviceType } from '../types';
import { translations } from '../translations';
import { Monitor, Smartphone, ShieldAlert, CheckCircle, MapPin } from 'lucide-react';
import { removeAccents } from '../App';

interface Props {
  devices: Device[];
  lang: 'en' | 'vi';
  onExpiringClick: () => void;
}

const COLORS = ['#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#64748b'];

const TYPE_COLORS: Record<string, string> = {
  [DeviceType.LAPTOP]: '#4f46e5',      // Indigo
  [DeviceType.MOBILE]: '#ec4899',      // Pink/Rose (distinct from Indigo)
  [DeviceType.DESKTOP]: '#10b981',     // Emerald Green (distinct, no longer black)
  [DeviceType.TABLET]: '#f59e0b',      // Amber
  [DeviceType.OTHER]: '#64748b',       // Slate Grey
};

export const LIFESPAN_MAP: Record<string, number> = {
  [DeviceType.LAPTOP]: 4,
  [DeviceType.DESKTOP]: 5,
  [DeviceType.MOBILE]: 3,
  [DeviceType.TABLET]: 3,
  [DeviceType.OTHER]: 5,
};

const Dashboard: React.FC<Props> = ({ devices, lang, onExpiringClick }) => {
  const t = translations[lang];
  
  const stats = useMemo(() => {
    const today = new Date();
    const alertThreshold = new Date();
    alertThreshold.setDate(today.getDate() + 60);

    const typeCounts: Record<string, number> = {};
    const branchCounts: Record<string, number> = {};
    let assigned = 0;
    let expiringSoon = 0;

    devices.forEach(d => {
      typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
      let branchName = d.branch || (lang === 'vi' ? 'Chưa rõ' : 'Unknown');
      
      // Normalize branch name if English
      if (lang === 'en') branchName = removeAccents(branchName);
      
      branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
      
      if (d.status === 'Assigned') assigned++;
      
      // ONLY check expiration if the device is NOT Retired
      if (d.status !== 'Retired' && d.purchaseDate) {
        const purchaseDate = new Date(d.purchaseDate);
        const lifespanYears = LIFESPAN_MAP[d.type] || 5;
        const lifecycleExpiry = new Date(purchaseDate);
        lifecycleExpiry.setFullYear(purchaseDate.getFullYear() + lifespanYears);

        if (lifecycleExpiry < alertThreshold) {
          expiringSoon++;
        }
      }
    });

    const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
    const branchData = Object.entries(branchCounts).map(([name, value]) => ({ name, value }));
    
    return { 
      total: devices.length, 
      assigned, 
      expiringSoon, 
      typeData, 
      branchData,
      totalBranches: Object.keys(branchCounts).length
    };
  }, [devices, lang]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Monitor size={24} className="text-indigo-600" />} 
          title={t.totalAssets} 
          value={stats.total} 
          color="bg-white" 
        />
        <StatCard 
          icon={<CheckCircle size={24} className="text-green-600" />} 
          title={t.assigned} 
          value={stats.assigned} 
          color="bg-white" 
        />
        <StatCard 
          icon={<ShieldAlert size={24} className="text-amber-600" />} 
          title={t.expiringSoon} 
          value={stats.expiringSoon} 
          subtitle={t.expiringSubtitle} 
          color="bg-white cursor-pointer border-amber-200 hover:bg-amber-50 active:scale-95 transition-all"
          onClick={onExpiringClick}
        />
        <StatCard 
          icon={<MapPin size={24} className="text-slate-600" />} 
          title={t.branches} 
          value={stats.totalBranches} 
          color="bg-white" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 h-[400px] shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">{t.assetDist}</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={stats.typeData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value">
                {stats.typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 h-[400px] shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">{t.countByBranch}</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={stats.branchData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color, subtitle, onClick }: any) => (
  <div onClick={onClick} className={`${color} p-8 rounded-3xl border border-slate-200 shadow-sm group transition-all`}>
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white transition-colors">{icon}</div>
      <span className="text-3xl font-bold text-slate-900">{value}</span>
    </div>
    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</div>
    {subtitle && <div className="text-[10px] text-slate-400 mt-1 uppercase font-medium">{subtitle}</div>}
  </div>
);

export default Dashboard;
