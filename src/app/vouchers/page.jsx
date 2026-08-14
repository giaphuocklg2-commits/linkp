'use client';

import { useState, useEffect } from 'react';
import { Ticket, Plus, Search, Tag, ExternalLink, Check, Copy, Trash2, RefreshCw } from 'lucide-react';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVoucher, setNewVoucher] = useState({ code: '', shop: 'Shopee', scope: 'Toàn sàn', discount: '', minOrder: '', expiry: '31/12/2026', link: 'https://shopee.vn' });
  const [submitting, setSubmitting] = useState(false);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vouchers');
      const data = await res.json();
      if (data.success) {
        setVouchers(data.vouchers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newVoucher.code || !newVoucher.discount) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVoucher)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewVoucher({ code: '', shop: 'Shopee', scope: 'Toàn sàn', discount: '', minOrder: '', expiry: '31/12/2026', link: 'https://shopee.vn' });
        fetchVouchers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa mã giảm giá này khỏi Database?')) return;
    try {
      const res = await fetch(`/api/vouchers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchVouchers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = vouchers.filter(v => 
    (v.code + ' ' + v.shop + ' ' + v.scope + ' ' + v.discount).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket className="w-7 h-7 text-amber-500" />
            Kho Mã Giảm Giá & Voucher Săn Sale
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý và đồng bộ trực tiếp với Database Supabase - hiển thị tức thì trên ứng dụng LinkP di động.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={fetchVouchers}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Mã Mới</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm mã giảm giá, ngành hàng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">Tổng số: <strong>{filtered.length}</strong> mã</div>
      </div>

      {/* Vouchers Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 glass-card">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          Đang tải kho mã giảm giá từ Database...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 glass-card">
          Không có mã giảm giá nào trong Database. Bấm "Thêm Mã Mới" để tạo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((v) => (
            <div key={v.id || v.code} className="glass-card p-5 space-y-3 relative overflow-hidden border-slate-200 hover:border-blue-400 transition-all group">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  v.shop === 'Shopee' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {v.shop} • {v.scope}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">HSD: {v.expiry}</span>
                  <button onClick={() => handleDelete(v.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <div className="text-base font-bold text-slate-900">{v.discount}</div>
                <div className="text-xs text-slate-500 mt-0.5">{v.minOrder}</div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                  {v.code}
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Đang hoạt động
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900">Thêm Mã Giảm Giá Mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mã Voucher (Code):</label>
                <input
                  type="text"
                  required
                  placeholder="VD: SHOPEE50K"
                  value={newVoucher.code}
                  onChange={e => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sàn TMĐT:</label>
                  <select
                    value={newVoucher.shop}
                    onChange={e => setNewVoucher({ ...newVoucher, shop: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
                    <option>Shopee</option>
                    <option>Tiki</option>
                    <option>Lazada</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phạm vi:</label>
                  <input
                    type="text"
                    value={newVoucher.scope}
                    onChange={e => setNewVoucher({ ...newVoucher, scope: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mức giảm:</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Giảm 20% tối đa 100K"
                  value={newVoucher.discount}
                  onChange={e => setNewVoucher({ ...newVoucher, discount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Điều kiện áp dụng:</label>
                <input
                  type="text"
                  placeholder="VD: Đơn từ 250K"
                  value={newVoucher.minOrder}
                  onChange={e => setNewVoucher({ ...newVoucher, minOrder: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Hạn sử dụng:</label>
                <input
                  type="text"
                  placeholder="VD: 31/12/2026 hoặc 23:59 hôm nay"
                  value={newVoucher.expiry}
                  onChange={e => setNewVoucher({ ...newVoucher, expiry: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md"
                >
                  {submitting ? 'Đang lưu vào DB...' : 'Lưu & Xuất bản lên App'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
