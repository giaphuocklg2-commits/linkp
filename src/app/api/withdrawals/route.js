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

    const updatePayload = {
      status,
      processedAt: new Date().toISOString()
    };
    if (transId !== undefined) updatePayload.transId = transId;
    if (note !== undefined) updatePayload.note = note;

    const { data: updated, error } = await supabase
      .from('WithdrawalRequest')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      updated
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
