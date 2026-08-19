import { NextResponse } from 'next/server';
import { createAppAdminToken } from '@/lib/appAdminSession';
import { supabase } from '@/lib/supabase';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email = '', password = '', remember = true } = body;

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check Master Admin Credentials
    if (normalizedEmail === 'giaphuocklg@gmail.com' && password === 'Kgg@123456') {
      const days = remember ? 30 : 1;
      const token = await createAppAdminToken('giaphuocklg@gmail.com', 'SUPER_ADMIN', days);

      const response = NextResponse.json({
        success: true,
        message: 'Đăng nhập quản trị thành công!',
        user: {
          email: 'giaphuocklg@gmail.com',
          role: 'SUPER_ADMIN',
          name: 'Gia Phước (Super Admin)'
        }
      });

      // Set Persistent Cookie
      response.cookies.set('lp_app_admin', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: days * 24 * 60 * 60,
        path: '/'
      });

      return response;
    }

    // 2. Check Supabase Auth as secondary fallback
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password
    });

    if (!authError && authData?.user) {
      // Check user role in database
      const dbRes = await query(`SELECT role, name FROM public."User" WHERE email = $1 LIMIT 1`, [normalizedEmail]);
      const userRole = dbRes.rows[0]?.role || 'USER';

      if (['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT'].includes(userRole)) {
        const days = remember ? 30 : 1;
        const token = await createAppAdminToken(normalizedEmail, userRole, days);

        const response = NextResponse.json({
          success: true,
          message: 'Đăng nhập thành công!',
          user: {
            email: normalizedEmail,
            role: userRole,
            name: dbRes.rows[0]?.name || normalizedEmail
          }
        });

        response.cookies.set('lp_app_admin', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: days * 24 * 60 * 60,
          path: '/'
        });

        return response;
      } else {
        return NextResponse.json({
          success: false,
          error: 'Tài khoản này không có quyền truy cập hệ thống quản trị.'
        }, { status: 403 });
      }
    }

    // Invalid credentials
    return NextResponse.json({
      success: false,
      error: 'Email hoặc mật khẩu quản trị không đúng. Vui lòng kiểm tra lại.'
    }, { status: 401 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Đã xảy ra lỗi máy chủ khi xác thực đăng nhập.'
    }, { status: 500 });
  }
}
