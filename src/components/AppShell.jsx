'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isOAuthPage = pathname.startsWith('/oauth/');

  if (isOAuthPage) return children;

  return (
    <>
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Navbar />
        <main className="pt-20 pb-12 px-8 flex-1">{children}</main>
      </div>
    </>
  );
}
