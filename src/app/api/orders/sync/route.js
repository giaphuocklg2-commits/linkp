import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const API_KEY = process.env.ADDLIVETAG_API_KEY || 'd563fb333878a1ec9816ab22092ce10055adff1567cabc5f';
const CONVERSIONS_URL = 'https://addlivetag.com/api/v1/conversions.php';

export async function GET(request) {
  return handleSync(request);
}

export async function POST(request) {
  return handleSync(request);
}

async function handleSync(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageSize = searchParams.get('page_size') || '100';
    const type = searchParams.get('type') || 'items';

    // 1. Fetch live conversions from AddLiveTag API
    const response = await fetch(`${CONVERSIONS_URL}?type=${type}&page_size=${pageSize}`, {
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'LinkP-Admin/2.0'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `AddLiveTag API HTTP ${response.status}: ${response.statusText}` 
      }, { status: 502 });
    }

    const payload = await response.json();
    const items = payload.data || [];

    let totalFetched = items.length;
    let matchedCount = 0;
    let completedCount = 0;
    let newOrdersCount = 0;
    let totalCashbackCredited = 0;

    // 2. Fetch all registered users to memory cache for fast sub_id matching
    const usersRes = await query(`SELECT id, name, email FROM public."User"`);
    const allUsers = usersRes.rows || [];

    for (const item of items) {
      const orderCode = (item.order_sn || item.checkout_id || '').trim().toUpperCase();
      if (!orderCode) continue;

      const rawSub = (item.sub_id1 || item.utm || '').trim();
      const rawStatus = (item.status || '').trim();
      const statusCode = (item.status_code || '').toLowerCase().trim();
      const commStatus = (item.commission_status || '').trim();

      // Check if order is completed / eligible for cashback payout
      const isCompleted = statusCode === 'completed' || 
                          statusCode === 'paid' || 
                          rawStatus === 'Hoàn thành' || 
                          rawStatus === 'Đã thanh toán' || 
                          commStatus === 'Chờ trả hoa hồng' ||
                          commStatus === 'Đã trả';

      const isCancelled = statusCode === 'cancelled' || rawStatus === 'Huỷ' || rawStatus === 'Hủy';

      const targetStatus = isCompleted ? 'APPROVED' : (isCancelled ? 'REJECTED' : 'PENDING');

      // 3. Match User by Sub-ID
      let resolvedUserId = 'user_guest';
      let resolvedUserName = 'Người dùng Shopee';

      if (rawSub) {
        const cleanSub = rawSub.toLowerCase();
        // A. Direct check against in-memory user list
        for (const u of allUsers) {
          const cleanId = (u.id || '').replace('user_', '').replace('google_', '').toLowerCase();
          if (cleanSub.includes(cleanId) || cleanSub === 'u_' + cleanId || cleanSub.includes((u.id || '').toLowerCase())) {
            resolvedUserId = u.id;
            resolvedUserName = u.name || u.email || resolvedUserName;
            matchedCount++;
            break;
          }
        }

        // B. Fallback check against ConvertedLink history
        if (resolvedUserId === 'user_guest') {
          const linkMatch = await query(`
            SELECT "userId" FROM public."ConvertedLink" 
            WHERE "subId" = $1 OR "subId" LIKE $1 || '%' OR $1 LIKE '%' || "subId" || '%'
            ORDER BY "createdAt" DESC LIMIT 1
          `, [rawSub]);

          if (linkMatch.rows.length > 0 && linkMatch.rows[0].userId) {
            resolvedUserId = linkMatch.rows[0].userId;
            const uObj = allUsers.find(x => x.id === resolvedUserId);
            if (uObj) resolvedUserName = uObj.name || uObj.email || resolvedUserName;
            matchedCount++;
          }
        }
      }

      const orderVal = Number(item.order_value) || Number(item.price) || 0;
      const comm = Number(item.commission) || Math.round(orderVal * 0.10);
      const userCb = Math.round(comm * 0.80);
      const adminRev = comm - userCb;

      // 4. Check if order already exists
      const existingRes = await query(`SELECT id, status, "userCashback", "userId" FROM public."AffiliateOrder" WHERE "orderCode" = $1`, [orderCode]);

      if (existingRes.rows.length === 0) {
        // Insert new order
        newOrdersCount++;
        await query(`
          INSERT INTO public."AffiliateOrder" (
            id, "orderCode", "userId", "userName", "productName", "shopName", "imageUrl",
            "orderValue", "shopeeCommission", "userCashback", "adminRevenue", status, "subId", "createdAt", "approvedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
            TO_TIMESTAMP($13), CASE WHEN $11 = 'APPROVED' THEN CURRENT_TIMESTAMP ELSE NULL END
          )
        `, [
          orderCode,
          resolvedUserId,
          resolvedUserName,
          item.item_name || 'Sản phẩm Shopee',
          item.affiliate || 'Shopee Mall',
          item.image || '',
          orderVal,
          comm,
          userCb,
          adminRev,
          targetStatus,
          rawSub || 'app_direct',
          item.purchase_time ? Number(item.purchase_time) : Date.now() / 1000
        ]);

        // If User is matched and order is approved -> credit wallet balance
        if (resolvedUserId !== 'user_guest') {
          if (targetStatus === 'APPROVED') {
            completedCount++;
            totalCashbackCredited += userCb;
            await query(`
              UPDATE public."Wallet"
              SET 
                balance = balance + $1,
                "updatedAt" = CURRENT_TIMESTAMP
              WHERE "userId" = $2
            `, [userCb, resolvedUserId]);
          } else if (targetStatus === 'PENDING') {
            await query(`
              UPDATE public."Wallet"
              SET 
                pending = pending + $1,
                "updatedAt" = CURRENT_TIMESTAMP
              WHERE "userId" = $2
            `, [userCb, resolvedUserId]);
          }
        }
      } else {
        // Existing order: Update status and credit wallet if transitioned to APPROVED
        const prev = existingRes.rows[0];
        if (prev.status !== 'APPROVED' && targetStatus === 'APPROVED') {
          completedCount++;
          totalCashbackCredited += userCb;

          await query(`
            UPDATE public."AffiliateOrder"
            SET 
              status = 'APPROVED',
              "approvedAt" = CURRENT_TIMESTAMP,
              "userId" = CASE WHEN $1 != 'user_guest' THEN $1 ELSE "userId" END,
              "userName" = CASE WHEN $2 != 'Người dùng Shopee' THEN $2 ELSE "userName" END,
              "productName" = COALESCE($3, "productName"),
              "orderValue" = $4,
              "shopeeCommission" = $5,
              "userCashback" = $6,
              "adminRevenue" = $7
            WHERE id = $8
          `, [
            resolvedUserId,
            resolvedUserName,
            item.item_name || 'Sản phẩm Shopee',
            orderVal,
            comm,
            userCb,
            adminRev,
            prev.id
          ]);

          const effectiveUid = (resolvedUserId !== 'user_guest') ? resolvedUserId : prev.userId;
          if (effectiveUid && effectiveUid !== 'user_guest') {
            await query(`
              UPDATE public."Wallet"
              SET 
                balance = balance + $1,
                pending = GREATEST(0, pending - $1),
                "updatedAt" = CURRENT_TIMESTAMP
              WHERE "userId" = $2
            `, [userCb, effectiveUid]);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalFetched,
        matchedCount,
        completedCount,
        newOrdersCount,
        totalCashbackCredited
      },
      message: `Đã đồng bộ thành công ${totalFetched} đơn từ AddLiveTag API! Khớp ${matchedCount} Sub_ID, ${completedCount} đơn hoàn thành đã cộng ví.`
    });
  } catch (error) {
    console.error('AddLiveTag sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
