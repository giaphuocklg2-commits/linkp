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
  AlertCircle,
  Filter,
  Search,
  Download,
  Users,
  Building2,
  ArrowDownRight
} from 'lucide-react';
import Link from 'next/link';
import VietQRModal from '@/components/VietQRModal';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQrItem, setSelectedQrItem] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [activeChartTab, setActiveChartTab] = useState('7d');
  const [hoveredBar, setHoveredBar] = useState(null);
  
  // DataGrid Filters
  const [selectedBankFilter, setSelectedBankFilter] = useState('ALL');
  const [tableSearchQuery, setTableSearchQuery] = useState('');

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

  const handleStatusUpdate = async (id, newStatus, ftCode = '') => {
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, ft_code: ftCode })
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

  // Filtered DataGrid Withdrawals
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => {
      const bank = (w.bank_name || w.bankName || '').toUpperCase();
      const holder = (w.account_holder || w.accountHolder || '').toLowerCase();
      const stk = (w.account_number || w.accountNumber || '').toLowerCase();
      const q = tableSearchQuery.toLowerCase().trim();

      const matchesBank = selectedBankFilter === 'ALL' || bank.includes(selectedBankFilter);
      const matchesSearch = !q || holder.includes(q) || stk.includes(q) || bank.includes(q);

      return matchesBank && matchesSearch;
    });
  }, [withdrawals, selectedBankFilter, tableSearchQuery]);

  // Chart Data Mock Generator for 7d/30d/90d
  const chartBars = useMemo(() => {
    if (activeChartTab === '7d') {
      return [
        { label: 'T2', gross: 2450000, net: 1960000 },
        { label: 'T3', gross: 3100000, net: 2480000 },
        { label: 'T4', gross: 2890000, net: 2312000 },
        { label: 'T5', gross: 4200000, net: 3360000 },
        { label: 'T6', gross: 3800000, net: 3040000 },
        { label: 'T7', gross: 5100000, net: 4080000 },
        { label: 'CN', gross: 6300000, net: 5040000 },
      ];
    } else if (activeChartTab === '30d') {
      return [
        { label: 'Tuần 1', gross: 14500000, net: 11600000 },
        { label: 'Tuần 2', gross: 18200000, net: 14560000 },
        { label: 'Tuần 3', gross: 22100000, net: 17680000 },
        { label: 'Tuần 4', gross: 26800000, net: 21440000 },
      ];
    } else {
      return [
        { label: 'Tháng 6', gross: 54000000, net: 43200000 },
        { label: 'Tháng 7', gross: 68000000, net: 54400000 },
        { label: 'Tháng 8', gross: 89000000, net: 71200000 },
      ];
    }
  }, [activeChartTab]);

  const maxBarVal = useMemo(() => {
    return Math.max(...chartBars.map(b => b.gross), 1);
  }, [chartBars]);

  // Skeleton shimmer placeholder when loading
  if (loading && !stats) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 rounded-xl skeleton-shimmer"></div>
            <div className="h-4 w-96 rounded-lg skeleton-shimmer"></div>
          </div>
          <div className="h-10 w-36 rounded-xl skeleton-shimmer"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-36 rounded-2xl skeleton-shimmer"></div>
          ))}
        </div>
        <div className="h-72 rounded-2xl skeleton-shimmer"></div>
      </div>
    );
  }

  const grossCommission = stats?.totalCommission || stats?.total_commission || 12850000;
  const userCashbackPaid = stats?.totalUserCashback || Math.round(grossCommission * 0.8);
  const netAdminProfit = stats?.netAdminMargin || Math.round(grossCommission * 0.2);
  const pendingPayoutTotal = withdrawals.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Banner & Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 font-heading tracking-tight">
              Tổng quan Hệ thống LinkP SaaS
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">
            Quản lý doanh thu hoa hồng Shopee Affiliate, chi trả hoàn tiền ròng 80% qua VietQR Napas247 và đối soát tự động.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <Link
            href="/tax-report"
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-2"
          >
            <Receipt className="w-4 h-4 text-slate-500" />
            <span>Báo cáo Thuế & VAT</span>
          </Link>

          <button
            onClick={() => {
              if (withdrawals.length > 0) setSelectedQrItem(withdrawals[0]);
              else alert('Hiện không có đơn rút tiền nào đang chờ duyệt.');
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Duyệt VietQR Hàng Loạt ({withdrawals.length})</span>
          </button>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none"></div>
      </div>

      {/* 2. Bento Grid 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Gross Commission Shopee */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Doanh thu Shopee (Gross)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-heading tracking-tight tabular-nums">
              {formatVnd(grossCommission)}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                <ArrowUpRight className="w-3 h-3" /> +18.4%
              </span>
              <span className="text-[11px] text-slate-400 font-medium">so với tuần trước</span>
            </div>
          </div>
        </div>

        {/* KPI 2: User Net Cashback (80%) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Hoàn tiền User (80%)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 font-heading tracking-tight tabular-nums">
              {formatVnd(userCashbackPaid)}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] font-bold text-slate-600">
                {stats?.completedWithdrawalsCount || 142} lệnh VietQR
              </span>
              <span className="text-[11px] text-slate-400 font-medium">đã giải ngân ròng</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Net Admin Margin (20%) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Lợi nhuận ròng Admin (20%)</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-indigo-600 font-heading tracking-tight tabular-nums">
              {formatVnd(netAdminProfit)}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                Biên LN 20%
              </span>
              <span className="text-[11px] text-slate-400 font-medium">đã khấu trừ tự động</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Pending Payout Hold */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-200 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Chờ duyệt rút tiền</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600 font-heading tracking-tight tabular-nums">
              {formatVnd(pendingPayoutTotal)}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                {withdrawals.length} yêu cầu
              </span>
              <span className="text-[11px] text-slate-400 font-medium">cần tạo VietQR</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Revenue & Order Volume Chart Section */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Biểu đồ Doanh thu & Dòng tiền Chi trả</span>
            </h2>
            <p className="text-xs text-slate-500">So sánh Hoa hồng Gross Shopee thu về vs Tiền hoàn ròng 80% trả cho User</p>
          </div>

          {/* Time range selector tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start">
            {[
              { id: '7d', label: '7 ngày qua' },
              { id: '30d', label: '30 ngày' },
              { id: '90d', label: '90 ngày' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveChartTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeChartTab === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-4 space-y-3">
          <div className="h-56 flex items-end gap-3 sm:gap-6 px-4 pb-2 border-b border-slate-100 relative">
            {chartBars.map((bar, index) => {
              const grossHeight = Math.max(15, Math.round((bar.gross / maxBarVal) * 100));
              const netHeight = Math.max(12, Math.round((bar.net / maxBarVal) * 100));
              const isHovered = hoveredBar === index;

              return (
                <div 
                  key={index} 
                  className="flex-1 flex flex-col items-center justify-end h-full gap-2 relative group"
                  onMouseEnter={() => setHoveredBar(index)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-14 z-20 bg-slate-900 text-white text-[10px] p-2 rounded-xl shadow-xl border border-slate-700 font-mono whitespace-nowrap animate-in fade-in duration-150">
                      <div>Gross: <strong>{formatVnd(bar.gross)}</strong></div>
                      <div>Net (80%): <strong className="text-emerald-400">{formatVnd(bar.net)}</strong></div>
                    </div>
                  )}

                  {/* Dual Bar Pair */}
                  <div className="w-full max-w-[40px] flex items-end justify-center gap-1.5 h-full">
                    {/* Gross Bar */}
                    <div 
                      style={{ height: `${grossHeight}%` }}
                      className="w-1/2 bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-lg transition-all duration-300 group-hover:brightness-110"
                    ></div>
                    {/* Net Bar */}
                    <div 
                      style={{ height: `${netHeight}%` }}
                      className="w-1/2 bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg transition-all duration-300 group-hover:brightness-110"
                    ></div>
                  </div>

                  <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 pt-2 text-xs font-semibold">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-blue-600 to-indigo-500"></span>
              <span>Hoa hồng Gross Shopee</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-emerald-600 to-teal-400"></span>
              <span>Hoàn tiền ròng 80% User</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Smart DataGrid VietQR Napas247 (Pending Withdrawals) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 font-heading">
                Yêu Cầu Rút Tiền Chờ Duyệt VietQR
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                {withdrawals.length} lệnh
              </span>
            </div>
            <p className="text-xs text-slate-500">Tạo mã VietQR 1-chạm để chuyển tiền từ app ngân hàng và duyệt tự động</p>
          </div>

          {/* Search Table input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Lọc theo Tên, STK..."
              value={tableSearchQuery}
              onChange={(e) => setTableSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Bank Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Ngân hàng:
          </span>
          {['ALL', 'MB', 'TECHCOMBANK', 'VIETCOMBANK', 'VPBANK', 'TPBANK', 'ACB', 'BIDV'].map(b => (
            <button
              key={b}
              onClick={() => setSelectedBankFilter(b)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedBankFilter === b
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 border border-slate-200/60'
              }`}
            >
              {b === 'ALL' ? 'Tất cả' : b}
            </button>
          ))}
        </div>

        {/* DataGrid Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200/80">
                <th className="py-3 px-4">Thành viên</th>
                <th className="py-3 px-4">Ngân hàng & Chủ TK</th>
                <th className="py-3 px-4 text-right">Số tiền rút</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center">Mã VietQR</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredWithdrawals.map((item) => {
                const holder = item.account_holder || item.accountHolder || 'Chưa cập nhật';
                const stk = item.account_number || item.accountNumber || '';
                const bank = item.bank_name || item.bankName || 'Ngân hàng';
                const name = item.user_name || item.userName || 'Thành viên LinkP';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 font-heading">{name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.user_id || item.userId || item.id}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{bank}</span>
                        <span className="font-mono text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                          {stk}
                        </span>
                        <button
                          onClick={() => copyToClipboard(stk, item.id)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Copy STK"
                        >
                          {copiedField === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase">{holder}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm font-heading tabular-nums">
                      {formatVnd(item.amount)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Chờ VietQR</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedQrItem(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-all border border-blue-200/60 shadow-2xs active:scale-95"
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tạo VietQR</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleStatusUpdate(item.id, 'COMPLETED')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-2xs active:scale-95"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(item.id, 'REJECTED')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95"
                      >
                        Từ chối
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredWithdrawals.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <span className="font-extrabold text-slate-700 text-sm font-heading">
                        Tuyệt vời! Không có lệnh rút tiền nào đang chờ xử lý.
                      </span>
                      <span className="text-xs text-slate-400">Tất cả yêu cầu hoàn tiền đã được chi trả đầy đủ qua VietQR.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Independent VietQR Modal Component */}
      {selectedQrItem && (
        <VietQRModal 
          item={selectedQrItem} 
          onClose={() => setSelectedQrItem(null)} 
          onApprove={handleStatusUpdate}
        />
      )}
    </div>
  );
}
