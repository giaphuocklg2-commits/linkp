import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    let userId = params.get('userId');
    const email = params.get('email');
    if (!userId) return NextResponse.json({ success: false, error: 'Thiếu userId' }, { status: 400 });
    if (email) {
      const found = await query(`SELECT id FROM public."User" WHERE email=$1 LIMIT 1`, [email]);
      if (found.rows.length) userId = found.rows[0].id;
    }
    const result = await query(`SELECT id,"orderCode","productName","userCashback",status,"createdAt","approvedAt",
      CASE WHEN status='APPROVED' THEN 'AVAILABLE' WHEN status='REJECTED' THEN 'REJECTED' ELSE 'RECONCILING' END stage
      FROM public."AffiliateOrder" WHERE "userId"=$1 ORDER BY "createdAt" DESC LIMIT 50`, [userId]);
    return NextResponse.json({ success: true, stages: ['RECORDED','RECONCILING','ELIGIBLE','AVAILABLE'], orders: result.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
