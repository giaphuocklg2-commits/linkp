'use client';

import { useState, useEffect } from 'react';
import { 
  Receipt, 
  FileText, 
  Download, 
  Coins, 
  Percent, 
  TrendingUp, 
  ShieldCheck, 
  Info,
  Calendar,
  RefreshCw
} from 'lucide-react';

export default function TaxReportPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => {
        if (d.success) setStats(d.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const s = stats || {
    totalShopeeCommission: 0,
    totalUserCommission: 0,
    totalAdminCommission: 0,
    vatTax: 0,
    adminNetProfit: 0,
    totalGmv: 0,
    totalLinks: 0,
    monthlyReport: []
  };

  const monthlyReport = s.monthlyReport || [];

  const exportCsv = () => {
    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['BÁO CÁO HOA HỒNG VÀ THUẾ LINKP'],
      ['Ngày xuất', new Date().toLocaleString('vi-VN')],
      [],
      ['TỔNG HỢP'],
      ['Chỉ tiêu', 'Số tiền (VND)'],
      ['Tổng GMV', Number(s.totalGmv) || 0],
      ['Tổng hoa hồng từ sàn', Number(s.totalShopeeCommission) || 0],
      ['Chi trả người dùng', Number(s.totalUserCommission) || 0],
      ['Doanh thu Admin', Number(s.totalAdminCommission) || 0],
      ['Thuế VAT 10%', Number(s.vatTax) || 0],
      ['Lợi nhuận ròng Admin', Number(s.adminNetProfit) || 0],
      [],
      ['CHI TIẾT THEO KỲ'],
      ['Kỳ tính thuế', 'Tổng GMV', 'HH từ sàn', 'Trả User', 'Doanh thu Admin', 'VAT 10%', 'Lợi nhuận ròng'],
      ...monthlyReport.map(m => [m.month, Number(m.gmv)||0, Number(m.totalComm)||0, Number(m.userShare)||0, Number(m.adminGross)||0, Number(m.vat)||0, Number(m.adminNet)||0])
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url; link.download = `linkp_tax_report_${date}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Báo Cáo Hoa Hồng & Khấu Trừ Thuế VAT 10%
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bảng kê chi tiết phân bổ hoa hồng tiếp thị Shopee thực tế từ Database, hoàn lại cho người dùng (80%) và nghĩa vụ thuế GTGT (10%).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>
          <button 
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Báo Cáo CSV</span>
          </button>
        </div>
      </div>

      {/* Tax Legal & Formula Notice */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <strong>Nguyên tắc hạch toán tài chính LinkP:</strong> Tổng hoa hồng nhận từ Shopee được phân bổ 
          <strong> 80%</strong> hoàn lại cho người dùng, <strong>20%</strong> là doanh thu phí dịch vụ quản trị. 
          Thuế Giá trị gia tăng (VAT 10%) được tính trên phần doanh thu quản trị: <code>VAT = 10% × DoanhThuAdmin</code>. 
          Lợi nhuận ròng sau thuế: <code>Lợi nhuận ròng = DoanhThuAdmin - VAT</code>.
        </div>
      </div>

      {/* Financial Summary Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>1. Doanh thu tổng từ Shopee</span>
            <Coins className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{formatVnd(s.totalShopeeCommission)}</div>
          <div className="text-xs text-slate-500">Tương ứng GMV bán lẻ: {formatVnd(s.totalGmv)}</div>
        </div>

        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>2. Chi trả cho User (80%)</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{formatVnd(s.totalUserCommission)}</div>
          <div className="text-xs text-emerald-700">Tỷ lệ hoàn tiền trực tiếp vào ví</div>
        </div>

        <div className="glass-card p-5 space-y-3 border-indigo-200 bg-indigo-50/30">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>3. Doanh thu Admin (20%)</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{formatVnd(s.totalAdminCommission)}</div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200">
            <span>Thuế VAT 10% khấu trừ:</span>
            <span className="font-bold text-red-600">-{formatVnd(s.vatTax)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
            <span>Lợi nhuận ròng Admin:</span>
            <span className="text-blue-700">{formatVnd(s.adminNetProfit)}</span>
          </div>
        </div>
      </div>

      {/* Monthly Tax Ledger Table */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Sổ Cái Khấu Trừ Thuế Theo Tháng (Dữ Liệu Thực)
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">
            Tổng cộng {monthlyReport.length} kỳ quyết toán
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Kỳ tính thuế</th>
                <th className="py-3.5 px-4 text-right">Tổng GMV bán lẻ</th>
                <th className="py-3.5 px-4 text-right">HH Shopee (100%)</th>
                <th className="py-3.5 px-4 text-right text-emerald-700">Trả User (80%)</th>
                <th className="py-3.5 px-4 text-right text-indigo-700">Doanh thu gộp (20%)</th>
                <th className="py-3.5 px-4 text-right text-red-600">Thuế VAT 10%</th>
                <th className="py-3.5 px-4 text-right text-blue-700">Lợi nhuận ròng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Đang tổng hợp báo cáo thuế từ cơ sở dữ liệu...
                  </td>
                </tr>
              ) : monthlyReport.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Chưa có dữ liệu đơn hàng đã duyệt trong cơ sở dữ liệu để kết xuất sổ cái thuế.
                  </td>
                </tr>
              ) : (
                monthlyReport.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors font-medium">
                    <td className="py-4 px-4 font-bold text-slate-900">{m.month}</td>
                    <td className="py-4 px-4 text-right text-slate-600">{formatVnd(m.gmv)}</td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900">{formatVnd(m.totalComm)}</td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-600">{formatVnd(m.userShare)}</td>
                    <td className="py-4 px-4 text-right font-bold text-indigo-600">{formatVnd(m.adminGross)}</td>
                    <td className="py-4 px-4 text-right font-bold text-red-600">-{formatVnd(m.vat)}</td>
                    <td className="py-4 px-4 text-right font-black text-blue-700 text-base">{formatVnd(m.adminNet)}</td>
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
