'use client';

import { Bell, Search, RefreshCw, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' - ' + now.toLocaleDateString('vi-VN'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 fixed top-0 right-0 left-64 z-20 px-8 flex items-center justify-between">
      {/* Search & Clock */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 text-xs text-slate-600 font-medium border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Thời gian hệ thống: {time || 'Đang tải...'}</span>
        </div>
      </div>

      {/* Quick Actions & Admin Profile */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-xs font-semibold text-blue-700">
          <Zap className="w-3.5 h-3.5 text-blue-600" />
          <span>VietQR Napas247: Active</span>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            AD
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-900">Quản trị viên LinkP</div>
            <div className="text-[10px] text-slate-400">admin@linkp.vn</div>
          </div>
        </div>
      </div>
    </header>
  );
}
