import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const subId = searchParams.get('subId');

    let queryBuilder = supabase
      .from('AffiliateOrder')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (status && status !== 'ALL') {
      queryBuilder = queryBuilder.eq('status', status);
    }
    if (userId) {
      queryBuilder = queryBuilder.eq('userId', userId);
    }
    if (subId) {
      queryBuilder = queryBuilder.ilike('subId', `%${subId}%`);
    }

    const { data: orders, error } = await queryBuilder;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      orders: orders || []
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

    // 1. Get current order
    const { data: order, error: errOrder } = await supabase
      .from('AffiliateOrder')
      .select('*')
      .eq('id', id)
      .single();

    if (errOrder || !order) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    const previousStatus = order.status;
    const targetStatus = status || previousStatus;
    const previousUserId = order.userId;
    const targetUserId = userId || previousUserId;
    const targetUserName = userName || order.userName;
    const userCashback = Number(order.userCashback) || 0;

    if (targetUserId !== previousUserId || targetUserName !== order.userName) {
      await query('UPDATE public."AffiliateOrder" SET "userId"=$1,"userName"=$2 WHERE id::text=$3', [targetUserId,targetUserName,id]);
    }
    const settled = await query('SELECT (public.settle_affiliate_order($1,$2)).*', [id,targetStatus]);
    const updatedOrder = settled.rows[0];

    return NextResponse.json({
      success: true,
      order: updatedOrder,
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
      const { data: matchedUsers } = await supabase.from('User').select('id, name').limit(100);
      if (matchedUsers && matchedUsers.length > 0) {
        const found = matchedUsers.find(u => 
          u.id === cleanSub ||
          `u_${u.id.replace('user_', '').replace('google_', '')}` === cleanSub ||
          cleanSub.startsWith(`u_${u.id.replace('user_', '').replace('google_', '')}`)
        );
        if (found) {
          resolvedUserId = found.id;
          resolvedUserName = found.name || resolvedUserName;
        }
      }
    }

    if (!resolvedUserId) resolvedUserId = 'user_guest';
    if (!resolvedUserName) resolvedUserName = 'Người dùng LinkP';

    const comm = Number(shopeeCommission) || Math.round(Number(orderValue) * 0.10);
    const userCb = Math.round(comm * 0.80);
    const adminRev = comm - userCb;

    const { data: newOrder, error: errInsert } = await supabase
      .from('AffiliateOrder')
      .upsert({
        orderCode: orderCode.trim().toUpperCase(),
        userId: resolvedUserId,
        userName: resolvedUserName,
        productName: productName || 'Sản phẩm Shopee',
        shopName: shopName || 'Shopee Mall',
        imageUrl: imageUrl || '',
        orderValue: Number(orderValue),
        shopeeCommission: comm,
        userCashback: userCb,
        adminRevenue: adminRev,
        status: 'PENDING',
        subId: subId || 'app_direct',
        createdAt: new Date().toISOString()
      }, { onConflict: 'orderCode' })
      .select()
      .single();

    if (errInsert) throw errInsert;

    // Add to User Wallet pending
    if (resolvedUserId !== 'user_guest') {
      const { data: wallet } = await supabase.from('Wallet').select('*').eq('userId', resolvedUserId).single();
      const currentPending = Number(wallet?.pending) || 0;
      await supabase.from('Wallet').upsert({
        userId: resolvedUserId,
        pending: currentPending + userCb,
        updatedAt: new Date().toISOString()
      }, { onConflict: 'userId' });
    }

    return NextResponse.json({
      success: true,
      order: newOrder,
      message: `Đã khớp Sub_ID '${subId || 'direct'}' với User ${resolvedUserName} và tạo đơn #${orderCode} thành công!`
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
