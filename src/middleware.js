import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { verifyAppAdminToken } from '@/lib/appAdminSession';

const URL = 'https://vrsaihfqfgmvrtxtyxpf.supabase.co';
const KEY = 'sb_publishable_LilLYEE6WbODOuiskuRTcQ_ZhpKrZRc';
const publicPaths = ['/login', '/oauth', '/api/app', '/app-sso', '/api/login', '/api/logout'];
const permissions = {
  SUPPORT: ['/', '/api/stats', '/users', '/api/users', '/orders', '/api/orders'],
  FINANCE: ['/', '/api/stats', '/orders', '/api/orders', '/withdrawals', '/api/withdrawals', '/tax-report'],
  ADMIN: ['/', '/api/stats', '/orders', '/api/orders', '/withdrawals', '/api/withdrawals', '/users', '/api/users', '/referrals', '/api/referrals', '/tax-report', '/links', '/api/links', '/vouchers', '/api/vouchers', '/announcements', '/api/announcements', '/remote-config', '/system-status'],
};

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  // 1. Allow public paths & assets
  if (publicPaths.some(p => path === p || path.startsWith(p + '/') || path.startsWith(p + '?')) || path.startsWith('/_next') || path === '/favicon.ico') {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  // 2. Check Admin Session Token (Cookie lp_app_admin)
  const appAdminCookie = request.cookies.get('lp_app_admin')?.value;
  const appSession = await verifyAppAdminToken(appAdminCookie);

  if (appSession) {
    // Master Super Admin or explicitly giaphuocklg@gmail.com
    if (appSession.email === 'giaphuocklg@gmail.com' || appSession.role === 'SUPER_ADMIN' || appSession.role === 'ADMIN') {
      return response;
    }

    // Role-based check
    const role = appSession.role || 'USER';
    const isApi = path.startsWith('/api/');

    if (role === 'SUPPORT' && request.method !== 'GET') {
      return isApi 
        ? NextResponse.json({ success: false, error: 'SUPPORT chỉ có quyền xem' }, { status: 403 }) 
        : NextResponse.redirect(new URL('/login?error=403', request.url));
    }

    const allowed = (permissions[role] || []).some(p => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'));
    if (allowed) return response;

    return isApi 
      ? NextResponse.json({ success: false, error: 'Không có quyền thực hiện thao tác này' }, { status: 403 }) 
      : NextResponse.redirect(new URL('/login?error=403', request.url));
  }

  // 3. Fallback to Supabase User Session
  const supabase = createServerClient(URL, KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    }
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Check user role for Supabase user
  if (user.email === 'giaphuocklg@gmail.com') {
    return response;
  }

  const roleRes = await fetch(`${URL}/rest/v1/User?email=eq.${encodeURIComponent(user.email)}&select=role&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    cache: 'no-store'
  });
  const rows = roleRes.ok ? await roleRes.json() : [];
  const role = rows[0]?.role || 'USER';

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return response;

  const isApi = path.startsWith('/api/');
  if (role === 'SUPPORT' && request.method !== 'GET') {
    return isApi 
      ? NextResponse.json({ success: false, error: 'SUPPORT chỉ có quyền xem' }, { status: 403 }) 
      : NextResponse.redirect(new URL('/login?error=403', request.url));
  }

  const allowed = (permissions[role] || []).some(p => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'));
  if (!allowed) {
    return isApi 
      ? NextResponse.json({ success: false, error: 'Không có quyền thực hiện thao tác này' }, { status: 403 }) 
      : NextResponse.redirect(new URL('/login?error=403', request.url));
  }

  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
