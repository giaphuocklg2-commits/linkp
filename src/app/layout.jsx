import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'LinkP Admin Portal - Quản trị Hoa hồng & Rút tiền Shopee',
  description: 'Hệ thống quản lý chuyển đổi link tiếp thị, ví hoa hồng, duyệt đơn rút tiền VietQR và thống kê thuế VAT 10%.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="bg-slate-50 min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
