import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let queryBuilder = supabase
      .from('WithdrawalRequest')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (status && status !== 'ALL') {
      queryBuilder = queryBuilder.eq('status', status);
    }

    const { data: withdrawals, error } = await queryBuilder;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || []
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, transId, note } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin yêu cầu' }, { status: 400 });
    }

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    const { query } = require('@/lib/db');
    
    let result;
    try {
      const settled = await query('SELECT (public.admin_process_withdrawal($1,$2,$3,$4,$5)).*', 
        [id, status, transId || null, note || null, 'admin']);
      result = settled.rows[0];
    } catch (e) {
      if (e.message.includes('REQUEST_NOT_FOUND')) return NextResponse.json({ success: false, error: 'Không tìm thấy yêu cầu' }, { status: 404 });
      throw e;
    }

    return NextResponse.json({
      success: true,
      updated: result
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
