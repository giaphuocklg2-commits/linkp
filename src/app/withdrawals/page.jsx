'use client';

import { useState, useEffect } from 'react';
import { 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  QrCode, 
  Search, 
  Filter, 
  ExternalLink,
  Download
} from 'lucide-react';

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [qrModal, setQrModal] = useState(null);

  useEffect(() => {
    fetchWithdrawals();
  }, [activeTab]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/withdrawals?status=${activeTab}`);
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.withdrawals || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus, transId = '') => {
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, transId })
      });
      const data = await res.json();
      if (data.success) {
        fetchWithdrawals();
      }
    } catch (e) {
      console.error(e);
    }
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

  const filtered = withdrawals.filter(w => {
    const q = search.toLowerCase();
    return (
      (w.userName || '').toLowerCase().includes(q) ||
      (w.accountNumber || '').includes(q) ||
      (w.bankName || '').toLowerCase().includes(q) ||
      (w.userId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-7 h-7 text-blue-600" />
            Quản Lý Yêu Cầu Rút Tiền
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Duyệt và thực hiện chuyển khoản hoa hồng cho người dùng qua chuẩn quét mã VietQR Napas247 tức thì.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchWithdrawals}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'PENDING', label: 'Chờ duyệt' },
            { id: 'APPROVED', label: 'Đã duyệt' },
            { id: 'REJECTED', label: 'Đã từ chối' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm tên, số tài khoản, ngân hàng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Mã đơn & Ngày tạo</th>
                <th className="py-3.5 px-5">Người nhận</th>
                <th className="py-3.5 px-5">Ngân hàng & Số TK</th>
                <th className="py-3.5 px-5 text-right">Số tiền</th>
                <th className="py-3.5 px-5 text-center">Trạng thái</th>
                <th className="py-3.5 px-5 text-center">Mã VietQR</th>
                <th className="py-3.5 px-5 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-5">
                    <div className="font-mono text-xs font-bold text-slate-900">{item.id.slice(0, 8)}...</div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </td>
                  <td className="py-4 px-5 font-bold text-slate-900">
                    <div>{item.userName}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{item.userId}</div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="font-semibold text-slate-800">{item.bankName} - {item.accountNumber}</div>
                    <div className="text-[11px] text-slate-500 uppercase">{item.accountHolder}</div>
                  </td>
                  <td className="py-4 px-5 text-right font-black text-slate-900 text-base">
                    {formatVnd(item.amount)}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      item.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status === 'PENDING' ? 'Chờ duyệt' : item.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button
                      onClick={() => setQrModal(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-all border border-blue-200/60"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Quét QR</span>
                    </button>
                  </td>
                  <td className="py-4 px-5 text-right space-x-2">
                    {item.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(item.id, 'APPROVED')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(item.id, 'REJECTED')}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-all"
                        >
                          Từ chối
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic">Đã xử lý</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy yêu cầu rút tiền nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900">Mã VietQR Napas247</h3>
              <button onClick={() => setQrModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200 flex justify-center">
              <img
                src={`https://img.vietqr.io/image/${getBankBin(qrModal.bankName)}-${qrModal.accountNumber}-compact2.png?amount=${qrModal.amount}&addInfo=LinkP%20Rut%20Tien&accountName=${encodeURIComponent(qrModal.accountHolder)}`}
                alt="VietQR Payout"
                className="w-56 h-56 object-contain rounded-xl"
              />
            </div>

            <div className="space-y-1 text-left bg-slate-50 p-3.5 rounded-xl text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <span className="font-bold text-slate-900">{qrModal.accountHolder}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngân hàng:</span>
                <span className="font-bold text-slate-900">{qrModal.bankName} - {qrModal.accountNumber}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-700">Số tiền:</span>
                <span className="font-black text-blue-600">{formatVnd(qrModal.amount)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleStatusUpdate(qrModal.id, 'APPROVED');
                  setQrModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-md"
              >
                ✓ Đã chuyển & Duyệt đơn
              </button>
              <button
                onClick={() => setQrModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
