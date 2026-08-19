'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Receipt, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  QrCode, 
  Sparkles, 
  ShieldCheck, 
  Percent, 
  Coins,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Copy,
  Check,
  Zap,
  ChevronRight,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [activeChartTab, setActiveChartTab] = useState('7d');
  const [hoveredBar, setHoveredBar] = useState(null);

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
      console.error('Error fetching dashboard data:', e);
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
        // Optimistic UI update
        setWithdrawals(prev => prev.filter(w => w.id !== id));
        fetchData();
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
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

  // Skeleton shimmer placeholder when loading
  if (loading && !stats) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Top Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 rounded-xl skeleton-shimmer"></div>
            <div className="h-4 w-96 rounded-lg skeleton-shimmer"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-36 rounded-xl skeleton-shimmer"></div>
            <div className="h-10 w-32 rounded-xl skeleton-shimmer"></div>
          </div>
        </div>

        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="h-4 w-28 rounded skeleton-shimmer"></div>
              <div className="h-8 w-44 rounded-lg skeleton-shimmer"></div>
              <div className="h-4 w-36 rounded skeleton-shimmer"></div>
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 lg:col-span-2 h-80 skeleton-shimmer"></div>
          <div className="glass-card p-6 h-80 skeleton-shimmer"></div>
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
    approvedPayoutAmount: 0,
    timeline: []
  };

  // Calculate max value for chart scaling
  const maxTimelineVal = Math.max(
    ...s.timeline.map(t => Math.max(t.userShare || 0, t.adminNet || 0, (t.shopeeTotal || 0) * 0.8)),
    1000000
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              Bảng Điều Khiển Quản Trị
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Realtime
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Tổng quan lưu lượng chuyển đổi Shopee, phân bổ hoa hồng (80/20), khấu trừ thuế VAT 10% và giải ngân VietQR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/90 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            title="Làm mới số liệu"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Làm mới</span>
          </button>

          <Link
            href="/withdrawals"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-600/25 hover:opacity-95 transition-all active:scale-95"
          >
            <Wallet className="w-4 h-4" />
            <span>Duyệt đơn rút ({s.pendingPayoutCount})</span>
          </Link>

          <Link
            href="/tax-report"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200/90 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Receipt className="w-4 h-4 text-slate-500" />
            <span>Báo cáo thuế</span>
          </Link>
        </div>
      </div>

      {/* 4 Core KPI Stat Cards (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Shopee Commission */}
        <div className="glass-card glass-card-hover p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Tổng HH Sàn Shopee</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
            {formatVnd(s.totalShopeeCommission)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-slate-100/80">
            <span className="text-slate-500 font-medium">GMV Tổng đơn hàng:</span>
            <span className="font-bold text-slate-700">{formatVnd(s.totalGmv)}</span>
          </div>
        </div>

        {/* 2. User Commission (80%) */}
        <div className="glass-card glass-card-hover p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Chi Trả Người Dùng (80%)</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-emerald-600 tracking-tight font-heading">
            {formatVnd(s.totalUserCommission)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-slate-100/80">
            <div className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Tích lũy ví hoàn tiền</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">80% pool</span>
          </div>
        </div>

        {/* 3. Admin Gross Revenue (20%) */}
        <div className="glass-card glass-card-hover p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Doanh Thu Admin (20%)</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-indigo-600 tracking-tight font-heading">
            {formatVnd(s.totalAdminCommission)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-slate-100/80">
            <span className="text-slate-500 font-medium">Thuế VAT 10%:</span>
            <span className="font-bold text-rose-500">-{formatVnd(s.vatTax)}</span>
          </div>
        </div>

        {/* 4. Admin Net Profit (After 10% VAT) */}
        <div className="glass-card glass-card-hover p-5 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-xl shadow-blue-500/20 border-transparent">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-100">Lợi Nhuận Ròng (Sau VAT)</span>
            <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center backdrop-blur-md shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white tracking-tight font-heading">
            {formatVnd(s.adminNetProfit)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-blue-100 font-medium pt-2 border-t border-white/15">
            <ShieldCheck className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <span className="truncate">Đã khấu trừ thuế VAT 10%</span>
          </div>
        </div>
      </div>

      {/* Analytics Grid: Interactive Chart + Financial Split & Payout Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Revenue Timeline Bar Visual */}
        <div className="glass-card p-6 lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900 font-heading">Phân Tích Hoa Hồng & Lợi Nhuận</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">So sánh cơ cấu chi trả User (80%) vs Lợi nhuận Admin ròng theo ngày</p>
            </div>
            
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 text-xs font-semibold">
              <button
                onClick={() => setActiveChartTab('7d')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeChartTab === '7d' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 ngày qua
              </button>
              <button
                onClick={() => setActiveChartTab('30d')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeChartTab === '30d' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 ngày
              </button>
            </div>
          </div>

          {/* Interactive Bar Chart Canvas */}
          <div className="relative pt-4">
            <div className="h-60 flex items-end justify-between gap-3 px-2">
              {s.timeline.length > 0 ? (
                s.timeline.map((item, idx) => {
                  const userH = Math.max(8, Math.min(100, (item.userShare / maxTimelineVal) * 100));
                  const adminH = Math.max(8, Math.min(100, (item.adminNet / maxTimelineVal) * 100));
                  const isHovered = hoveredBar === idx;

                  return (
                    <div 
                      key={idx} 
                      className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative"
                      onMouseEnter={() => setHoveredBar(idx)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Floating Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-20 z-20 bg-slate-900 text-white rounded-xl p-2.5 text-[11px] shadow-2xl space-y-1 w-44 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                          <div className="font-bold text-blue-300 border-b border-slate-800 pb-1">{item.date}</div>
                          <div className="flex justify-between text-emerald-400">
                            <span>User (80%):</span>
                            <span className="font-bold">{formatVnd(item.userShare)}</span>
                          </div>
                          <div className="flex justify-between text-blue-300">
                            <span>Admin Ròng:</span>
                            <span className="font-bold">{formatVnd(item.adminNet)}</span>
                          </div>
                        </div>
                      )}

                      {/* Bar Visual Column */}
                      <div className="w-full flex items-end justify-center gap-1.5 h-48 bg-slate-50/80 rounded-2xl p-1.5 border border-slate-100 group-hover:border-blue-200 transition-all">
                        {/* User Bar */}
                        <div 
                          style={{ height: `${userH}%` }} 
                          className="w-1/2 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-xl transition-all duration-300 group-hover:brightness-110 shadow-sm"
                        ></div>
                        {/* Admin Bar */}
                        <div 
                          style={{ height: `${adminH}%` }} 
                          className="w-1/2 bg-gradient-to-t from-blue-600 to-indigo-500 rounded-xl transition-all duration-300 group-hover:brightness-110 shadow-sm"
                        ></div>
                      </div>

                      <span className="text-[11px] font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
                        {item.date.split('-').slice(1).join('/')}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  Chưa có dữ liệu giao dịch trong khoảng thời gian này.
                </div>
              )}
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-3 border-t border-slate-100 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
              <span>Hoa hồng User nhận (80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-blue-600"></span>
              <span>Lợi nhuận ròng Admin (Sau VAT)</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Payout & Financial Allocation Breakdown */}
        <div className="glass-card p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900 font-heading">Tiến Độ Rút Tiền</h2>
              </div>
              <Link href="/withdrawals" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                <span>Toàn bộ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Pending Payout Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  Đang chờ duyệt ({s.pendingPayoutCount})
                </span>
                <span className="text-base font-extrabold text-amber-950 font-heading">{formatVnd(s.pendingPayoutAmount)}</span>
              </div>
              <p className="text-[11px] text-amber-700/90">
                Lệnh rút hoa hồng đã xác nhận STK, sẵn sàng quét VietQR Napas247.
              </p>
            </div>

            {/* Approved Payout Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã giải ngân thành công
                </span>
                <span className="text-base font-extrabold text-emerald-950 font-heading">{formatVnd(s.approvedPayoutAmount)}</span>
              </div>
              <p className="text-[11px] text-emerald-700/90">
                Đã chuyển khoản trực tiếp vào tài khoản ngân hàng của thành viên.
              </p>
            </div>
          </div>

          {/* Allocation Progress Visual */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Cơ cấu chia sẻ hoa hồng:</span>
              <span className="text-blue-600">80% / 18% / 2%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: '80%' }} title="80% User"></div>
              <div className="h-full bg-blue-600 transition-all" style={{ width: '18%' }} title="18% Admin Profit"></div>
              <div className="h-full bg-rose-500 transition-all" style={{ width: '2%' }} title="2% Thuế VAT"></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span className="text-emerald-600 font-semibold">● 80% Hoàn User</span>
              <span className="text-blue-600 font-semibold">● 18% Admin Net</span>
              <span className="text-rose-500 font-semibold">● 2% VAT</span>
            </div>
          </div>

          {/* Quick CTA to DataGrid */}
          <Link
            href="/withdrawals"
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Mở DataGrid VietQR Napas247</span>
          </Link>
        </div>
      </div>

      {/* Urgent Pending Withdrawals Table */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h2 className="text-base font-extrabold text-slate-900 font-heading">
                Lệnh Rút Tiền Cần Xử Lý Gấp ({withdrawals.length})
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Danh sách các yêu cầu rút tiền gần nhất cần quét VietQR để duyệt</p>
          </div>
          <Link 
            href="/withdrawals" 
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
          >
            <span>Quản lý toàn bộ</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
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
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-3.5 font-bold text-slate-900">
                    <div className="font-semibold text-slate-900">{item.userName || 'Thành viên LinkP'}</div>
                    <div className="text-[11px] text-slate-400 font-normal font-mono">{item.userId}</div>
                  </td>
                  <td className="py-3.5">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>{item.bankName}</span>
                      <span className="font-mono text-slate-600">({item.accountNumber})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 uppercase font-medium">{item.accountHolder}</div>
                  </td>
                  <td className="py-3.5 text-right font-extrabold text-slate-900 text-base font-heading">
                    {formatVnd(item.amount)}
                  </td>
                  <td className="py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Chờ duyệt</span>
                    </span>
                  </td>
                  <td className="py-3.5 text-center">
                    <button
                      onClick={() => setQrModal(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-all border border-blue-200/60 shadow-sm active:scale-95"
                    >
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      <span>Xem QR</span>
                    </button>
                  </td>
                  <td className="py-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleStatusUpdate(item.id, 'APPROVED')}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(item.id, 'REJECTED')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all active:scale-95"
                    >
                      Từ chối
                    </button>
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <span className="font-semibold text-slate-600 text-sm">Tuyệt vời! Tất cả đơn rút tiền đã được giải ngân.</span>
                      <span className="text-xs text-slate-400">Không có yêu cầu rút tiền nào đang ở trạng thái chờ duyệt.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VietQR Fast Payment Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm font-heading">Mã VietQR Napas247</h3>
              </div>
              <button 
                onClick={() => setQrModal(null)} 
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* QR Code Container */}
            <div className="p-3 bg-gradient-to-b from-slate-50 to-blue-50/40 rounded-2xl border border-blue-100 flex flex-col items-center justify-center relative">
              <img
                src={`https://img.vietqr.io/image/${getBankBin(qrModal.bankName)}-${qrModal.accountNumber}-compact2.png?amount=${qrModal.amount}&addInfo=LinkP%20Rut%20Tien&accountName=${encodeURIComponent(qrModal.accountHolder)}`}
                alt="VietQR Payout"
                className="w-52 h-52 object-contain rounded-xl shadow-md bg-white p-2"
              />
              <span className="text-[10px] text-slate-400 mt-2 font-medium">Quét bằng ứng dụng Banking / MoMo</span>
            </div>

            {/* Transfer Details with 1-Click Copy */}
            <div className="space-y-2 text-left bg-slate-50 p-3.5 rounded-2xl text-xs border border-slate-200/60">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-slate-900 uppercase">{qrModal.accountHolder}</span>
                  <button 
                    onClick={() => copyToClipboard(qrModal.accountHolder, 'name')}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    title="Sao chép tên"
                  >
                    {copiedField === 'name' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ngân hàng:</span>
                <span className="font-bold text-slate-800">{qrModal.bankName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tài khoản:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-black text-slate-900">{qrModal.accountNumber}</span>
                  <button 
                    onClick={() => copyToClipboard(qrModal.accountNumber, 'stk')}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    title="Sao chép STK"
                  >
                    {copiedField === 'stk' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-700">Số tiền:</span>
                <span className="font-black text-blue-600 font-heading">{formatVnd(qrModal.amount)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  handleStatusUpdate(qrModal.id, 'APPROVED');
                  setQrModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs hover:opacity-95 transition-all shadow-md shadow-emerald-600/20 active:scale-98"
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
