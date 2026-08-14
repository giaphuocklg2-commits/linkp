import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const subId = searchParams.get('subId');

    let sql = `SELECT * FROM public."AffiliateOrder" WHERE 1=1`;
    const params = [];

    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (userId) {
      params.push(userId);
      sql += ` AND "userId" = $${params.length}`;
    }

    if (subId) {
      params.push(`%${subId}%`);
      sql += ` AND "subId" ILIKE $${params.length}`;
    }

    sql += ` ORDER BY "createdAt" DESC LIMIT 100`;

    const res = await query(sql, params);
    return NextResponse.json({
      success: true,
      orders: res.rows
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, userId, userName } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu id đơn hàng' }, { status: 400 });
    }

    // 1. Get current order details
    const orderRes = await query(`SELECT * FROM public."AffiliateOrder" WHERE id = $1`, [id]);
    if (orderRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }
    const order = orderRes.rows[0];
    const previousStatus = order.status;
    const targetStatus = status || previousStatus;
    const previousUserId = order.userId;
    const targetUserId = userId || previousUserId;
    const targetUserName = userName || order.userName;
    const userCashback = Number(order.userCashback) || 0;

    // 2. Update order status and assigned user
    const updateRes = await query(`
      UPDATE public."AffiliateOrder"
      SET 
        status = $1,
        "userId" = $2,
        "userName" = $3,
        "approvedAt" = CASE WHEN $1 = 'APPROVED' AND "approvedAt" IS NULL THEN CURRENT_TIMESTAMP ELSE "approvedAt" END
      WHERE id = $4
      RETURNING *
    `, [targetStatus, targetUserId, targetUserName, id]);

    // 3. Update User Wallet balance:
    // A. If assigned to a new user and order is APPROVED -> credit new user's wallet
    if (targetUserId && targetUserId !== 'user_guest' && targetUserId !== previousUserId && targetStatus === 'APPROVED') {
      await query(`
        UPDATE public."Wallet"
        SET 
          balance = balance + $1,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $2
      `, [userCashback, targetUserId]);
    } else if (targetUserId && targetUserId !== 'user_guest') {
      if (previousStatus !== 'APPROVED' && targetStatus === 'APPROVED') {
        await query(`
          UPDATE public."Wallet"
          SET 
            balance = balance + $1,
            pending = GREATEST(0, pending - $1),
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "userId" = $2
        `, [userCashback, targetUserId]);
      } else if (previousStatus === 'APPROVED' && targetStatus !== 'APPROVED') {
        // Revert if order was un-approved
        await query(`
          UPDATE public."Wallet"
          SET 
            balance = GREATEST(0, balance - $1),
            pending = pending + $1,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "userId" = $2
        `, [userCashback, targetUserId]);
      }
    }

    return NextResponse.json({
      success: true,
      order: updateRes.rows[0],
      message: status === 'APPROVED' 
        ? `Đã hoàn thành đơn hàng #${order.orderCode} và tự động cộng +${userCashback.toLocaleString('vi-VN')}đ vào ví của User!`
        : `Đã cập nhật trạng thái đơn hàng #${order.orderCode} thành ${status}.`
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderCode, userId, userName, subId, productName, shopName, imageUrl, orderValue, shopeeCommission } = body;

    if (!orderCode || !orderValue) {
      return NextResponse.json({ success: false, error: 'Thiếu mã đơn hàng hoặc giá trị đơn' }, { status: 400 });
    }

    let resolvedUserId = userId;
    let resolvedUserName = userName;

    // Auto-match user from subId if userId is not specified or guest
    if ((!resolvedUserId || resolvedUserId === 'user_guest' || resolvedUserId === 'user_default') && subId) {
      const cleanSub = subId.trim();
      const matchRes = await query(`
        SELECT u.id, u.name 
        FROM public."User" u
        WHERE u.id = $1 
           OR 'u_' || REPLACE(REPLACE(u.id, 'user_', ''), 'google_', '') = $1
           OR $1 LIKE 'u_' || REPLACE(REPLACE(u.id, 'user_', ''), 'google_', '') || '%'
           OR u.id IN (SELECT "userId" FROM public."ConvertedLink" WHERE "subId" = $1 OR "subId" LIKE $1 || '%')
        LIMIT 1
      `, [cleanSub]);

      if (matchRes.rows.length > 0) {
        resolvedUserId = matchRes.rows[0].id;
        resolvedUserName = matchRes.rows[0].name || resolvedUserName;
      }
    }

    if (!resolvedUserId) resolvedUserId = 'user_guest';
    if (!resolvedUserName) resolvedUserName = 'Người dùng LinkP';

    const comm = Number(shopeeCommission) || Math.round(Number(orderValue) * 0.10);
    const userCb = Math.round(comm * 0.80);
    const adminRev = comm - userCb;

    const res = await query(`
      INSERT INTO public."AffiliateOrder" (
        id, "orderCode", "userId", "userName", "productName", "shopName", "imageUrl",
        "orderValue", "shopeeCommission", "userCashback", "adminRevenue", status, "subId", "createdAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("orderCode") DO UPDATE SET
        "userId" = EXCLUDED."userId",
        "userName" = EXCLUDED."userName",
        "productName" = EXCLUDED."productName",
        "orderValue" = EXCLUDED."orderValue",
        "shopeeCommission" = EXCLUDED."shopeeCommission",
        "userCashback" = EXCLUDED."userCashback",
        "adminRevenue" = EXCLUDED."adminRevenue",
        "subId" = EXCLUDED."subId"
      RETURNING *
    `, [
      orderCode.trim().toUpperCase(), 
      resolvedUserId, 
      resolvedUserName, 
      productName || 'Sản phẩm Shopee', 
      shopName || 'Shopee Mall', 
      imageUrl || '',
      Number(orderValue),
      comm,
      userCb,
      adminRev,
      subId || 'app_direct'
    ]);

    // Also add to User Wallet pending
    if (resolvedUserId !== 'user_guest') {
      await query(`
        UPDATE public."Wallet"
        SET 
          pending = pending + $1,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $2
      `, [userCb, resolvedUserId]);
    }

    return NextResponse.json({
      success: true,
      order: res.rows[0],
      message: `Đã khớp Sub_ID '${subId || 'direct'}' với User ${resolvedUserName} và tạo đơn #${orderCode} thành công!`
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
