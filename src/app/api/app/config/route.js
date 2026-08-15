import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query('SELECT key, value, "updatedAt" FROM public."RemoteConfig"');
    const config = Object.fromEntries(result.rows.map(({ key, value }) => [key, value]));
    return NextResponse.json({ success: true, config }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { shareRate, minimumWithdrawal, banner } = await request.json();
    if (shareRate < 0 || shareRate > 100 || minimumWithdrawal < 0) return NextResponse.json({ success:false,error:'Cấu hình không hợp lệ' },{status:400});
    await query(`INSERT INTO public."RemoteConfig" (key,value,"updatedAt") VALUES
      ('share_rate',$1::text::jsonb,now()),('minimum_withdrawal',$2::text::jsonb,now()),('home_banner',$3::jsonb,now())
      ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,"updatedAt"=now()`, [shareRate,minimumWithdrawal,JSON.stringify(banner)]);
    return NextResponse.json({ success:true });
  } catch (error) { return NextResponse.json({ success:false,error:error.message },{status:500}); }
}
