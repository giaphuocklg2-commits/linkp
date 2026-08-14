'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  QrCode, 
  Sparkles, 
  ExternalLink,
  ShieldCheck,
  Percent,
  Coins
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, withRes] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/withdrawals?status=PENDING').then(r => r.json())
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (withRes.success) setWithdrawals(withRes.withdrawals || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm font-medium text-slate-500">Đang tải số liệu Dashboard...</div>
        </div>
      </div>
    );
  }

  const s = stats || {
    totalShopeeCommission: 0,
    totalUserCommission: 0,
    totalAdminCommission: 0,
    vatTax: 0,
    adminNetProfit: 0,
    totalGmv: 0,
    totalLinks: 0,
    pendingPayoutAmount: 0,
    pendingPayoutCount: 0,
    timeline: []
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            Bảng Điều Khiển Quản Trị
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live Data
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng quan lưu lượng chuyển đổi Shopee, phân bổ hoa hồng (80/20), thuế VAT 10% và tiến độ duyệt đơn rút tiền.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/withdrawals"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            <Wallet className="w-4 h-4" />
            <span>Duyệt đơn rút ({s.pendingPayoutCount})</span>
          </Link>
          <Link
            href="/tax-report"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Receipt className="w-4 h-4 text-slate-500" />
            <span>Báo cáo thuế</span>
          </Link>
        </div>
      </div>

      {/* 4 Core KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Shopee Commission */}
        <div className="glass-card p-5 relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng HH Sàn Shopee</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            {formatVnd(s.totalShopeeCommission)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <ArrowUpRight className="w-4 h-4" />
            <span>100% doanh thu tiếp thị</span>
          </div>
        </div>

        {/* 2. User Commission (80%) */}
        <div className="glass-card p-5 relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Chi Trả Người Dùng (80%)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-600 tracking-tight">
            {formatVnd(s.totalUserCommission)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Tích lũy hoàn tiền vào ví User</span>
          </div>
        </div>

        {/* 3. Admin Gross Revenue (20%) */}
        <div className="glass-card p-5 relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Doanh Thu Admin (20%)</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-indigo-600 tracking-tight">
            {formatVnd(s.totalAdminCommission)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Thuế VAT 10%:</span>
            <span className="font-bold text-red-500">-{formatVnd(s.vatTax)}</span>
          </div>
        </div>

        {/* 4. Admin Net Profit (After 10% VAT) */}
        <div className="glass-card p-5 relative overflow-hidden border-blue-500/40 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/15">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Lợi Nhuận Ròng (Sau VAT)</span>
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white tracking-tight">
            {formatVnd(s.adminNetProfit)}
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-blue-100 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Đã khấu trừ 10% thuế VAT</span>
          </div>
        </div>
      </div>

      {/* Analytics Grid: Chart + Payout Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Revenue Timeline Bar Visual */}
        <div className="glass-card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Biểu Đồ Hoa Hồng 7 Ngày Gần Nhất</h2>
              <p className="text-xs text-slate-400">So sánh cơ cấu phân bổ giữa User hoàn tiền (80%) và Lợi nhuận Admin</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">7 ngày qua</span>
          </div>

          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
            {s.timeline.map((item, idx) => {
              const maxVal = 13000000;
              const userH = Math.min(100, (item.userShare / maxVal) * 100);
              const adminH = Math.min(100, (item.adminNet / maxVal) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full flex items-end justify-center gap-1 h-48 bg-slate-50 rounded-xl p-1 relative">
                    {/* User bar */}
                    <div 
                      style={{ height: `${userH}%` }} 
                      className="w-1/2 bg-emerald-500 rounded-lg transition-all group-hover:bg-emerald-600 relative"
                      title={`User (80%): ${formatVnd(item.userShare)}`}
                    ></div>
                    {/* Admin bar */}
                    <div 
                      style={{ height: `${adminH}%` }} 
                      className="w-1/2 bg-blue-600 rounded-lg transition-all group-hover:bg-blue-700 relative"
                      title={`Admin Ròng: ${formatVnd(item.adminNet)}`}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-slate-600">{item.date}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span>Hoa hồng User nhận (80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-600"></span>
              <span>Lợi nhuận ròng Admin (Sau VAT 10%)</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Payout Status */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Tiến Độ Rút Tiền</h2>
            <Link href="/withdrawals" className="text-xs font-bold text-blue-600 hover:underline">
              Xem tất cả →
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Đang chờ duyệt ({s.pendingPayoutCount})
                </span>
                <span className="text-base font-black text-amber-900">{formatVnd(s.pendingPayoutAmount)}</span>
              </div>
              <p className="text-[11px] text-amber-700 mt-1">Cần thanh toán qua VietQR Napas247 cho người dùng.</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã chuyển khoản
                </span>
                <span className="text-base font-black text-emerald-900">{formatVnd(s.approvedPayoutAmount)}</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">Giao dịch thành công trực tiếp vào tài khoản ngân hàng.</p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/withdrawals"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md"
            >
              <QrCode className="w-4 h-4" />
              <span>Quét mã VietQR thanh toán 1-chạm</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Withdrawals Table */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Yêu Cầu Rút Tiền Mới Nhất</h2>
            <p className="text-xs text-slate-400">Danh sách lệnh rút tiền hoa hồng chờ admin xác nhận chuyển khoản</p>
          </div>
          <Link href="/withdrawals" className="text-xs font-bold text-blue-600 hover:underline">
            Quản lý toàn bộ ({withdrawals.length}) →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3">Người nhận</th>
                <th className="pb-3">Ngân hàng & Số TK</th>
                <th className="pb-3 text-right">Số tiền rút</th>
                <th className="pb-3 text-center">Trạng thái</th>
                <th className="pb-3 text-center">Mã VietQR</th>
                <th className="pb-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {withdrawals.slice(0, 5).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 font-bold text-slate-900">
                    <div>{item.userName}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{item.userId}</div>
                  </td>
                  <td className="py-3.5">
                    <div className="font-semibold text-slate-800">{item.bankName} - {item.accountNumber}</div>
                    <div className="text-[11px] text-slate-500 uppercase">{item.accountHolder}</div>
                  </td>
                  <td className="py-3.5 text-right font-black text-slate-900 text-base">
                    {formatVnd(item.amount)}
                  </td>
                  <td className="py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      item.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status === 'PENDING' ? 'Chờ duyệt' : item.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                    </span>
                  </td>
                  <td className="py-3.5 text-center">
                    <button
                      onClick={() => setQrModal(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-all border border-blue-200/60"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Xem QR</span>
                    </button>
                  </td>
                  <td className="py-3.5 text-right space-x-2">
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
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Không có đơn rút tiền nào đang chờ duyệt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VietQR Quick Payment Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900">Quét Mã VietQR Chuyển Khoản</h3>
              <button onClick={() => setQrModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200 flex justify-center">
              <img
                src={qrModal.qrUrl || `https://img.vietqr.io/image/${qrModal.bankName}-${qrModal.accountNumber}-compact2.png?amount=${qrModal.amount}&addInfo=LinkP%20Rut%20Tien&accountName=${encodeURIComponent(qrModal.accountHolder)}`}
                alt="VietQR Payout"
                className="w-56 h-56 object-contain rounded-xl"
              />
            </div>

            <div className="space-y-1 text-left bg-slate-50 p-3.5 rounded-xl text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Người nhận:</span>
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
                ✓ Đã chuyển khoản & Duyệt
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
