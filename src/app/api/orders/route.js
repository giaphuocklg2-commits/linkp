import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { query, transaction } from '@/lib/db';
import { getUserTier, MEMBER_RULES } from '@/lib/membership';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const subId = searchParams.get('subId');
    const dateFilter = searchParams.get('dateFilter') || 'ALL'; // TODAY, YESTERDAY, 7DAYS, 30DAYS, LAST_MONTH, ALL

    let queryBuilder = supabase
      .from('AffiliateOrder')
      .select('*')
      .order('createdAt', { ascending: false });

    // Apply date filtering
    const now = new Date();
    if (dateFilter !== 'ALL') {
      let startDate;
      let endDate;
      
      if (dateFilter === 'TODAY') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateFilter === 'YESTERDAY') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateFilter === '7DAYS') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateFilter === '30DAYS') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateFilter === 'LAST_MONTH') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateFilter === 'THIS_MONTH') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (startDate) {
        queryBuilder = queryBuilder.gte('createdAt', startDate.toISOString());
      }
      if (endDate) {
        queryBuilder = queryBuilder.lt('createdAt', endDate.toISOString());
      }
    }
    
    queryBuilder = queryBuilder.limit(100);

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
    const { orderCode, userId, userName, subId, productName, shopName, imageUrl, orderValue, shopeeCommission, status = 'PENDING' } = body;

    if (!orderCode || !orderValue) {
      return NextResponse.json({ success: false, error: 'Thiếu mã đơn hàng hoặc giá trị đơn' }, { status: 400 });
    }
    if (!['PENDING', 'APPROVED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Trạng thái tạo đơn không hợp lệ' }, { status: 400 });
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

    if (resolvedUserId !== 'user_guest') {
      const { data: realUser } = await supabase.from('User').select('id,name').eq('id', resolvedUserId).maybeSingle();
      if (!realUser) return NextResponse.json({ success:false, error:'User không tồn tại trong hệ thống' }, { status:404 });
      resolvedUserName = realUser.name || resolvedUserName;
    }

    const comm = Number(shopeeCommission) || Math.round(Number(orderValue) * 0.10);
    const config = await query(`SELECT COALESCE((value #>> '{}')::numeric,80) rate FROM public."RemoteConfig" WHERE key='share_rate'`);
    const baseRate = Number(config.rows[0]?.rate) || 80;
    const tier = await getUserTier({query}, resolvedUserId);
    const appliedRate = Math.min(100, baseRate + MEMBER_RULES[tier].bonus);
    const userCb = Math.round(comm * appliedRate / 100);
    const adminRev = comm - userCb;

    const finalOrder = await transaction(async client => {
      const duplicate = await client.query('SELECT id FROM public."AffiliateOrder" WHERE "orderCode"=$1 FOR UPDATE', [orderCode.trim().toUpperCase()]);
      if (duplicate.rows.length) throw new Error('Mã đơn hàng đã tồn tại');
      const inserted = await client.query(`INSERT INTO public."AffiliateOrder"
        (id,"orderCode","userId","userName","productName","shopName","imageUrl","orderValue","shopeeCommission","userCashback","adminRevenue",status,"subId","createdAt")
        VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING',$11,now()) RETURNING *`,
        [orderCode.trim().toUpperCase(), resolvedUserId, resolvedUserName, productName || 'Sản phẩm Shopee', shopName || 'Shopee Mall', imageUrl || '', Number(orderValue), comm, userCb, adminRev, subId || 'app_direct']);
      let created = inserted.rows[0];
      if (resolvedUserId !== 'user_guest') {
        await client.query(`INSERT INTO public."Wallet" (id,"userId","userName",balance,pending,withdrawn,"updatedAt")
          VALUES (gen_random_uuid(),$1,$2,0,$3,0,now())
          ON CONFLICT ("userId") DO UPDATE SET pending=public."Wallet".pending+EXCLUDED.pending,"updatedAt"=now()`,
          [resolvedUserId, resolvedUserName, userCb]);
      }
      if (status === 'APPROVED') {
        const settled = await client.query('SELECT (public.settle_affiliate_order($1,$2)).*', [created.id, 'APPROVED']);
        created = settled.rows[0] || created;
      }
      return created;
    });

    return NextResponse.json({
      success: true,
      order: finalOrder,
      membership: { tier, baseRate, bonusRate: MEMBER_RULES[tier].bonus, appliedRate },
      message: `Đã khớp Sub_ID '${subId || 'direct'}' với User ${resolvedUserName} và tạo đơn #${orderCode} thành công!`
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
