'use client';

import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Megaphone, Zap, Sparkles, RefreshCw, CheckCircle } from 'lucide-react';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: '', content: '', type: 'PROMOTION' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newAnn.title || !newAnn.content) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAnn)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewAnn({ title: '', content: '', type: 'PROMOTION' });
        fetchAnnouncements();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa thông báo này khỏi Database?')) return;
    try {
      const res = await fetch(`/api/announcements?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchAnnouncements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-blue-600" />
            Thông Báo Hệ Thống & Banner Khuyến Mãi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gửi thông báo đẩy và hiển thị banner sự kiện Flash Sale trên ứng dụng LinkP.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={fetchAnnouncements}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Thông Báo Mới</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 glass-card">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          Đang tải thông báo từ Database...
        </div>
      ) : announcements.length === 0 ? (
        <div className="p-12 text-center text-slate-400 glass-card">
          Chưa có thông báo nào trong Database. Bấm "Tạo Thông Báo Mới" để thêm.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <div key={item.id} className="glass-card p-5 flex items-start justify-between gap-4 hover:border-blue-300 transition-all">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  item.type === 'PROMOTION' ? 'bg-orange-100 text-orange-600' :
                  item.type === 'PAYMENT' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {item.type === 'PROMOTION' ? <Sparkles className="w-5 h-5" /> :
                   item.type === 'PAYMENT' ? <Zap className="w-5 h-5" /> :
                   <Megaphone className="w-5 h-5" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">{item.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.type === 'PROMOTION' ? 'bg-orange-50 text-orange-600' :
                      item.type === 'PAYMENT' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.content}</p>
                  <div className="text-[11px] text-slate-400 font-medium pt-1">
                    Ngày đăng: {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleDelete(item.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Xóa thông báo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900">Tạo Thông Báo Mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Loại thông báo:</label>
                <select
                  value={newAnn.type}
                  onChange={e => setNewAnn({ ...newAnn, type: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                >
                  <option value="PROMOTION">Khuyến Mãi (PROMOTION)</option>
                  <option value="SYSTEM">Hệ Thống (SYSTEM)</option>
                  <option value="PAYMENT">Thanh Toán (PAYMENT)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề thông báo:</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 🎉 Siêu Sale Shopee 9.9"
                  value={newAnn.title}
                  onChange={e => setNewAnn({ ...newAnn, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nội dung chi tiết:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Nhập nội dung thông báo gửi tới người dùng ứng dụng..."
                  value={newAnn.content}
                  onChange={e => setNewAnn({ ...newAnn, content: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md"
                >
                  {submitting ? 'Đang lưu vào DB...' : 'Xuất bản Thông Báo'}
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
