import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateTier, MEMBER_RULES } from '@/lib/membership';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    let userId = params.get('userId');
    const email = params.get('email');
    if (!userId) return NextResponse.json({ success:false,error:'Thiếu userId' },{status:400});
    if (email) { const found=await query(`SELECT id FROM public."User" WHERE email=$1 LIMIT 1`,[email]); if(found.rows.length) userId=found.rows[0].id; }
    const result = await query(`SELECT u."createdAt", rc.value #>> '{}' AS override,
      COUNT(o.id) FILTER (WHERE o.status='APPROVED')::int AS "approvedOrders"
      FROM public."User" u LEFT JOIN public."AffiliateOrder" o ON o."userId"=u.id
      LEFT JOIN public."RemoteConfig" rc ON rc.key='member_rank:'||u.id
      WHERE u.id=$1 GROUP BY u.id,u."createdAt",rc.value`,[userId]);
    const row=result.rows[0]||{approvedOrders:0,createdAt:new Date()};
    const approvedOrders=Number(row.approvedOrders)||0;
    const memberDays=Math.max(0,Math.floor((Date.now()-new Date(row.createdAt).getTime())/86400000));
    const tier=calculateTier(approvedOrders,memberDays,row.override);
    let nextTier=tier==='SILVER'?'GOLD':tier==='GOLD'?'PLATINUM':null;
    let targetOrders=tier==='SILVER'?10:20,targetDays=tier==='SILVER'?90:180;
    const orderProgress=Math.min(100,Math.round(approvedOrders/targetOrders*100));
    const dayProgress=Math.min(100,Math.round(memberDays/targetDays*100));
    const benefits = tier === 'PLATINUM'
      ? { supportPriority:'HIGHEST', reconciliationPriority:true, exclusiveVoucherAccess:true, badge:'PLATINUM' }
      : tier === 'GOLD'
        ? { supportPriority:'PRIORITY', reconciliationPriority:false, exclusiveVoucherAccess:true, badge:'GOLD' }
        : { supportPriority:'STANDARD', reconciliationPriority:false, exclusiveVoucherAccess:false, badge:'SILVER' };
    const perks = tier === 'PLATINUM'
      ? ['Thưởng thêm +6% hoa hồng ròng mỗi đơn','Hỗ trợ Zalo ưu tiên cao nhất','Ưu tiên kiểm tra đối soát','Kho voucher độc quyền','Huy hiệu Platinum']
      : tier === 'GOLD'
        ? ['Thưởng thêm +4% hoa hồng ròng mỗi đơn','Hỗ trợ Zalo ưu tiên','Kho voucher độc quyền','Huy hiệu Gold']
        : ['Thưởng thêm +2% hoa hồng ròng mỗi đơn','Tích lũy đơn hợp lệ để thăng hạng','Hỗ trợ Zalo tiêu chuẩn','Huy hiệu Silver'];
    return NextResponse.json({success:true,membership:{tier,nextTier,approvedOrders,memberDays,targetOrders,targetDays,progress:nextTier?Math.max(orderProgress,dayProgress):100,bonusRate:MEMBER_RULES[tier].bonus,rankOverride:row.override||null,benefits,perks}});
  } catch(error){return NextResponse.json({success:false,error:error.message},{status:500});}
}
