import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createAppAdminToken } from '@/lib/appAdminSession';

const ALLOWED = ['SUPPORT', 'FINANCE', 'ADMIN', 'SUPER_ADMIN'];

export async function GET(request) {
  const email = new URL(request.url).searchParams.get('email')?.trim().toLowerCase();
  if (!email) return NextResponse.json({ success: true, access: { hasAccess: false, role: 'USER' } });
  const { data } = await supabase.from('User').select('role').ilike('email', email).maybeSingle();
  const role = data?.role || 'USER';
  if (!ALLOWED.includes(role)) return NextResponse.json({ success: true, access: { hasAccess: false, role } });
  const token = await createAppAdminToken(email, role);
  const origin = new URL(request.url).origin;
  return NextResponse.json({ success: true, access: { hasAccess: true, role, ssoUrl: `${origin}/app-sso?token=${encodeURIComponent(token)}` } });
}
