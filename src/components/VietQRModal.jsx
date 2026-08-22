'use client';

import { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  QrCode, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  ShieldCheck,
  Building2,
  User,
  CreditCard,
  Hash
} from 'lucide-react';

export default function VietQRModal({ item, onClose, onApprove }) {
  const [ftCode, setFtCode] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!item) return null;

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const getBankBin = (name) => {
    if (!name) return '970422';
    const s = name.toLowerCase().trim();
    if (s.includes('techcom') || s.includes('tcb') || s.includes('kỹ thương')) return '970407';
    if (s.includes('vietcom') || s.includes('vcb') || s.includes('ngoại thương')) return '970436';
    if (s.includes('vietin') || s.includes('ctg') || s.includes('công thương')) return '970415';
    if (s.includes('vpbank') || s.includes('vpb') || s.includes('thịnh vượng')) return '970432';
    if (s.includes('tpbank') || s.includes('tpb') || s.includes('tiên phong')) return '970423';
    if (s.includes('sacom') || s.includes('stb') || s.includes('sài gòn thương tín')) return '970403';
    if (s.includes('mbbank') || s.includes('mb bank') || s.includes('(mb)') || s.includes('quân đội') || s === 'mb') return '970422';
    if (s.includes('bidv') || s.includes('đầu tư')) return '970418';
    if (s.includes('agri') || s.includes('nông nghiệp')) return '970405';
    if (s.includes('acb') || s.includes('á châu')) return '970416';
    if (s.includes('hdb') || s.includes('hdbank') || s.includes('phát triển tp')) return '970437';
    if (s.includes('vib') || s.includes('quốc tế')) return '970441';
    if (s.includes('shb') || s.includes('sài gòn - hà nội')) return '970443';
    if (s.includes('msb') || s.includes('hàng hải')) return '970426';
    if (s.includes('cake')) return '546034';
    if (s.includes('timo')) return '963388';
    return '970422';
  };

  const bankBin = getBankBin(item.bank_name);
  const addInfo = encodeURIComponent(`LINKP RUT ${item.id ? item.id.substring(0, 8) : ''}`);
  const qrUrl = `https://img.vietqr.io/image/${bankBin}-${item.account_number}-compact2.png?amount=${item.amount}&addInfo=${addInfo}&accountName=${encodeURIComponent(item.account_holder || '')}`;

  const handleSubmitApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(item.id, 'APPROVED', ftCode);
      onClose();
    } catch (e) {
      console.error('Approve failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 fill-blue-500 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">Thanh toán VietQR Napas247</h3>
              <p className="text-[11px] font-medium text-slate-500">Quét mã QR để chuyển tiền trực tiếp từ ứng dụng ngân hàng</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* QR Code Frame */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/50 to-indigo-50/30 border border-blue-100/80 flex flex-col items-center justify-center space-y-3">
            <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200/80 relative group">
              <img 
                src={qrUrl} 
                alt="VietQR Code" 
                className="w-52 h-52 object-contain rounded-lg" 
              />
              <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                <span className="text-xs font-bold bg-white text-slate-800 px-3 py-1.5 rounded-full shadow-md">
                  Chuyển nhanh Napas247
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-black text-emerald-600 font-heading tracking-tight tabular-nums">
                {formatVnd(item.amount)}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Số tiền chi trả ròng vào tài khoản khách hàng
              </div>
            </div>
          </div>

          {/* Account & Details Grid */}
          <div className="space-y-2.5">
            {/* Account Holder */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">Chủ tài khoản:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900 font-heading">
                  {item.account_holder || 'Chưa cập nhật'}
                </span>
                <button
                  onClick={() => copyToClipboard(item.account_holder, 'holder')}
                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Copy tên chủ tài khoản"
                >
                  {copiedField === 'holder' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Bank Name & STK */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">Ngân hàng & STK:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {item.bank_name} - {item.account_number}
                </span>
                <button
                  onClick={() => copyToClipboard(item.account_number, 'stk')}
                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Copy STK"
                >
                  {copiedField === 'stk' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Transfer Note (addInfo) */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Hash className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">Nội dung chuyển:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                  LINKP RUT {item.id ? item.id.substring(0, 8) : ''}
                </span>
                <button
                  onClick={() => copyToClipboard(`LINKP RUT ${item.id ? item.id.substring(0, 8) : ''}`, 'info')}
                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Copy nội dung chuyển tiền"
                >
                  {copiedField === 'info' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* FT Transaction Code Input for 1-Second Approval */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Mã giao dịch ngân hàng (Mã FT / Số tham chiếu):</span>
              <span className="text-[10px] font-normal text-slate-400">(Tùy chọn nhập)</span>
            </label>
            <input
              type="text"
              placeholder="VD: FT26081998827361..."
              value={ftCode}
              onChange={(e) => setFtCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-sm"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            Đóng
          </button>

          <button
            onClick={handleSubmitApprove}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Xác nhận đã chuyển tiền</span>
          </button>
        </div>
      </div>
    </div>
  );
}
