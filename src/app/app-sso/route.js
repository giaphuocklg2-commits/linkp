import { NextResponse } from 'next/server';
import { verifyAppAdminToken } from '@/lib/appAdminSession';

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const payload = await verifyAppAdminToken(token);
  if (!payload) return NextResponse.redirect(new URL('/login', url));
  const response = NextResponse.redirect(new URL('/', url));
  response.cookies.set('lp_app_admin', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 12 * 60 * 60, path: '/' });
  return response;
}
