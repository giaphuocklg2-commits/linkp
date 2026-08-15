import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    let userId = params.get('userId');
    const email = params.get('email');
    if (!userId) return NextResponse.json({ success:false,error:'Thiếu userId' },{status:400});
    if (email) { const found=await query(`SELECT id FROM public."User" WHERE email=$1 LIMIT 1`,[email]); if(found.rows.length) userId=found.rows[0].id; }
    const result = await query(`SELECT u."createdAt",
      COUNT(o.id) FILTER (WHERE o.status='APPROVED')::int AS "approvedOrders"
      FROM public."User" u LEFT JOIN public."AffiliateOrder" o ON o."userId"=u.id
      WHERE u.id=$1 GROUP BY u.id,u."createdAt"`,[userId]);
    const row=result.rows[0]||{approvedOrders:0,createdAt:new Date()};
    const approvedOrders=Number(row.approvedOrders)||0;
    const memberDays=Math.max(0,Math.floor((Date.now()-new Date(row.createdAt).getTime())/86400000));
    let tier='SILVER',nextTier='GOLD',targetOrders=10,targetDays=90;
    if(approvedOrders>=30||memberDays>=365){tier='PLATINUM';nextTier=null;targetOrders=30;targetDays=365;}
    else if(approvedOrders>=10||memberDays>=90){tier='GOLD';nextTier='PLATINUM';targetOrders=30;targetDays=365;}
    const orderProgress=Math.min(100,Math.round(approvedOrders/targetOrders*100));
    const dayProgress=Math.min(100,Math.round(memberDays/targetDays*100));
    return NextResponse.json({success:true,membership:{tier,nextTier,approvedOrders,memberDays,targetOrders,targetDays,progress:Math.max(orderProgress,dayProgress),perks:tier==='PLATINUM'?['Ưu tiên đối soát','Hỗ trợ ưu tiên','Huy hiệu Platinum']:tier==='GOLD'?['Hỗ trợ nhanh','Huy hiệu Gold','Ưu đãi thành viên']:['Tích lũy đơn hợp lệ','Huy hiệu Silver']}});
  } catch(error){return NextResponse.json({success:false,error:error.message},{status:500});}
}
