'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  QrCode, 
  Search, 
  Filter, 
  Download,
  Copy,
  Check,
  RefreshCw,
  Zap,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Building2,
  AlertTriangle,
  ArrowUpDown,
  CheckSquare,
  Square,
  FileSpreadsheet
} from 'lucide-react';

const BANK_BINS = {
  'techcombank': { bin: '970407', shortName: 'TCB', logoBg: 'bg-red-50 text-red-600' },
  'vietcombank': { bin: '970436', shortName: 'VCB', logoBg: 'bg-emerald-50 text-emerald-600' },
  'vietinbank': { bin: '970415', shortName: 'CTG', logoBg: 'bg-blue-50 text-blue-600' },
  'bidv': { bin: '970418', shortName: 'BIDV', logoBg: 'bg-teal-50 text-teal-600' },
  'mbbank': { bin: '970422', shortName: 'MB', logoBg: 'bg-blue-50 text-blue-700' },
  'vpbank': { bin: '970432', shortName: 'VPB', logoBg: 'bg-green-50 text-green-600' },
  'tpbank': { bin: '970423', shortName: 'TPB', logoBg: 'bg-purple-50 text-purple-600' },
  'acb': { bin: '970416', shortName: 'ACB', logoBg: 'bg-blue-50 text-blue-600' },
  'sacombank': { bin: '970403', shortName: 'STB', logoBg: 'bg-blue-50 text-blue-700' },
  'hdbank': { bin: '970437', shortName: 'HDB', logoBg: 'bg-amber-50 text-amber-600' },
  'vib': { bin: '970441', shortName: 'VIB', logoBg: 'bg-blue-50 text-blue-600' },
  'shb': { bin: '970443', shortName: 'SHB', logoBg: 'bg-orange-50 text-orange-600' },
  'cake': { bin: '546034', shortName: 'CAKE', logoBg: 'bg-pink-50 text-pink-600' },
  'timo': { bin: '963388', shortName: 'TIMO', logoBg: 'bg-purple-50 text-purple-600' }
};

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState([]);
  const [qrModal, setQrModal] = useState(null);
  const [transIdInput, setTransIdInput] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchWithdrawals();
    setSelectedIds([]);
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
      console.error('Error fetching withdrawals:', e);
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
        setSelectedIds(prev => prev.filter(item => item !== id));
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn DUYỆT HÀNG LOẠT ${selectedIds.length} yêu cầu rút tiền đã chọn?`)) return;

    try {
      setBulkProcessing(true);
      await Promise.all(
        selectedIds.map(id => 
          fetch('/api/withdrawals', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'APPROVED', transId: 'BULK_APPROVED' })
          })
        )
      );
      fetchWithdrawals();
      setSelectedIds([]);
    } catch (e) {
      console.error('Error in bulk approve:', e);
    } finally {
      setBulkProcessing(false);
    }
  };

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const copyToClipboard = (text, fieldKey) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getBankBin = (name) => {
    if (!name) return '970422';
    const s = name.toLowerCase().trim();
    for (const [key, val] of Object.entries(BANK_BINS)) {
      if (s.includes(key)) return val.bin;
    }
    if (s.includes('kỹ thương') || s.includes('tcb')) return '970407';
    if (s.includes('ngoại thương') || s.includes('vcb')) return '970436';
    if (s.includes('công thương') || s.includes('ctg')) return '970415';
    if (s.includes('quân đội') || s === 'mb') return '970422';
    if (s.includes('đầu tư')) return '970418';
    if (s.includes('thịnh vượng')) return '970432';
    if (s.includes('tiên phong')) return '970423';
    if (s.includes('á châu')) return '970416';
    if (s.includes('sài gòn thương tín')) return '970403';
    return '970422';
  };

  // Filtered dataset
  const filtered = useMemo(() => {
    return withdrawals.filter(w => {
      const q = search.toLowerCase();
      const matchSearch = (
        (w.userName || '').toLowerCase().includes(q) ||
        (w.accountNumber || '').includes(q) ||
        (w.bankName || '').toLowerCase().includes(q) ||
        (w.userId || '').toLowerCase().includes(q) ||
        (w.id || '').toLowerCase().includes(q)
      );

      const matchBank = selectedBank === 'ALL' || (w.bankName || '').toLowerCase().includes(selectedBank.toLowerCase());

      return matchSearch && matchBank;
    });
  }, [withdrawals, search, selectedBank]);

  // Status Counts
  const counts = useMemo(() => {
    const total = withdrawals.length;
    const pending = withdrawals.filter(w => w.status === 'PENDING').length;
    const approved = withdrawals.filter(w => w.status === 'APPROVED').length;
    const rejected = withdrawals.filter(w => w.status === 'REJECTED').length;

    const pendingAmount = withdrawals.filter(w => w.status === 'PENDING').reduce((acc, cur) => acc + (cur.amount || 0), 0);
    const approvedAmount = withdrawals.filter(w => w.status === 'APPROVED').reduce((acc, cur) => acc + (cur.amount || 0), 0);

    return { total, pending, approved, rejected, pendingAmount, approvedAmount };
  }, [withdrawals]);

  // Pagination Slice
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Bulk Selection Handlers
  const handleSelectAllCurrentPage = () => {
    const currentIds = paginatedData.map(item => item.id);
    const allSelected = currentIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExportCsv = () => {
    const headers = ['Mã đơn,Người nhận,User ID,Ngân hàng,Số tài khoản,Chủ tài khoản,Số tiền,Trạng thái,Thời gian tạo\n'];
    const rows = filtered.map(w => [
      `"${w.id}"`,
      `"${w.userName || ''}"`,
      `"${w.userId || ''}"`,
      `"${w.bankName || ''}"`,
      `"${w.accountNumber || ''}"`,
      `"${w.accountHolder || ''}"`,
      `"${w.amount || 0}"`,
      `"${w.status || ''}"`,
      `"${new Date(w.createdAt).toLocaleString('vi-VN')}"`
    ].join(','));

    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LinkP_Withdrawals_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
                Quản Lý Đơn Rút Tiền & VietQR
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Duyệt và thực hiện chuyển khoản hoa hồng cho người dùng qua chuẩn quét mã VietQR Napas247 tức thì.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel/CSV</span>
          </button>

          <button 
            onClick={fetchWithdrawals}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Tổng quỹ chờ duyệt</div>
            <div className="text-lg font-extrabold text-amber-600 font-heading mt-0.5">{formatVnd(counts.pendingAmount)}</div>
            <div className="text-[10px] text-amber-700 font-medium">{counts.pending} lệnh đang chờ</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Đã giải ngân VietQR</div>
            <div className="text-lg font-extrabold text-emerald-600 font-heading mt-0.5">{formatVnd(counts.approvedAmount)}</div>
            <div className="text-[10px] text-emerald-700 font-medium">{counts.approved} lệnh thành công</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Đã từ chối</div>
            <div className="text-lg font-extrabold text-rose-600 font-heading mt-0.5">{counts.rejected} lệnh</div>
            <div className="text-[10px] text-rose-700 font-medium">Sai thông tin / vi phạm</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Chuẩn kết nối</div>
            <div className="text-lg font-extrabold text-blue-600 font-heading mt-0.5">Napas247 Active</div>
            <div className="text-[10px] text-slate-500 font-medium">VietQR 54 Ngân hàng VN</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Advanced Toolbar & Tabs */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'ALL', label: 'Tất cả', count: counts.total },
              { id: 'PENDING', label: 'Chờ duyệt', count: counts.pending, highlight: true },
              { id: 'APPROVED', label: 'Đã duyệt', count: counts.approved },
              { id: 'REJECTED', label: 'Đã từ chối', count: counts.rejected },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.id 
                    ? 'bg-white/25 text-white' 
                    : tab.highlight && tab.count > 0 
                      ? 'bg-amber-100 text-amber-800 font-black animate-pulse' 
                      : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search and Bank Filter */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Bank Filter Dropdown */}
            <select
              value={selectedBank}
              onChange={e => {
                setSelectedBank(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="ALL">Tất cả ngân hàng</option>
              <option value="techcombank">Techcombank</option>
              <option value="vietcombank">Vietcombank</option>
              <option value="mbbank">MB Bank</option>
              <option value="bidv">BIDV</option>
              <option value="vietinbank">VietinBank</option>
              <option value="vpbank">VPBank</option>
              <option value="acb">ACB</option>
              <option value="tpbank">TPBank</option>
              <option value="cake">CAKE by VPBank</option>
              <option value="timo">Timo</option>
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên, STK, mã đơn..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-150 shadow-xl">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>Đang chọn <strong className="text-emerald-400">{selectedIds.length}</strong> yêu cầu rút tiền</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkApprove}
                disabled={bulkProcessing}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {bulkProcessing ? 'Đang duyệt...' : `✓ Duyệt ${selectedIds.length} đơn đã chọn`}
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
              >
                Hủy chọn
              </button>
            </div>
          </div>
        )}
      </div>

      {/* High-Productivity DataGrid */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-10">
                  <button 
                    onClick={handleSelectAllCurrentPage} 
                    className="text-slate-400 hover:text-slate-700"
                    title="Chọn tất cả trên trang này"
                  >
                    {paginatedData.length > 0 && paginatedData.every(item => selectedIds.includes(item.id)) ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">Mã đơn & Ngày tạo</th>
                <th className="py-3.5 px-4">Người nhận</th>
                <th className="py-3.5 px-4">Ngân hàng & Số TK</th>
                <th className="py-3.5 px-4 text-right">Số tiền rút</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">VietQR Napas</th>
                <th className="py-3.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-10 rounded-xl skeleton-shimmer"></div>
                    </td>
                  </tr>
                ))
              ) : paginatedData.length > 0 ? (
                paginatedData.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-blue-50/40 transition-colors group ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={() => handleToggleSelectRow(item.id)}
                          className="text-slate-400 hover:text-blue-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* ID & Date */}
                      <td className="py-4 px-4">
                        <div className="font-mono text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {item.id.slice(0, 8)}...
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900">{item.userName || 'Thành viên'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.userId}</div>
                      </td>

                      {/* Bank Details with 1-Click Copy */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800 text-xs">{item.bankName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.accountNumber}
                          </span>
                          <button
                            onClick={() => copyToClipboard(item.accountNumber, `stk-${item.id}`)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            title="Sao chép số tài khoản"
                          >
                            {copiedField === `stk-${item.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium mt-0.5">
                          {item.accountHolder}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 text-right font-extrabold text-slate-900 text-base font-heading">
                        {formatVnd(item.amount)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border border-amber-200/80' :
                          item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80' : 'bg-rose-50 text-rose-800 border border-rose-200/80'
                        }`}>
                          {item.status === 'PENDING' ? (
                            <>
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                              <span>Chờ duyệt</span>
                            </>
                          ) : item.status === 'APPROVED' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Đã duyệt</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Từ chối</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* VietQR Trigger */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => {
                            setQrModal(item);
                            setTransIdInput('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-all border border-blue-200/70 shadow-sm active:scale-95"
                        >
                          <QrCode className="w-3.5 h-3.5 text-blue-600" />
                          <span>Mở QR</span>
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {item.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(item.id, 'APPROVED')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(item.id, 'REJECTED')}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all active:scale-95"
                            >
                              Từ chối
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">
                            {item.transId ? `Mã: ${item.transId.slice(0, 10)}` : 'Đã hoàn tất'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Wallet className="w-10 h-10 text-slate-300" />
                      <span className="font-semibold text-slate-600 text-sm">Không tìm thấy yêu cầu rút tiền phù hợp.</span>
                      <span className="text-xs text-slate-400">Hãy thử đổi từ khóa tìm kiếm hoặc chọn tab trạng thái khác.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white"
            >
              <option value={10}>10 bản ghi</option>
              <option value={25}>25 bản ghi</option>
              <option value={50}>50 bản ghi</option>
            </select>
            <span>trong tổng số <strong>{filtered.length}</strong> kết quả</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-slate-700">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced VietQR Napas247 Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm font-heading">Chi Tiết Chuyển Khoản VietQR</h3>
                  <div className="text-[10px] text-slate-400">Napas247 Tức thì qua App Ngân hàng</div>
                </div>
              </div>
              <button 
                onClick={() => setQrModal(null)} 
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* QR Code Graphic with Viewfinder frame */}
            <div className="p-3 bg-gradient-to-b from-slate-50 to-blue-50/50 rounded-2xl border border-blue-100 flex flex-col items-center justify-center relative">
              <img
                src={`https://img.vietqr.io/image/${getBankBin(qrModal.bankName)}-${qrModal.accountNumber}-compact2.png?amount=${qrModal.amount}&addInfo=LinkP%20Rut%20Tien&accountName=${encodeURIComponent(qrModal.accountHolder)}`}
                alt="VietQR Payout"
                className="w-56 h-56 object-contain rounded-xl shadow-md bg-white p-2.5 ring-1 ring-slate-200/80"
              />
              <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                <Zap className="w-3 h-3 fill-blue-600" />
                <span>Quét mã trên App Banking để tự động điền STK & Số tiền</span>
              </div>
            </div>

            {/* Receipt Summary with 1-Click Copy */}
            <div className="space-y-2 text-left bg-slate-50 p-4 rounded-2xl text-xs border border-slate-200/70">
              {/* Recipient */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-slate-900 uppercase font-heading">{qrModal.accountHolder}</span>
                  <button 
                    onClick={() => copyToClipboard(qrModal.accountHolder, 'modal-name')}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    title="Sao chép tên"
                  >
                    {copiedField === 'modal-name' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Bank Name */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ngân hàng:</span>
                <span className="font-bold text-slate-800">{qrModal.bankName}</span>
              </div>

              {/* STK */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tài khoản:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-black text-slate-900 text-sm bg-white px-2 py-0.5 rounded border border-slate-200">
                    {qrModal.accountNumber}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(qrModal.accountNumber, 'modal-stk')}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    title="Sao chép STK"
                  >
                    {copiedField === 'modal-stk' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Transfer Note */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Nội dung chuyển khoản:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                    LinkP Rut Tien {qrModal.id.slice(0, 6)}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(`LinkP Rut Tien ${qrModal.id.slice(0, 6)}`, 'modal-note')}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    title="Sao chép nội dung"
                  >
                    {copiedField === 'modal-note' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-700">Số tiền giải ngân:</span>
                <span className="font-black text-blue-600 text-base font-heading">{formatVnd(qrModal.amount)}</span>
              </div>
            </div>

            {/* Optional Audit Transaction Reference Input */}
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-bold text-slate-600">
                Mã giao dịch ngân hàng (FT Code / Tham chiếu) <span className="text-slate-400 font-normal">(Tùy chọn)</span>:
              </label>
              <input
                type="text"
                placeholder="VD: FT260819140833 hoặc MB12345..."
                value={transIdInput}
                onChange={e => setTransIdInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  handleStatusUpdate(qrModal.id, 'APPROVED', transIdInput);
                  setQrModal(null);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs hover:opacity-95 transition-all shadow-md shadow-emerald-600/20 active:scale-98"
              >
                ✓ Đã chuyển & Xác nhận duyệt
              </button>
              <button
                onClick={() => setQrModal(null)}
                className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all"
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
