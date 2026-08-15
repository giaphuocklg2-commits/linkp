import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: 'Thiếu userId' }, { status: 400 });
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
