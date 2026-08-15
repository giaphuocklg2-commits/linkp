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
  Gift
  ,Settings, Activity
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Tổng quan Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Quản lý đơn hàng', icon: ShoppingBag, badge: 'Duyệt HH' },
  { href: '/withdrawals', label: 'Quản lý đơn rút tiền', icon: Wallet, badge: 'VietQR' },
  { href: '/users', label: 'Quản lý người dùng', icon: Users, badge: 'Sửa số dư' },
  { href: '/referrals', label: 'Quản lý mã giới thiệu', icon: Gift, badge: '5% HH' },
  { href: '/tax-report', label: 'Báo cáo hoa hồng & VAT', icon: Receipt },
  { href: '/links', label: 'Liên kết & Sub-ID', icon: Link2 },
  { href: '/vouchers', label: 'Kho mã giảm giá', icon: Ticket },
  { href: '/announcements', label: 'Thông báo & Deal hot', icon: Bell },
  { href: '/remote-config', label: 'Remote config ứng dụng', icon: Settings },
  { href: '/system-status', label: 'Trạng thái & đối soát', icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-md border-r border-slate-200/80 min-h-screen flex flex-col justify-between p-4 fixed left-0 top-0 bottom-0 z-30 shadow-sm">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-4 mb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
              LinkP Admin
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">v2.0</span>
            </div>
            <div className="text-xs text-slate-400">Shopee Affiliate & Payout</div>
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
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && !isActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">Tỷ lệ hoàn tiền</span>
          <span className="text-xs font-bold text-emerald-400">80% User / 20% Admin</span>
        </div>
        <div className="text-[11px] text-slate-400 leading-relaxed">
          Đơn mua ở trạng thái <strong>Chờ duyệt</strong> cho tới khi Admin xác nhận thành công.
        </div>
        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Supabase DB Connected</span>
        </div>
      </div>
    </aside>
  );
}
