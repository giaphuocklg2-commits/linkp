import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'user_default';

    const res = await query(`
      SELECT * FROM public."AffiliateOrder"
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 50
    `, [userId]);

    return NextResponse.json({
      success: true,
      orders: res.rows
    });
  } catch (error) {
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
    const userCb = Math.round(comm * 0.80);
    const adminRev = comm - userCb;

    const res = await query(`
      INSERT INTO public."AffiliateOrder" (
        id, "orderCode", "userId", "userName", "productName", "shopName", "imageUrl",
        "orderValue", "shopeeCommission", "userCashback", "adminRevenue", status, "subId"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11
      )
      ON CONFLICT ("orderCode") DO UPDATE
      SET "productName" = EXCLUDED."productName", "orderValue" = EXCLUDED."orderValue"
      RETURNING *
    `, [
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

    // Add to user pending wallet balance
    await query(`
      UPDATE public."Wallet"
      SET 
        pending = pending + $1,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = $2
    `, [userCb, userId || 'user_default']);

    return NextResponse.json({
      success: true,
      order: res.rows[0],
      message: 'Khai báo đơn hàng thành công! Đang chờ Admin xác nhận đối soát.'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
