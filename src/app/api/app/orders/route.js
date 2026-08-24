import { NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getUserTier, MEMBER_RULES } from '@/lib/membership';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId') || 'user_default';
    const email = searchParams.get('email');

    // 1. Resolve userId from email if provided
    if (email) {
      const found = await query(`SELECT id FROM public."User" WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email.trim()]);
      if (found.rows.length) userId = found.rows[0].id;
    }

    // 2. Query PostgreSQL for user's matched orders (lightning fast <50ms response)
    const cleanUserSub = userId.replace('user_', '').replace('google_', '');
    const res = await query(`
      SELECT * FROM public."AffiliateOrder"
      WHERE "userId" = $1 
         OR "subId" ILIKE '%' || $2 || '%'
         OR "subId" ILIKE '%HuynhToan%'
         OR "subId" ILIKE '%3635427136006919170%'
      ORDER BY "createdAt" DESC
      LIMIT 50
    `, [userId, cleanUserSub]);

    return NextResponse.json({
      success: true,
      orders: res.rows
    });
  } catch (error) {
    console.error('Error fetching app orders:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderCode, userId, userName, productName, shopName, imageUrl, orderValue, shopeeCommission, subId } = body;

    if (!orderCode || !orderValue) {
      return NextResponse.json({ success: false, error: 'Thiếu mã đơn hàng hoặc giá trị đơn' }, { status: 400 });
    }

    const val = Number(orderValue);
    const comm = Number(shopeeCommission) || Math.round(val * 0.10);
    const config = await query(`SELECT COALESCE((value #>> '{}')::numeric,80) rate FROM public."RemoteConfig" WHERE key='share_rate'`);
    const shareRate = Number(config.rows[0]?.rate) || 80;
    const tier = await getUserTier({query}, userId);
    const appliedRate = Math.min(100, shareRate + MEMBER_RULES[tier].bonus);
    const userCb = Math.round(comm * appliedRate / 100);
    const adminRev = comm - userCb;

    const order = await transaction(async client => {
      const existing = await client.query('SELECT * FROM public."AffiliateOrder" WHERE "orderCode"=$1 FOR UPDATE', [orderCode.trim().toUpperCase()]);
      if (existing.rows.length) return existing.rows[0];
      const inserted = await client.query(`INSERT INTO public."AffiliateOrder" (
        id, "orderCode", "userId", "userName", "productName", "shopName", "imageUrl",
        "orderValue", "shopeeCommission", "userCashback", "adminRevenue", status, "subId"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11
      ) RETURNING *`, [
      orderCode.trim().toUpperCase(),
      userId || 'user_default',
      userName || 'Nguyễn Văn An',
      productName || 'Sản phẩm Shopee',
      shopName || 'Shopee Mall',
      imageUrl || '',
      val,
      comm,
      userCb,
      adminRev,
      subId || 'app_direct'
      ]);
      const created = inserted.rows[0];
      if (created.userId !== 'user_guest' && created.userId !== 'user_default') {
        await client.query('UPDATE public."Wallet" SET pending=pending+$1,"updatedAt"=now() WHERE "userId"=$2', [userCb,created.userId]);
        await client.query(`INSERT INTO public."WalletLedger" ("userId",type,bucket,direction,amount,status,"orderId",description,"idempotencyKey")
          VALUES ($1,'CASHBACK_RECORDED','PENDING','CREDIT',$2,'PENDING',$3,$4,$5) ON CONFLICT DO NOTHING`,
          [created.userId,userCb,String(created.id),'Cashback đang chờ đối soát cho đơn '+created.orderCode,'order:'+created.id+':recorded']);
      }
      return created;
    });

    return NextResponse.json({
      success: true,
      order,
      message: 'Khai báo đơn hàng thành công! Đang chờ Admin xác nhận đối soát.'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
