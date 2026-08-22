'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Command, 
  X, 
  Wallet, 
  Users, 
  ShoppingBag, 
  Receipt, 
  Ticket, 
  ArrowRight,
  ExternalLink,
  Zap,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function CommandPalette({ isOpen, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ withdrawals: [], users: [], orders: [] });
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ withdrawals: [], users: [], orders: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or trigger toggle
          const btn = document.getElementById('cmd-palette-trigger');
          if (btn) btn.click();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ withdrawals: [], users: [], orders: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const q = query.toLowerCase().trim();
        const [wRes, uRes] = await Promise.all([
          fetch('/api/withdrawals').then(r => r.json()).catch(() => ({ withdrawals: [] })),
          fetch('/api/users').then(r => r.json()).catch(() => ({ users: [] }))
        ]);

        const filteredWithdrawals = (wRes.withdrawals || []).filter(w => 
          (w.account_number && w.account_number.toLowerCase().includes(q)) ||
          (w.account_holder && w.account_holder.toLowerCase().includes(q)) ||
          (w.bank_name && w.bank_name.toLowerCase().includes(q)) ||
          (w.id && w.id.toLowerCase().includes(q)) ||
          (w.ft_code && w.ft_code.toLowerCase().includes(q))
        ).slice(0, 4);

        const filteredUsers = (uRes.users || []).filter(u => 
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.display_name && u.display_name.toLowerCase().includes(q)) ||
          (u.id && u.id.toLowerCase().includes(q))
        ).slice(0, 4);

        setResults({
          withdrawals: filteredWithdrawals,
          users: filteredUsers,
          orders: []
        });
      } catch (err) {
        console.error('Command palette search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const navigateTo = (path) => {
    onClose();
    router.push(path);
  };

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-100 px-4 py-3.5 flex items-center gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm theo Tên, Email, STK ngân hàng, Mã FT VietQR hoặc Đơn hàng..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-white text-[11px] font-bold text-slate-500 border border-slate-200 shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-3 space-y-4 max-h-[60vh]">
          {/* Default Navigation Shortcuts when empty */}
          {!query.trim() && (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Lối tắt điều hướng nhanh
              </div>
              {[
                { label: 'Quản lý đơn rút tiền (VietQR)', path: '/withdrawals', icon: Wallet, color: 'text-blue-600 bg-blue-50' },
                { label: 'Quản lý người dùng & Số dư', path: '/users', icon: Users, color: 'text-indigo-600 bg-indigo-50' },
                { label: 'Quản lý đơn hàng Shopee', path: '/orders', icon: ShoppingBag, color: 'text-amber-600 bg-amber-50' },
                { label: 'Báo cáo thuế & VAT', path: '/tax-report', icon: Receipt, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Kho mã giảm giá Shopee', path: '/vouchers', icon: Ticket, color: 'text-purple-600 bg-purple-50' },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => navigateTo(item.path)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-900">
                        {item.label}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Search Results */}
          {query.trim() && (
            <>
              {loading && (
                <div className="py-8 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                  <span>Đang tìm kiếm trên hệ thống...</span>
                </div>
              )}

              {!loading && results.withdrawals.length === 0 && results.users.length === 0 && (
                <div className="py-10 text-center space-y-2">
                  <Search className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Không tìm thấy kết quả phù hợp với "{query}"</p>
                  <p className="text-[11px] text-slate-400">Thử tìm theo Tên, Email, STK ngân hàng hoặc Mã FT VietQR khác</p>
                </div>
              )}

              {/* Withdrawals Results */}
              {!loading && results.withdrawals.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lệnh rút tiền VietQR ({results.withdrawals.length})</span>
                  </div>
                  {results.withdrawals.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => navigateTo(`/withdrawals?search=${encodeURIComponent(w.account_number || w.id)}`)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200 text-left transition-all group bg-white"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 font-heading">
                            {w.account_holder || 'Chưa cập nhật tên'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {w.bank_name || 'Ngân hàng'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          STK: <strong>{w.account_number}</strong> · Số tiền: <strong className="text-emerald-600 font-bold">{formatVnd(w.amount)}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          w.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                          {w.status === 'COMPLETED' ? 'Đã duyệt' : 'Chờ VietQR'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Users Results */}
              {!loading && results.users.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Người dùng & Ví ({results.users.length})</span>
                  </div>
                  {results.users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => navigateTo(`/users?search=${encodeURIComponent(u.email || u.id)}`)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50/60 border border-slate-100 hover:border-indigo-200 text-left transition-all group bg-white"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-900">
                          {u.display_name || u.email}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {u.email}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-500" />
            <span>LinkP SaaS Quick Search Command</span>
          </div>
          <span>Bấm ESC để đóng</span>
        </div>
      </div>
    </div>
  );
}
