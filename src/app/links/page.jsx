'use client';

import { useState, useEffect } from 'react';
import { Link2, Search, ExternalLink, Copy, Check, Filter, Trash2, RefreshCw } from 'lucide-react';

export default function LinksPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subIdFilter, setSubIdFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/links');
      const data = await res.json();
      if (data.success) {
        setLinks(data.links);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa link này?')) return;
    try {
      const res = await fetch(`/api/links?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchLinks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = links.filter(l => {
    const matchSearch = (l.productName + ' ' + l.affiliateUrl + ' ' + l.subId).toLowerCase().includes(search.toLowerCase());
    const matchSubId = subIdFilter === 'ALL' || l.subId === subIdFilter;
    return matchSearch && matchSubId;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Link2 className="w-7 h-7 text-blue-600" />
            Liên Kết Tiếp Thị & Bám Đuôi Sub-ID
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tất cả link affiliate tạo từ mobile app và hệ thống web, bóc tách nguồn chuyển đổi Sub-ID.
          </p>
        </div>

        <button 
          onClick={fetchLinks}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm Mới Danh Sách</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm, Sub-ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="text-xs text-slate-500 font-medium">Lọc nguồn Sub-ID:</div>
          <select
            value={subIdFilter}
            onChange={e => setSubIdFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả Sub-ID</option>
            <option value="tiktok">TikTok (tiktok)</option>
            <option value="fb_group">Facebook Group (fb_group)</option>
            <option value="zalo">Zalo (zalo)</option>
            <option value="app_direct">App Direct (app_direct)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Sản phẩm / Link</th>
                <th className="px-6 py-4">Giá gốc</th>
                <th className="px-6 py-4">Hoa hồng dự kiến</th>
                <th className="px-6 py-4">Sub-ID Nguồn</th>
                <th className="px-6 py-4">Thời gian tạo</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải liên kết từ Database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    Chưa có liên kết nào được tạo trong Database.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-extrabold text-slate-900 line-clamp-1">{l.productName || 'Sản phẩm Shopee'}</div>
                      <div className="text-[11px] text-blue-600 font-mono line-clamp-1 mt-0.5">{l.affiliateUrl}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {Number(l.price).toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        +{Number(l.userCommission || Math.round(l.commission * 0.8)).toLocaleString('vi-VN')}đ
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 uppercase font-mono">
                        {l.subId || 'direct'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-[11px]">
                      {new Date(l.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => copyToClipboard(l.affiliateUrl, l.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Sao chép link"
                        >
                          {copiedId === l.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a
                          href={l.affiliateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Mở liên kết"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Xóa link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
