'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag,
  Wallet, 
  Receipt, 
  Link2, 
  Ticket, 
  Bell, 
  Sparkles,
  Users,
  Gift,
  Settings, 
  Activity,
  Search,
  Command,
  ChevronRight
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'TỔNG QUAN',
    items: [
      { href: '/', label: 'Dashboard tổng quan', icon: LayoutDashboard },
      { href: '/tax-report', label: 'Báo cáo Thuế & VAT', icon: Receipt },
    ]
  },
  {
    title: 'TÀI CHÍNH & USER',
    items: [
      { href: '/withdrawals', label: 'Đơn rút tiền VietQR', icon: Wallet, badge: 'VietQR', highlight: true },
      { href: '/users', label: 'Người dùng & Ví tiền', icon: Users, badge: 'Ví & Rank' },
      { href: '/referrals', label: 'Giới thiệu & F1', icon: Gift, badge: '5% F1' },
    ]
  },
  {
    title: 'SHOPEE AFFILIATE',
    items: [
      { href: '/orders', label: 'Quản lý đơn hàng', icon: ShoppingBag, badge: 'Duyệt HH' },
      { href: '/links', label: 'Liên kết & Sub-ID', icon: Link2 },
      { href: '/vouchers', label: 'Kho mã giảm giá', icon: Ticket },
    ]
  },
  {
    title: 'CẤU HÌNH & HỆ THỐNG',
    items: [
      { href: '/announcements', label: 'Thông báo & Banner', icon: Bell },
      { href: '/remote-config', label: 'Remote Config', icon: Settings },
      { href: '/system-status', label: 'Trạng thái hệ thống', icon: Activity },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleOpenSearch = () => {
    const btn = document.getElementById('cmd-palette-trigger');
    if (btn) btn.click();
  };

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200/80 min-h-screen flex flex-col justify-between p-4 fixed left-0 top-0 bottom-0 z-30 shadow-sm overflow-y-auto">
      <div className="flex flex-col space-y-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-2 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-1.5 font-heading">
              LinkP Admin
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60">
                PRO
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-400">Shopee Affiliate & Payout</div>
          </div>
        </div>

        {/* Quick Search Bar (Command K Trigger) */}
        <button
          onClick={handleOpenSearch}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-100 text-slate-500 border border-slate-200/60 transition-all text-xs font-medium group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span>Tìm nhanh...</span>
          </div>
          <kbd className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Categorized Navigation Groups */}
        <nav className="space-y-4 pt-1">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 relative ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && !isActive && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.highlight 
                          ? 'bg-amber-50 text-amber-700 border-amber-200/80 animate-pulse'
                          : 'bg-slate-100 text-slate-600 border-slate-200/60'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Status Card */}
      <div className="mt-6 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white shadow-xl space-y-2 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400">Tỷ lệ hoàn tiền</span>
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
            80% User / 20% Admin
          </span>
        </div>
        <div className="text-[11px] text-slate-300 leading-relaxed font-sans">
          Đơn mua tự động đối soát & tích lũy hoàn tiền tức thì.
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-emerald-400 font-medium">VietQR Napas247</span>
          </div>
          <span className="text-slate-400">v2.0.0</span>
        </div>
      </div>
    </aside>
  );
}
