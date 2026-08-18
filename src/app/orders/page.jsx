'use client';

import { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Sparkles,
  ExternalLink,
  Coins,
  Check,
  Plus,
  Tag,
  Users,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [alertMsg, setAlertMsg] = useState(null);

  // Quick Match Sub-ID Modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchForm, setMatchForm] = useState({
    orderCode: '',
    subId: '',
    productName: '',
    shopName: 'Shopee Mall',
    orderValue: '',
    shopeeCommission: '',
    selectedUserId: ''
  });
  const [matching, setMatching] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSyncAddLiveTag = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/orders/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message || 'Đồng bộ đơn AddLiveTag thành công!');
        fetchOrders();
      } else {
        showAlert('error', data.error || 'Không thể đồng bộ AddLiveTag');
      }
    } catch (e) {
      showAlert('error', e.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Auto-sync on first load
      if (activeTab === 'ALL') {
        await handleSyncAddLiveTag();
      } else {
        fetchOrders();
      }
      fetchUsersList();
    };
    init();
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders?status=${activeTab}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersList = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message || 'Cập nhật đơn hàng thành công!');
        fetchOrders();
      } else {
        showAlert('error', data.error);
      }
    } catch (e) {
      showAlert('error', e.message);
    }
  };

  const handleQuickMatchOrder = async (e) => {
    e.preventDefault();
    if (!matchForm.orderCode || !matchForm.orderValue) {
      showAlert('error', 'Vui lòng nhập Mã đơn hàng và Giá trị đơn');
      return;
    }

    setMatching(true);
    try {
      const val = Number(matchForm.orderValue);
      const comm = matchForm.shopeeCommission ? Number(matchForm.shopeeCommission) : Math.round(val * 0.10);

      // Find subId or userId
      let effectiveSubId = matchForm.subId.trim();
      let effectiveUserId = matchForm.selectedUserId;

      if (!effectiveSubId && effectiveUserId) {
        const u = users.find(x => x.id === effectiveUserId);
        if (u) {
          const clean = (u.id || '').replace('user_', '').replace('google_', '');
          effectiveSubId = 'u_' + clean;
        }
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: matchForm.orderCode,
          subId: effectiveSubId,
          userId: effectiveUserId || undefined,
          productName: matchForm.productName || 'Sản phẩm Shopee',
          shopName: matchForm.shopName || 'Shopee Mall',
          orderValue: val,
          shopeeCommission: comm
        })
      });

      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message);
        setShowMatchModal(false);
        setMatchForm({
          orderCode: '',
          subId: '',
          productName: '',
          shopName: 'Shopee Mall',
          orderValue: '',
          shopeeCommission: '',
          selectedUserId: ''
        });
        fetchOrders();
      } else {
        showAlert('error', data.error);
      }
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setMatching(false);
    }
  };

  const showAlert = (type, message) => {
    setAlertMsg({ type, message });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (
      (o.orderCode || '').toLowerCase().includes(q) ||
      (o.subId || '').toLowerCase().includes(q) ||
      (o.productName || '').toLowerCase().includes(q) ||
      (o.userName || '').toLowerCase().includes(q) ||
      (o.shopName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-blue-600" />
            Khớp Sub_ID & Duyệt Đơn Shopee Affiliate
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Khớp mã <strong>Sub_ID</strong> của đơn hàng Shopee với tài khoản User. Khi duyệt <strong>Hoàn thành</strong>, hệ thống tự động cộng 80% hoa hồng vào ví User.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleSyncAddLiveTag}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            title="Đồng bộ đơn hàng và bóc tách Sub_ID từ AddLiveTag API"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Đang Đồng Bộ AddLiveTag...' : '⚡ Đồng Bộ Live (AddLiveTag API)'}</span>
          </button>

          <button 
            onClick={() => setShowMatchModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>⚡ Khớp & Nhập Đơn Theo Sub_ID</span>
          </button>

          <button 
            onClick={fetchOrders}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {alertMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm animate-in fade-in border ${
          alertMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {alertMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
          <span>{alertMsg.message}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Tất cả đơn' },
            { id: 'PENDING', label: '⏳ Chờ duyệt' },
            { id: 'APPROVED', label: '✓ Đã hoàn thành (Vào ví)' },
            { id: 'REJECTED', label: '✕ Đã từ chối/Hủy' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Sub_ID, mã đơn Shopee, User..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Mã Đơn Shopee & Thời Gian</th>
                <th className="py-3.5 px-5">Sub_ID & Thành Viên</th>
                <th className="py-3.5 px-5">Sản Phẩm Tiếp Thị</th>
                <th className="py-3.5 px-4 text-right">Giá Trị Đơn</th>
                <th className="py-3.5 px-4 text-right text-emerald-700">Hoàn Tiền (80%)</th>
                <th className="py-3.5 px-4 text-right text-blue-700">Doanh Thu Admin (20%)</th>
                <th className="py-3.5 px-4 text-center">Tiến Độ</th>
                <th className="py-3.5 px-5 text-center">Duyệt & Cộng Ví</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải danh sách đơn hàng...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    Không tìm thấy đơn hàng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map(ord => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-mono font-black text-slate-900 text-sm">
                        #{ord.orderCode}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(ord.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-900 text-xs font-mono font-bold border border-blue-200 shadow-sm w-fit">
                          <Tag className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-[10px] uppercase text-blue-500 mr-0.5">Sub_ID:</span> 
                          <span className="text-sm">{ord.subId || 'app_direct'}</span>
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-700 mt-1">
                        {ord.userName || 'Người dùng'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {ord.userId}</div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 text-xs truncate max-w-[200px]">
                        {ord.productName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">{ord.shopName}</div>
                    </td>

                    <td className="py-4 px-4 text-right font-bold text-slate-700 text-xs">
                      {formatVnd(ord.orderValue)}
                    </td>

                    <td className="py-4 px-4 text-right font-black text-emerald-600 text-sm">
                      +{formatVnd(ord.userCashback)}
                    </td>

                    <td className="py-4 px-4 text-right font-bold text-blue-700 text-xs">
                      +{formatVnd(ord.adminRevenue)}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        ord.status === 'APPROVED' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : ord.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {ord.status === 'APPROVED' ? '✓ Đã Hoàn Thành' : ord.status === 'REJECTED' ? '✕ Đã Hủy' : '⏳ Chờ Duyệt'}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {ord.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleStatusUpdate(ord.id, 'APPROVED')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                            title="Duyệt hoàn thành và tự động cộng 80% vào ví User"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Duyệt & Vào Ví</span>
                          </button>
                        )}
                        {ord.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleStatusUpdate(ord.id, 'REJECTED')}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-all"
                            title="Hủy đơn hàng"
                          >
                            ✕ Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK MATCH MODAL */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                  ⚡
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Khớp Sub_ID & Nhập Đơn Tiếp Thị
                  </h2>
                  <p className="text-xs text-slate-500">
                    Hệ thống sẽ tự động tìm đúng User sở hữu Sub_ID và gán đơn hàng.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowMatchModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickMatchOrder} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Mã Đơn Hàng Shopee *
                  </label>
                  <input 
                    type="text"
                    placeholder="VD: 240815SHP8899"
                    value={matchForm.orderCode}
                    onChange={(e) => setMatchForm({ ...matchForm, orderCode: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Nhập Sub_ID (từ báo cáo Shopee)
                  </label>
                  <input 
                    type="text"
                    placeholder="VD: u_10829102910..."
                    value={matchForm.subId}
                    onChange={(e) => setMatchForm({ ...matchForm, subId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Hoặc chọn nhanh User từ danh sách
                </label>
                <select 
                  value={matchForm.selectedUserId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    const u = users.find(x => x.id === uid);
                    setMatchForm({
                      ...matchForm,
                      selectedUserId: uid,
                      subId: u ? 'u_' + (u.id || '').replace('user_', '').replace('google_', '') : matchForm.subId
                    });
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="">-- Tự động tra cứu theo Sub_ID ở trên --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} (Sub_ID: u_{(u.id || '').replace('user_', '').replace('google_', '')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Tên Sản Phẩm
                  </label>
                  <input 
                    type="text"
                    placeholder="VD: Áo thun Oversize / Tai nghe..."
                    value={matchForm.productName}
                    onChange={(e) => setMatchForm({ ...matchForm, productName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Giá Trị Đơn Hàng (VNĐ) *
                  </label>
                  <input 
                    type="number"
                    placeholder="VD: 500000"
                    value={matchForm.orderValue}
                    onChange={(e) => setMatchForm({ ...matchForm, orderValue: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              {matchForm.orderValue && Number(matchForm.orderValue) > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between font-bold">
                  <div>
                    <div>Hoàn tiền User (80% hoa hồng):</div>
                    <div className="text-base font-black text-emerald-700">
                      +{formatVnd(Math.round(Number(matchForm.orderValue) * 0.10 * 0.80))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>Doanh thu Admin (20%):</div>
                    <div className="text-sm font-black text-blue-700">
                      +{formatVnd(Math.round(Number(matchForm.orderValue) * 0.10 * 0.20))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMatchModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={matching}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {matching ? 'Đang Khớp...' : '⚡ Khớp & Lưu Đơn Hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
