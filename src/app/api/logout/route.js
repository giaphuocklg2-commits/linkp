import { NextResponse } from 'next/server';

export async function POST(request) {
  const url = new URL(request.url);
  const response = NextResponse.json({ success: true, message: 'Đã đăng xuất' });
  
  // Clear admin session cookie
  response.cookies.set('lp_app_admin', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });

  return response;
}
