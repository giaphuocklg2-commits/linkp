import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    let userId = params.get('userId');
    const email = params.get('email');
    if (!userId) return NextResponse.json({ success: false, error: 'Thiếu userId' }, { status: 400 });
    if (email) { const found=await query(`SELECT id FROM public."User" WHERE email=$1 LIMIT 1`,[email]); if(found.rows.length) userId=found.rows[0].id; }
    const result = await query(`
      SELECT l.*, o."orderCode", o."productName"
      FROM public."WalletLedger" l
      LEFT JOIN public."AffiliateOrder" o ON o.id::text = l."orderId"
      WHERE l."userId"=$1 ORDER BY l."createdAt" DESC LIMIT 100
    `, [userId]);
    return NextResponse.json({ success: true, entries: result.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
