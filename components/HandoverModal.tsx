
import React, { useState, useMemo } from 'react';
import { Device, Branch } from '../types';
import { translations } from '../translations';
import { X, Printer, Search, Check, Square, CheckSquare, ExternalLink, Building2, MapPin, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  branches: Branch[];
  lang: 'en' | 'vi';
  mode?: 'handover' | 'return';
}

const HandoverModal: React.FC<Props> = ({ isOpen, onClose, devices, branches, lang, mode = 'handover' }) => {
  const t = translations[lang];
  const isReturn = mode === 'return';
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [partyBCompany, setPartyBCompany] = useState(t.companyName);
  const [partyBAddress, setPartyBAddress] = useState(t.companyAddress);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [deviceConditions, setDeviceConditions] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Reset states when modal opens or mode changes
  React.useEffect(() => {
    if (isOpen) {
      setRecipientName('');
      setRecipientAddress('');
      setRecipientId('');
      setPartyBCompany(t.companyName);
      setPartyBAddress(t.companyAddress);
      setSearchTerm('');
      setSelectedDeviceIds(new Set());
      setDeviceConditions({});
      setShowPreview(false);
    }
  }, [isOpen, mode, t.companyName, t.companyAddress]);

  const filteredDevices = useMemo(() => {
    return devices.filter(d => 
      d.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [devices, searchTerm]);

  const toggleDevice = (id: string) => {
    const newSelected = new Set(selectedDeviceIds);
    const device = devices.find(d => d.id === id);

    if (newSelected.has(id)) {
      newSelected.delete(id);
      // Nếu bỏ chọn thiết bị đang cung cấp tên người nhận, cập nhật lại tên
      if (device && recipientName === device.assignedTo) {
        const remainingIds = Array.from(newSelected);
        if (remainingIds.length > 0) {
          const firstRemaining = devices.find(d => d.id === remainingIds[0]);
          if (firstRemaining && firstRemaining.assignedTo && firstRemaining.assignedTo !== t.unassigned) {
            // Chỉ xóa nếu tên người nhận thay đổi sang người khác
            if (recipientName !== firstRemaining.assignedTo) {
              setRecipientName(firstRemaining.assignedTo);
              setRecipientAddress('');
              setRecipientId('');
            }
          } else {
            setRecipientName('');
            setRecipientAddress('');
            setRecipientId('');
          }
        } else {
          setRecipientName('');
          setRecipientAddress('');
          setRecipientId('');
        }
      }
    } else {
      newSelected.add(id);
      // Tự động điền tên người nhận từ thiết bị được chọn
      if (device && device.assignedTo && device.assignedTo !== t.unassigned && !recipientName) {
        setRecipientName(device.assignedTo);
      }
      
      // Tự động điền thông tin Bên B từ chi nhánh của thiết bị
      if (device && device.branch) {
        const branchObj = branches.find(b => b.name === device.branch);
        if (branchObj) {
          setPartyBCompany(branchObj.companyName);
          setPartyBAddress(branchObj.address);
          // Tự động điền địa chỉ người nhận nếu còn trống
          if (!recipientAddress) {
            setRecipientAddress(branchObj.address);
          }
        }
      }

      if (!deviceConditions[id]) {
        setDeviceConditions(prev => ({ ...prev, [id]: lang === 'vi' ? 'Tốt' : 'Good' }));
      }
    }
    setSelectedDeviceIds(newSelected);
  };

  const updateCondition = (id: string, condition: string) => {
    setDeviceConditions(prev => ({ ...prev, [id]: condition }));
  };

  const selectedDevices = devices.filter(d => selectedDeviceIds.has(d.id));

  const selectedBranchName = useMemo(() => {
    if (selectedDevices.length > 0) {
      return selectedDevices[0].branch || '';
    }
    return '';
  }, [selectedDevices]);

  const representativeName = useMemo(() => {
    if (!selectedBranchName) {
      return 'Tran Duc Thuan / Doan Thi Xuan Ai';
    }
    const nameLower = selectedBranchName.toLowerCase();
    if (
      nameLower.includes('ha noi') || 
      nameLower.includes('hà nội') || 
      nameLower.includes('hanoi') || 
      nameLower.includes('hn')
    ) {
      return 'Tran Duc Thuan';
    }
    if (
      nameLower.includes('ho chi minh') || 
      nameLower.includes('hồ chí minh') || 
      nameLower.includes('hcm') || 
      nameLower.includes('hcmc') || 
      nameLower.includes('sai gon') || 
      nameLower.includes('sài gòn')
    ) {
      return 'Doan Thi Xuan Ai';
    }
    return 'Tran Duc Thuan / Doan Thi Xuan Ai';
  }, [selectedBranchName]);

  const handlePrint = () => {
    // Thêm delay nhỏ để đảm bảo DOM đã render xong nội dung in
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden border border-slate-200 print:hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${isReturn ? 'bg-emerald-600 shadow-emerald-200' : 'bg-indigo-600 shadow-indigo-200'}`}>
              {isReturn ? <RefreshCw size={20} /> : <Printer size={20} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {showPreview ? (lang === 'vi' ? 'Xem trước biên bản' : 'Preview Record') : (isReturn ? t.returnRecord : t.handoverRecord)}
              </h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{isReturn ? (lang === 'vi' ? 'Hoàn trả thiết bị' : 'Device Return') : t.newRegistration}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {!showPreview ? (
            <div className="space-y-8">
              {/* Device Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    {t.selectDevices}
                    <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px]">{selectedDeviceIds.size}</span>
                  </h3>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text"
                      placeholder={t.searchPlaceholder}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 transition-all"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-96 overflow-y-auto bg-slate-50/30">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr>
                        <th className="p-4 w-12"></th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.assignee}</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.model}</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.purchaseDate}</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.status}</th>
                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.condition}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDevices.map(d => (
                        <tr 
                          key={d.id} 
                          className={`hover:bg-indigo-50/30 cursor-pointer transition-colors ${selectedDeviceIds.has(d.id) ? 'bg-indigo-50/50' : ''}`}
                          onClick={() => toggleDevice(d.id)}
                        >
                          <td className="p-4 text-center">
                            {selectedDeviceIds.has(d.id) ? (
                              <CheckSquare size={18} className="text-indigo-600" />
                            ) : (
                              <Square size={18} className="text-slate-300" />
                            )}
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-700">{d.assignedTo}</td>
                          <td className="p-4">
                            <div className="text-sm font-semibold text-slate-700">{d.model}</div>
                            <div className="text-[10px] font-mono text-slate-400">{d.serialNumber}</div>
                          </td>
                          <td className="p-4 text-sm text-slate-600">{d.purchaseDate}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              d.status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                              d.status === 'Assigned' ? 'bg-indigo-100 text-indigo-700' :
                              d.status === 'Maintenance' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {t[d.status.toLowerCase() as keyof typeof t] || d.status}
                            </span>
                          </td>
                          <td className="p-4" onClick={e => e.stopPropagation()}>
                            {selectedDeviceIds.has(d.id) ? (
                              <input 
                                type="text"
                                value={deviceConditions[d.id] || ''}
                                onChange={e => updateCondition(d.id, e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                placeholder={t.condition}
                              />
                            ) : (
                              <span className="text-xs text-slate-300 italic">---</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Preview Template inside Modal */
            <div className="bg-white p-8 md:p-12 shadow-inner border border-slate-100 rounded-xl max-w-[210mm] mx-auto font-sans text-black leading-relaxed">
              {/* Logo Section */}
              <div className="flex justify-between items-start mb-6">
                <img 
                  src="https://inabata.vn/wp-content/uploads/2021/05/logo-inabata.png" 
                  alt="Logo" 
                  className="h-28 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://inabata.vn/favicon.ico';
                  }}
                />
                <div className="text-right">
                  <h1 className="text-lg font-bold uppercase tracking-tight">
                    {isReturn ? t.returnAgreementTitle : t.handoverAgreementTitle}
                  </h1>
                </div>
              </div>

              {/* Parties Info */}
              <div className="space-y-10 mb-6 text-sm">
                <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-1.5">
                  <div className="font-bold">{t.partyA}:</div>
                  <div className="font-bold uppercase">{isReturn ? partyBCompany : recipientName}</div>
                  <div className="font-bold">{t.recipientAddress}:</div>
                  <div>{(isReturn ? partyBAddress : recipientAddress) || '................................................................................'}</div>
                  {!isReturn ? (
                    <>
                      <div className="font-bold">{t.recipientId}:</div>
                      <div>{recipientId || '................................................................................'}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold">{t.represent}:</div>
                      <div className="font-semibold text-slate-800">{representativeName}</div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-1.5">
                  <div className="font-bold">{t.partyB}:</div>
                  <div className="font-bold uppercase">{isReturn ? recipientName : partyBCompany}</div>
                  <div className="font-bold">{t.recipientAddress}:</div>
                  <div>{(isReturn ? recipientAddress : partyBAddress) || '................................................................................'}</div>
                  {isReturn ? (
                    <>
                      <div className="font-bold">{t.recipientId}:</div>
                      <div>{recipientId || '................................................................................'}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold">{t.represent}:</div>
                      <div className="font-semibold text-slate-800">{representativeName}</div>
                    </>
                  )}
                </div>
              </div>

              <p className="text-sm mb-4 italic">
                {t.today}, ................................................................, {isReturn ? (lang === 'vi' ? 'hai bên đã thống nhất ký biên bản trả thiết bị này với các thiết bị dưới đây:' : 'the two parties have mutually agreed to sign on this return record with below equipments.') : (lang === 'vi' ? 'hai bên đã thống nhất ký biên bản bàn giao này với các thiết bị dưới đây:' : 'the two parties have mutually agreed to sign on this hand-over with below equipments.')}
              </p>

              {/* Table */}
              <table className="w-full border-collapse border border-black text-sm mb-6">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-black p-2 w-12 text-center">{t.no}</th>
                    <th className="border border-black p-2 text-left">{t.document}</th>
                    <th className="border border-black p-2 w-20 text-center">{t.quantity}</th>
                    <th className="border border-black p-2 w-32 text-center">{t.condition}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDevices.map((d, index) => (
                    <tr key={d.id}>
                      <td className="border border-black p-2 text-center">{index + 1}</td>
                      <td className="border border-black p-2">
                        <div className="font-bold">{d.type} {d.manufacturer} {d.model}</div>
                        <div className="text-xs text-slate-600">S/N: {d.serialNumber}</div>
                      </td>
                      <td className="border border-black p-2 text-center">1</td>
                      <td className="border border-black p-2 text-center">
                        {deviceConditions[d.id] === 'Tốt' && lang === 'en' ? 'Good' : (deviceConditions[d.id] || 'Good')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Terms */}
              <div className="space-y-2 text-sm mb-8">
                <div className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <p>{lang === 'vi' ? 'Bên B đã bàn giao cho bên A tại văn phòng công ty.' : 'Party B has already transferred to party A at the company office.'}</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <p>{t.handoverResponsibility}</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <p>{t.handoverPolicy}</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold">4.</span>
                  <p>{isReturn ? t.returnAgreement : t.handoverAgreement}</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-16 text-center">
                {/* Headers */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="font-bold uppercase">{t.partyA}</div>
                    {isReturn ? (
                      <div className="text-sm text-slate-500">{t.represent}</div>
                    ) : (
                      <div className="text-sm invisible select-none">&nbsp;</div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold uppercase">{t.partyB}</div>
                    {!isReturn ? (
                      <div className="text-sm text-slate-500">{t.represent}</div>
                    ) : (
                      <div className="text-sm invisible select-none">&nbsp;</div>
                    )}
                  </div>
                </div>

                {/* Vertical spacer - extra space */}
                <div className="h-32 md:h-36"></div>

                {/* Names perfectly horizontally aligned */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    {isReturn ? (
                      <div className="font-bold uppercase">{representativeName}</div>
                    ) : (
                      <div className="font-bold uppercase">{recipientName}</div>
                    )}
                  </div>
                  <div>
                    {isReturn ? (
                      <div className="font-bold uppercase">{recipientName}</div>
                    ) : (
                      <div className="font-bold uppercase">{representativeName}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          {showPreview ? (
            <>
              <button 
                onClick={() => setShowPreview(false)}
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                {lang === 'vi' ? 'Quay lại' : 'Back'}
              </button>
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                title={lang === 'vi' ? 'Mở tab mới để in ổn định hơn' : 'Open in new tab for reliable printing'}
              >
                <ExternalLink size={18} />
                {lang === 'vi' ? 'Mở tab mới' : 'Open in new tab'}
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                <Printer size={18} />
                {t.printHandover}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={onClose}
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={() => setShowPreview(true)}
                disabled={selectedDeviceIds.size === 0 || !recipientName}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                <Search size={18} />
                {lang === 'vi' ? 'Xem trước biên bản' : 'Preview Record'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Printable Template (Hidden in UI, visible in Print) */}
      <div className="hidden print:block fixed inset-0 bg-white p-0 m-0 text-black font-sans leading-relaxed z-[200]">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
          @media print {
            @page { 
              size: A4; 
              margin: 12mm 15mm 12mm 15mm; 
            }
            body * { visibility: hidden; }
            .print-content, .print-content * { 
              visibility: visible; 
              box-sizing: border-box;
            }
            .print-content { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%;
              font-size: 10pt !important;
              line-height: 1.4 !important;
              font-family: 'Inter', sans-serif !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print { display: none !important; }

            /* Direct font sizing for standard A4 */
            .print-content h1 {
              font-size: 14pt !important;
              font-weight: 700 !important;
              margin-bottom: 1mm !important;
              text-transform: uppercase !important;
            }
            .print-content img {
              height: 24mm !important;
              width: auto !important;
              margin-bottom: 2mm !important;
            }
            .print-content .text-base,
            .print-content p,
            .print-content div,
            .print-content td,
            .print-content span {
              font-size: 10pt !important;
              line-height: 1.4 !important;
            }
            .print-content .text-sm {
              font-size: 9pt !important;
            }
            .print-content .text-xs {
              font-size: 8pt !important;
            }
            
            /* Margin & compact space resets */
            .print-content .p-8 {
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-content .mb-8 {
              margin-bottom: 12px !important;
            }
            .print-content .mb-6 {
              margin-bottom: 8px !important;
            }
            .print-content .mb-12 {
              margin-bottom: 12px !important;
            }
            .print-content .mt-12 {
              margin-top: 10px !important;
            }
            .print-content .mt-16 {
              margin-top: 12px !important;
            }
            
            /* Layout details */
            .print-content .grid {
              display: grid !important;
              row-gap: 4px !important;
              column-gap: 16px !important;
            }
            .print-content .pt-6 {
              padding-top: 0 !important;
            }
            .print-content .space-y-4 > :not([hidden]) ~ :not([hidden]) {
              margin-top: 4px !important;
            }
            .print-content .space-y-10 > :not([hidden]) ~ :not([hidden]) {
              margin-top: 24px !important;
            }
            .print-content .space-y-24 > :not([hidden]) ~ :not([hidden]) {
              margin-top: 60pt !important; /* Larger signature gap limit */
            }
            .print-content .print-signatures {
              margin-top: 45pt !important;
            }
            .print-content .print-spacer {
              height: 80pt !important; /* Extremely generous gap for signature field */
            }
            
            /* Table overrides */
            .print-content table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-bottom: 12px !important;
              font-size: 9.5pt !important;
            }
            .print-content th, .print-content td {
              border: 1px solid #000000 !important;
              padding: 4px 6px !important;
            }
            .print-content th {
              background-color: #f1f5f9 !important;
              font-weight: bold !important;
            }
          }
        `}</style>
        
        <div className="print-content p-8">
          {/* Logo Section */}
          <div className="flex justify-between items-start mb-6">
            <img 
              src="https://inabata.vn/wp-content/uploads/2021/05/logo-inabata.png" 
              alt="Logo" 
              className="h-28 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://inabata.vn/favicon.ico';
              }}
            />
            <div className="text-right">
              <h1 className="text-lg font-bold uppercase tracking-tight">
                {isReturn ? t.returnAgreementTitle : t.handoverAgreementTitle}
              </h1>
            </div>
          </div>

          {/* Parties Info */}
          <div className="space-y-10 mb-6 text-sm">
            <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-1.5">
              <div className="font-bold">{t.partyA}:</div>
              <div className="font-bold uppercase">{isReturn ? partyBCompany : recipientName}</div>
              <div className="font-bold">{t.recipientAddress}:</div>
              <div>{(isReturn ? partyBAddress : recipientAddress) || '................................................................................'}</div>
              {!isReturn ? (
                <>
                  <div className="font-bold">{t.recipientId}:</div>
                  <div>{recipientId || '................................................................................'}</div>
                </>
              ) : (
                <>
                  <div className="font-bold">{t.represent}:</div>
                  <div className="font-semibold text-black">{representativeName}</div>
                </>
              )}
            </div>

            <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-1.5">
              <div className="font-bold">{t.partyB}:</div>
              <div className="font-bold uppercase">{isReturn ? recipientName : partyBCompany}</div>
              <div className="font-bold">{t.recipientAddress}:</div>
              <div>{(isReturn ? recipientAddress : partyBAddress) || '................................................................................'}</div>
              {isReturn ? (
                <>
                  <div className="font-bold">{t.recipientId}:</div>
                  <div>{recipientId || '................................................................................'}</div>
                </>
              ) : (
                <>
                  <div className="font-bold">{t.represent}:</div>
                  <div className="font-semibold text-black">{representativeName}</div>
                </>
              )}
            </div>
          </div>

          <p className="text-sm mb-4 italic">
            {t.today}, ................................................................, {isReturn ? (lang === 'vi' ? 'hai bên đã thống nhất ký biên bản trả thiết bị này với các thiết bị dưới đây:' : 'the two parties have mutually agreed to sign on this return record with below equipments.') : (lang === 'vi' ? 'hai bên đã thống nhất ký biên bản bàn giao này với các thiết bị dưới đây:' : 'the two parties have mutually agreed to sign on this hand-over with below equipments.')}
          </p>

          {/* Table */}
          <table className="w-full border-collapse border border-black text-sm mb-6">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-black p-2 w-12 text-center">{t.no}</th>
                <th className="border border-black p-2 text-left">{t.document}</th>
                <th className="border border-black p-2 w-20 text-center">{t.quantity}</th>
                <th className="border border-black p-2 w-32 text-center">{t.condition}</th>
              </tr>
            </thead>
            <tbody>
              {selectedDevices.map((d, index) => (
                <tr key={d.id}>
                  <td className="border border-black p-2 text-center">{index + 1}</td>
                  <td className="border border-black p-2">
                    <div className="font-bold">{d.type} {d.manufacturer} {d.model}</div>
                    <div className="text-xs text-slate-600">S/N: {d.serialNumber}</div>
                  </td>
                  <td className="border border-black p-2 text-center">1</td>
                  <td className="border border-black p-2 text-center">
                    {deviceConditions[d.id] === 'Tốt' && lang === 'en' ? 'Good' : (deviceConditions[d.id] || 'Good')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Terms */}
          <div className="space-y-2 text-sm mb-8">
            <div className="flex gap-2">
              <span className="font-bold">1.</span>
              <p>{lang === 'vi' ? 'Bên B đã bàn giao cho bên A tại văn phòng công ty.' : 'Party B has already transferred to party A at the company office.'}</p>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">2.</span>
              <p>{t.handoverResponsibility}</p>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">3.</span>
              <p>{t.handoverPolicy}</p>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">4.</span>
              <p>{isReturn ? t.returnAgreement : t.handoverAgreement}</p>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-16 text-center print-signatures">
            {/* Headers */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="font-bold uppercase">{t.partyA}</div>
                {isReturn ? (
                  <div className="text-sm">{t.represent}</div>
                ) : (
                  <div className="text-sm invisible select-none">&nbsp;</div>
                )}
              </div>
              <div>
                <div className="font-bold uppercase">{t.partyB}</div>
                {!isReturn ? (
                  <div className="text-sm">{t.represent}</div>
                ) : (
                  <div className="text-sm invisible select-none">&nbsp;</div>
                )}
              </div>
            </div>

            {/* Vertical spacer - extra space */}
            <div className="print-spacer"></div>

            {/* Names perfectly horizontally aligned */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                {isReturn ? (
                  <div className="font-bold uppercase">{representativeName}</div>
                ) : (
                  <div className="font-bold uppercase">{recipientName}</div>
                )}
              </div>
              <div>
                {isReturn ? (
                  <div className="font-bold uppercase">{recipientName}</div>
                ) : (
                  <div className="font-bold uppercase">{representativeName}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandoverModal;
