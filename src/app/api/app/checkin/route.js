import { NextResponse } from 'next/server';
import { transaction } from '@/lib/db';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ success: false, error: 'Thiếu userId' }, { status: 400 });
    const result = await transaction(async client => {
      const key = `checkin:${userId}:${new Date().toISOString().slice(0,10)}`;
      const existing = await client.query('SELECT "balanceAfter" FROM public."WalletLedger" WHERE "idempotencyKey"=$1', [key]);
      if (existing.rows.length) return { claimed: false, balance: Number(existing.rows[0].balanceAfter) };
      const credited = await client.query('SELECT public.apply_wallet_credit($1,200,$2,$3,$4) balance', [userId,'DAILY_CHECKIN','Thưởng điểm danh hằng ngày',key]);
      return { claimed: true, balance: Number(credited.rows[0].balance) };
    });
    return NextResponse.json({ success: true, ...result, reward: result.claimed ? 200 : 0 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
