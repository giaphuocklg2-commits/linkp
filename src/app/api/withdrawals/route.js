import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let sql = `SELECT * FROM public."WithdrawalRequest"`;
    const params = [];
    if (status && status !== 'ALL') {
      sql += ` WHERE status = $1`;
      params.push(status);
    }
    sql += ` ORDER BY "createdAt" DESC LIMIT 100`;

    const res = await query(sql, params);
    return NextResponse.json({
      success: true,
      withdrawals: res.rows
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

    const res = await query(`
      UPDATE public."WithdrawalRequest"
      SET 
        status = $1,
        "transId" = COALESCE($2, "transId"),
        note = COALESCE($3, note),
        "processedAt" = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [status, transId || null, note || null, id]);

    return NextResponse.json({
      success: true,
      updated: res.rows[0]
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
