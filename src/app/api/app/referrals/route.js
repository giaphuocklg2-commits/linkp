import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: 'Thiếu userId' }, { status: 400 });
    const [summary, timeline, recent] = await Promise.all([
      query(`SELECT COUNT(*) FILTER (WHERE type='CLICK')::int clicks,
        COUNT(DISTINCT "referredUserId") FILTER (WHERE type='SIGNUP')::int signups,
        COUNT(*) FILTER (WHERE type='QUALIFIED_ORDER')::int "qualifiedOrders",
        COALESCE(SUM(amount) FILTER (WHERE type='COMMISSION'),0)::numeric commission
        FROM public."ReferralEvent" WHERE "referrerId"=$1`, [userId]),
      query(`SELECT to_char(date_trunc('day',"createdAt"),'YYYY-MM-DD') day,
        COUNT(*) FILTER (WHERE type='CLICK')::int clicks,
        COUNT(*) FILTER (WHERE type='SIGNUP')::int signups,
        COUNT(*) FILTER (WHERE type='QUALIFIED_ORDER')::int orders,
        COALESCE(SUM(amount) FILTER (WHERE type='COMMISSION'),0)::numeric commission
        FROM public."ReferralEvent" WHERE "referrerId"=$1
        GROUP BY date_trunc('day',"createdAt") ORDER BY date_trunc('day',"createdAt") DESC LIMIT 30`, [userId]),
      query(`SELECT type,amount,"referredUserId","orderId","createdAt" FROM public."ReferralEvent"
        WHERE "referrerId"=$1 ORDER BY "createdAt" DESC LIMIT 20`, [userId])
    ]);
    return NextResponse.json({ success: true, summary: summary.rows[0], timeline: timeline.rows, recent: recent.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { referrerId, type = 'CLICK', referredUserId = null, metadata = {} } = await request.json();
    if (!referrerId || !['CLICK','SIGNUP'].includes(type)) return NextResponse.json({ success: false, error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    await query(`INSERT INTO public."ReferralEvent" ("referrerId","referredUserId",type,metadata) VALUES ($1,$2,$3,$4)`, [referrerId,referredUserId,type,metadata]);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
