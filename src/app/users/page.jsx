'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Edit3, 
  Wallet, 
  CreditCard, 
  Shield, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Plus, 
  ExternalLink, 
  Link2, 
  ShoppingBag, 
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Selected user for Detail Modal
  const [activeUser, setActiveUser] = useState(null);
  const [modalTab, setModalTab] = useState('wallet'); // 'wallet' | 'links' | 'orders'

  // User detail sub-data
  const [userLinks, setUserLinks] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [subLoading, setSubLoading] = useState(false);

  // Edit Wallet Form
  const [walletForm, setWalletForm] = useState({
    balance: '',
    pending: '',
    withdrawn: '',
    role: 'USER',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  });
  const [savingWallet, setSavingWallet] = useState(false);

  // Add Order Form
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    orderCode: '',
    productName: '',
    shopName: 'Shopee Mall',
    orderValue: '',
    shopeeCommission: '',
  });
  const [addingOrder, setAddingOrder] = useState(false);

  // Toast / notification
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const openUserModal = async (u, defaultTab = 'wallet') => {
    setActiveUser(u);
    setModalTab(defaultTab);
    setWalletForm({
      balance: u.balance || 0,
      pending: u.pending || 0,
      withdrawn: u.withdrawn || 0,
      role: u.role || 'USER',
      bankName: u.bankName || '',
      accountNumber: u.accountNumber || '',
      accountHolder: u.accountHolder || '',
    });
    fetchUserSubData(u.id);
  };

  const fetchUserSubData = async (userId) => {
    setSubLoading(true);
    try {
      const [linksRes, ordersRes] = await Promise.all([
        fetch(`/api/links?userId=${encodeURIComponent(userId)}`).then(r => r.json()),
        fetch(`/api/orders?userId=${encodeURIComponent(userId)}`).then(r => r.json())
      ]);
      if (linksRes.success) setUserLinks(linksRes.links || []);
      if (ordersRes.success) setUserOrders(ordersRes.orders || []);
    } catch (err) {
      console.error('Error fetching user sub data:', err);
    } finally {
      setSubLoading(false);
    }
  };

  const handleSaveWallet = async (e) => {
    e.preventDefault();
    if (!activeUser) return;
    setSavingWallet(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser.id,
          name: activeUser.name,
          email: activeUser.email,
          role: walletForm.role,
          balance: Number(walletForm.balance),
          pending: Number(walletForm.pending),
          withdrawn: Number(walletForm.withdrawn),
          bankName: walletForm.bankName,
          accountNumber: walletForm.accountNumber,
          accountHolder: walletForm.accountHolder,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Đã cập nhật số dư của ${activeUser.name || activeUser.email} thành công!`);
        fetchUsers();
        // update local active user
        setActiveUser(prev => ({
          ...prev,
          balance: walletForm.balance,
          pending: walletForm.pending,
          withdrawn: walletForm.withdrawn,
          bankName: walletForm.bankName,
          accountNumber: walletForm.accountNumber,
          accountHolder: walletForm.accountHolder,
          role: walletForm.role,
        }));
      } else {
        showToast('error', data.error);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSavingWallet(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        if (activeUser) {
          fetchUserSubData(activeUser.id);
          fetchUsers();
          // reload active user wallet
          const userRes = await fetch(`/api/users?search=${encodeURIComponent(activeUser.id)}`).then(r => r.json());
          if (userRes.success && userRes.users?.length > 0) {
            const updated = userRes.users[0];
            setActiveUser(updated);
            setWalletForm(prev => ({
              ...prev,
              balance: updated.balance,
              pending: updated.pending,
              withdrawn: updated.withdrawn
            }));
          }
        }
      } else {
        showToast('error', data.error);
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleCreateOrderForUser = async (e) => {
    e.preventDefault();
    if (!activeUser || !newOrderForm.orderCode || !newOrderForm.orderValue) {
      showToast('error', 'Vui lòng nhập mã đơn và giá trị đơn');
      return;
    }
    setAddingOrder(true);
    try {
      const val = Number(newOrderForm.orderValue);
      const comm = newOrderForm.shopeeCommission ? Number(newOrderForm.shopeeCommission) : Math.round(val * 0.10);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: newOrderForm.orderCode,
          userId: activeUser.id,
          userName: activeUser.name || 'Người dùng LinkP',
          productName: newOrderForm.productName || 'Sản phẩm Shopee',
          shopName: newOrderForm.shopName || 'Shopee Mall',
          orderValue: val,
          shopeeCommission: comm,
          subId: 'admin_assigned'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Đã thêm đơn #${newOrderForm.orderCode} cho ${activeUser.name}!`);
        setShowAddOrderModal(false);
        setNewOrderForm({ orderCode: '', productName: '', shopName: 'Shopee Mall', orderValue: '', shopeeCommission: '' });
        fetchUserSubData(activeUser.id);
        fetchUsers();
      } else {
        showToast('error', data.error);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setAddingOrder(false);
    }
  };

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold border transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Quản Lý Tài Khoản & Đơn Hàng User
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Xem link đã tạo, phân bổ đơn hàng tiếp thị, cập nhật tiến độ và tự động cộng hoa hồng vào ví User.
          </p>
        </div>

        <button 
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm Mới Danh Sách</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 glass-card p-4 flex items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Tìm theo tên, email, User ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Tổng Thành Viên</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{users.length} User</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Tổng Số Dư Khả Dụng</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {formatVnd(users.reduce((sum, u) => sum + (Number(u.balance) || 0), 0))}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-5">Thành Viên</th>
                <th className="py-4 px-4 text-center">Vai Trò</th>
                <th className="py-4 px-4 text-right text-emerald-700">Số Dư Khả Dụng</th>
                <th className="py-4 px-4 text-right text-amber-600">Chờ Duyệt</th>
                <th className="py-4 px-4 text-right text-blue-700">Đã Rút</th>
                <th className="py-4 px-4">Ngân Hàng Thụ Hưởng</th>
                <th className="py-4 px-5 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {u.name || 'Chưa cập nhật tên'}
                          </div>
                          <div className="text-xs text-slate-500">{u.email || 'Không có email'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        u.role === 'ADMIN' 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {u.role}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-black text-emerald-600 text-sm">
                      {formatVnd(u.balance)}
                    </td>

                    <td className="py-4 px-4 text-right font-bold text-amber-600 text-sm">
                      {formatVnd(u.pending)}
                    </td>

                    <td className="py-4 px-4 text-right font-bold text-blue-700 text-sm">
                      {formatVnd(u.withdrawn)}
                    </td>

                    <td className="py-4 px-4">
                      {u.bankName && u.accountNumber ? (
                        <div className="text-xs">
                          <div className="font-bold text-slate-800">{u.bankName} • {u.accountNumber}</div>
                          <div className="text-slate-500 font-medium">{u.accountHolder || u.name}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Chưa liên kết</span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => openUserModal(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 hover:text-blue-800 transition-all border border-blue-200"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Quản Lý & Đơn Hàng</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Management Comprehensive Modal */}
      {activeUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md">
                  {activeUser.name ? activeUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    {activeUser.name || 'Người Dùng'}
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      {activeUser.role}
                    </span>
                  </h2>
                  <div className="text-xs text-slate-500 font-mono">
                    {activeUser.email} • ID: {activeUser.id}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setActiveUser(null)}
                className="w-9 h-9 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex border-b border-slate-200 bg-white px-6">
              <button
                onClick={() => setModalTab('wallet')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  modalTab === 'wallet' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Ví Tiền & Ngân Hàng</span>
              </button>

              <button
                onClick={() => setModalTab('orders')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  modalTab === 'orders' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Đơn Hàng & Tiến Độ ({userOrders.length})</span>
              </button>

              <button
                onClick={() => setModalTab('links')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  modalTab === 'links' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Link Đã Tạo ({userLinks.length})</span>
              </button>
            </div>

            {/* Modal Tab Body */}
            <div className="p-6">
              {/* TAB 1: WALLET & BANK ADJUSTMENT */}
              {modalTab === 'wallet' && (
                <form onSubmit={handleSaveWallet} className="space-y-6">
                  {/* Balance Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                      <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">
                        1. Số Dư Khả Dụng (Được rút)
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={walletForm.balance}
                          onChange={(e) => setWalletForm({ ...walletForm, balance: e.target.value })}
                          className="w-full text-lg font-black text-emerald-700 bg-white border border-emerald-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">VNĐ</span>
                      </div>
                      <div className="text-[11px] text-emerald-600 mt-1">Admin có thể nhập số dư trực tiếp cho User.</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                      <label className="block text-xs font-bold text-amber-800 uppercase mb-1">
                        2. Tiền Chờ Duyệt (Đơn chưa duyệt)
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={walletForm.pending}
                          onChange={(e) => setWalletForm({ ...walletForm, pending: e.target.value })}
                          className="w-full text-lg font-black text-amber-700 bg-white border border-amber-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600">VNĐ</span>
                      </div>
                      <div className="text-[11px] text-amber-600 mt-1">Tự động cộng vào Khả dụng khi đơn Hoàn thành.</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
                      <label className="block text-xs font-bold text-blue-800 uppercase mb-1">
                        3. Đã Nhận / Đã Rút
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={walletForm.withdrawn}
                          onChange={(e) => setWalletForm({ ...walletForm, withdrawn: e.target.value })}
                          className="w-full text-lg font-black text-blue-700 bg-white border border-blue-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600">VNĐ</span>
                      </div>
                      <div className="text-[11px] text-blue-600 mt-1">Tổng tiền hoa hồng User đã rút thành công.</div>
                    </div>
                  </div>

                  {/* Bank & Role Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Tên Ngân Hàng
                      </label>
                      <input 
                        type="text"
                        placeholder="VD: MBBank, Vietcombank, Techcombank..."
                        value={walletForm.bankName}
                        onChange={(e) => setWalletForm({ ...walletForm, bankName: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Số Tài Khoản Ngân Hàng
                      </label>
                      <input 
                        type="text"
                        placeholder="VD: 0987654321"
                        value={walletForm.accountNumber}
                        onChange={(e) => setWalletForm({ ...walletForm, accountNumber: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Tên Chủ Tài Khoản (In hoa không dấu)
                      </label>
                      <input 
                        type="text"
                        placeholder="VD: NGUYEN VAN A"
                        value={walletForm.accountHolder}
                        onChange={(e) => setWalletForm({ ...walletForm, accountHolder: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Vai Trò Hệ Thống
                      </label>
                      <select 
                        value={walletForm.role}
                        onChange={(e) => setWalletForm({ ...walletForm, role: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      >
                        <option value="USER">USER (Người dùng tiếp thị thông thường)</option>
                        <option value="ADMIN">ADMIN (Quản trị viên hệ thống LinkP)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveUser(null)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={savingWallet}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50"
                    >
                      {savingWallet ? 'Đang Lưu...' : '💾 Lưu Thay Đổi Số Dư'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: ORDERS & PROGRESS MANAGEMENT */}
              {modalTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Danh Sách Đơn Hàng & Tiến Độ Duyệt Hoàn Tiền
                      </h3>
                      <p className="text-xs text-slate-500">
                        Admin có thể cập nhật tiến độ đơn hàng. Khi chuyển sang <strong>Hoàn thành</strong>, hệ thống tự động cộng 80% hoa hồng vào ví User.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddOrderModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Thêm Đơn Cho User</span>
                    </button>
                  </div>

                  {/* Add Order Inline Modal */}
                  {showAddOrderModal && (
                    <form onSubmit={handleCreateOrderForUser} className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                      <div className="text-xs font-black text-blue-950 uppercase flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-blue-600" />
                        Khai Báo / Gán Đơn Hàng Mới Cho User {activeUser.name}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Mã đơn hàng Shopee *</label>
                          <input 
                            type="text"
                            placeholder="VD: 240815SHP9988"
                            value={newOrderForm.orderCode}
                            onChange={(e) => setNewOrderForm({ ...newOrderForm, orderCode: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                            required
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Tên sản phẩm *</label>
                          <input 
                            type="text"
                            placeholder="VD: Tai nghe Soundcore R50i"
                            value={newOrderForm.productName}
                            onChange={(e) => setNewOrderForm({ ...newOrderForm, productName: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                            required
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Giá trị đơn hàng (VNĐ) *</label>
                          <input 
                            type="number"
                            placeholder="VD: 500000"
                            value={newOrderForm.orderValue}
                            onChange={(e) => setNewOrderForm({ ...newOrderForm, orderValue: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddOrderModal(false)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={addingOrder}
                          className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                        >
                          {addingOrder ? 'Đang thêm...' : 'Tạo Đơn Hàng'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Orders Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-400 uppercase">
                          <th className="py-3 px-4">Mã Đơn</th>
                          <th className="py-3 px-3">Sản Phẩm</th>
                          <th className="py-3 px-3 text-right">Giá Trị Đơn</th>
                          <th className="py-3 px-3 text-right text-emerald-700">Hoàn Tiền (80%)</th>
                          <th className="py-3 px-3 text-center">Tiến Độ & Trạng Thái</th>
                          <th className="py-3 px-4 text-center">Hành Động Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {subLoading ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-400">
                              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-blue-500" />
                              Đang tải danh sách đơn hàng...
                            </td>
                          </tr>
                        ) : userOrders.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-400">
                              User này chưa có đơn hàng nào trong hệ thống.
                            </td>
                          </tr>
                        ) : (
                          userOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-50/80">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                #{ord.orderCode}
                              </td>

                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-800 truncate max-w-[200px]">{ord.productName}</div>
                                <div className="text-[10px] text-slate-400">{ord.shopName}</div>
                              </td>

                              <td className="py-3 px-3 text-right font-bold text-slate-700">
                                {formatVnd(ord.orderValue)}
                              </td>

                              <td className="py-3 px-3 text-right font-black text-emerald-600 text-sm">
                                +{formatVnd(ord.userCashback)}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  ord.status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ord.status === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {ord.status === 'APPROVED' ? '✓ Đã Hoàn Thành' : ord.status === 'REJECTED' ? '✕ Đã Hủy' : '⏳ Chờ Duyệt'}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {ord.status !== 'APPROVED' && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(ord.id, 'APPROVED')}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 shadow-sm"
                                      title="Duyệt hoàn thành và cộng tiền vào ví"
                                    >
                                      ✓ Hoàn thành (Cộng ví)
                                    </button>
                                  )}
                                  {ord.status !== 'REJECTED' && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(ord.id, 'REJECTED')}
                                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold hover:bg-rose-100 border border-rose-200"
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
              )}

              {/* TAB 3: CREATED LINKS */}
              {modalTab === 'links' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Các Liên Kết Tiếp Thị Đã Tạo Bởi User
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tổng hợp toàn bộ link Shopee affiliate rút gọn mà User này đã tạo qua Mobile App hoặc Web.
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-400 uppercase">
                          <th className="py-3 px-4">Sản Phẩm</th>
                          <th className="py-3 px-3">Link Tiếp Thị</th>
                          <th className="py-3 px-3 text-right">Giá Bán</th>
                          <th className="py-3 px-3 text-right text-emerald-700">Hoa Hồng User (80%)</th>
                          <th className="py-3 px-4 text-center">Thời Gian Tạo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {subLoading ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-slate-400">
                              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-blue-500" />
                              Đang tải danh sách link...
                            </td>
                          </tr>
                        ) : userLinks.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-slate-400">
                              User này chưa tạo link tiếp thị nào.
                            </td>
                          </tr>
                        ) : (
                          userLinks.map((lnk) => (
                            <tr key={lnk.id} className="hover:bg-slate-50/80">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900 truncate max-w-[220px]">
                                  {lnk.productName}
                                </div>
                                <div className="text-[10px] text-slate-400">{lnk.shopName}</div>
                              </td>

                              <td className="py-3 px-3">
                                <a 
                                  href={lnk.affiliateUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-blue-600 hover:underline font-mono flex items-center gap-1 font-bold"
                                >
                                  <span>{lnk.affiliateUrl}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </td>

                              <td className="py-3 px-3 text-right font-bold text-slate-700">
                                {formatVnd(lnk.price)}
                              </td>

                              <td className="py-3 px-3 text-right font-black text-emerald-600">
                                +{formatVnd(lnk.userCommission)}
                              </td>

                              <td className="py-3 px-4 text-center text-[11px] text-slate-500">
                                {new Date(lnk.createdAt).toLocaleDateString('vi-VN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
