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
  ShieldCheck,
  TrendingUp,
  Users,
  Gift,
  Settings, 
  Activity,
  Zap
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Tổng quan Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Quản lý đơn hàng', icon: ShoppingBag, badge: 'Duyệt HH' },
  { href: '/withdrawals', label: 'Quản lý đơn rút tiền', icon: Wallet, badge: 'VietQR', highlight: true },
  { href: '/users', label: 'Quản lý người dùng', icon: Users, badge: 'Ví & Rank' },
  { href: '/referrals', label: 'Quản lý giới thiệu', icon: Gift, badge: '5% F1' },
  { href: '/tax-report', label: 'Báo cáo thuế & VAT', icon: Receipt },
  { href: '/links', label: 'Liên kết & Sub-ID', icon: Link2 },
  { href: '/vouchers', label: 'Kho mã giảm giá', icon: Ticket },
  { href: '/announcements', label: 'Thông báo & Banner', icon: Bell },
  { href: '/remote-config', label: 'Cấu hình ứng dụng', icon: Settings },
  { href: '/system-status', label: 'Trạng thái & Đối soát', icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200/80 min-h-screen flex flex-col justify-between p-4 fixed left-0 top-0 bottom-0 z-30 shadow-sm">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3.5 mb-3 border-b border-slate-100">
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

        {/* Navigation Items */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
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
        </nav>
      </div>

      {/* Bottom Status Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white shadow-xl space-y-2 border border-slate-800">
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
