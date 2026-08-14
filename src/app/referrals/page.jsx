'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Gift, 
  TrendingUp, 
  Share2, 
  CheckCircle2, 
  Copy, 
  Percent, 
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({
    totalReferrers: 0,
    totalInvitedUsers: 0,
    totalReferralBonusPaid: 0,
    referralCommissionRate: '5%',
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/referrals?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setReferrals(data.referrals);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [search]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Gift className="w-7 h-7 text-blue-600" />
            Quản Lý Mã Giới Thiệu & Hoa Hồng 5%
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi mạng lưới tiếp thị giới thiệu bạn bè, mã mời cá nhân và đối soát hoa hồng 5% tự động.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Người giới thiệu tích cực</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalReferrers}</div>
          <div className="text-xs text-blue-600 mt-1 font-medium">Người dùng có bạn bè đăng ký</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Tổng người được mời</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalInvitedUsers}</div>
          <div className="text-xs text-emerald-600 mt-1 font-medium">Đã kích hoạt mã mời</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Hoa hồng 5% đã ghi nhận</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats.totalReferralBonusPaid.toLocaleString('vi-VN')}đ
          </div>
          <div className="text-xs text-indigo-600 mt-1 font-medium">Cộng vào ví người giới thiệu</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Tỷ lệ chia sẻ hoa hồng</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.referralCommissionRate}</div>
          <div className="text-xs text-amber-600 mt-1 font-medium">Theo chính sách hiện hành</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, email, mã mời (LP...), hoặc mã người giới thiệu..."
          className="w-full text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
        />
      </div>

      {/* Table of Referrals */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">Danh Sách Mã Giới Thiệu Người Dùng</h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {referrals.length} thành viên
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Người dùng</th>
                <th className="py-3.5 px-4">Mã giới thiệu (LP)</th>
                <th className="py-3.5 px-4">Được giới thiệu bởi</th>
                <th className="py-3.5 px-4 text-center">Số bạn bè đã mời</th>
                <th className="py-3.5 px-4 text-right">Hoa hồng 5% nhận được</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    Đang tải danh sách mạng lưới giới thiệu...
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    Chưa tìm thấy dữ liệu mã giới thiệu nào.
                  </td>
                </tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.userId} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{r.userName}</div>
                      <div className="text-xs text-slate-400">{r.email || r.userId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                          {r.inviteCode}
                        </span>
                        <button
                          onClick={() => copyToClipboard(r.inviteCode)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 transition"
                          title="Sao chép mã"
                        >
                          {copiedCode === r.inviteCode ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {r.referredBy ? (
                        <span className="font-mono text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                          {r.referredBy}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Tự đăng ký</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                        {r.totalInvited} bạn bè
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-blue-600">
                      +{r.totalReferralBonus.toLocaleString('vi-VN')}đ
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
