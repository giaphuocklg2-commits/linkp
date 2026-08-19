'use client';

import { Bell, Search, RefreshCw, Zap, ShieldCheck, Database, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const [time, setTime] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' - ' + now.toLocaleDateString('vi-VN'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const handleLogout = async () => {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất khỏi trang quản trị?')) return;
    setIsLoggingOut(true);
    try {
      await fetch('/api/logout', { method: 'POST' });
      document.cookie = 'lp_app_admin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      router.replace('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
      window.location.href = '/login';
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 fixed top-0 right-0 left-64 z-20 px-8 flex items-center justify-between">
      {/* System Status & Time Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100/90 text-xs text-slate-700 font-medium border border-slate-200/80 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
          <span>Thời gian hệ thống: <strong className="font-semibold text-slate-900">{time || 'Đang đồng bộ...'}</strong></span>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/70">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Supabase Realtime: Sẵn sàng</span>
        </div>
      </div>

      {/* Quick Actions & Admin Profile */}
      <div className="flex items-center gap-4">
        {/* VietQR Active Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 text-xs font-bold text-blue-700 shadow-sm">
          <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-500" />
          <span>VietQR Napas247: Active</span>
        </div>

        {/* Reload Button */}
        <button 
          onClick={handleRefresh}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200 active:scale-95"
          title="Làm mới dữ liệu toàn hệ thống"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {/* Admin Profile & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-black flex items-center justify-center text-xs shadow-md shadow-blue-500/20 ring-2 ring-white">
            GP
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-extrabold text-slate-900 tracking-tight">Gia Phước (Super Admin)</div>
            <div className="text-[10px] font-medium text-slate-400">giaphuocklg@gmail.com</div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-2 ml-1 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors active:scale-95"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
