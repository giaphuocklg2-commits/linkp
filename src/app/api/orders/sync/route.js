import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserTier, MEMBER_RULES } from '@/lib/membership';

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
    const requestUrl = request.url || '/api/orders/sync';
    const { searchParams } = new URL(requestUrl, 'http://localhost');

    const pageSize = searchParams.get('page_size') || '100';
    const type = searchParams.get('type') || 'items';
    const statusParam = searchParams.get('status');
    const accountId = searchParams.get('account_id');
    const sourceParam = searchParams.get('source');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const maxPages = searchParams.get('max_pages') ? parseInt(searchParams.get('max_pages')) : 3;

    const stats = await performAddLiveTagSync({
      pageSize,
      type,
      status: statusParam,
      accountId,
      source: sourceParam,
      from: fromParam,
      to: toParam,
      maxPages
    });

    return NextResponse.json({
      success: true,
      stats,
      message: `Đã đồng bộ thành công ${stats.totalFetched} đơn từ AddLiveTag API! Khớp ${stats.matchedCount} Sub_ID, thêm ${stats.newOrdersCount} đơn mới.`
    });
  } catch (error) {
    console.error('AddLiveTag sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function performAddLiveTagSync(opts = {}) {
  const pageSize = opts.pageSize || '100';
  const type = opts.type || 'items';
  const statusParam = opts.status;
  const accountId = opts.accountId;
  const sourceParam = opts.source;
  const maxPages = opts.maxPages || 2;

  let fromParam = opts.from;
  if (!fromParam) {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    fromParam = d.toISOString().slice(0, 10);
  }
  const toParam = opts.to || new Date().toISOString().slice(0, 10);

  let items = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    let url = `${CONVERSIONS_URL}?type=${type}&page_size=${pageSize}&page=${page}`;
    if (fromParam) url += `&from=${encodeURIComponent(fromParam)}`;
    if (toParam) url += `&to=${encodeURIComponent(toParam)}`;
    if (statusParam) url += `&status=${encodeURIComponent(statusParam)}`;
    if (accountId) url += `&account_id=${encodeURIComponent(accountId)}`;
    if (sourceParam) url += `&source=${encodeURIComponent(sourceParam)}`;

    const response = await fetch(url, {
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'LinkP-Admin/2.0'
      },
      cache: 'no-store'
    });

    if (!response.ok) break;

    const payload = await response.json();
    const pageData = payload.data || [];
    if (pageData.length === 0) {
      hasMore = false;
    } else {
      items.push(...pageData);
      const totalRecords = payload.meta?.total || 0;
      if (items.length >= totalRecords || pageData.length < Number(pageSize)) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  let totalFetched = items.length;
  let matchedCount = 0;
  let completedCount = 0;
  let newOrdersCount = 0;
  let totalCashbackCredited = 0;

  const usersRes = await query(`SELECT id, name, email FROM public."User"`);
  const allUsers = usersRes.rows || [];
  const config = await query(`SELECT COALESCE((value #>> '{}')::numeric,80) rate FROM public."RemoteConfig" WHERE key='share_rate'`);
  const baseRate = Number(config.rows[0]?.rate) || 80;

  const tierCache = new Map();
  const getCachedTier = async (uid) => {
    if (!uid || uid === 'user_guest') return 'SILVER';
    if (!tierCache.has(uid)) {
      const tierName = await getUserTier({ query }, uid);
      tierCache.set(uid, tierName);
    }
    return tierCache.get(uid);
  };

  for (const item of items) {
    try {
      const orderCode = (item.order_sn || item.checkout_id || '').trim().toUpperCase();
      if (!orderCode) continue;

      const productName = (item.item_name || 'Sản phẩm Shopee').trim();
      const orderVal = Number(item.order_value) || Number(item.price) || 0;
      const comm = Number(item.commission) || Math.round(orderVal * 0.10);

      let rawSub = (item.sub_id1 || item.utm || '').trim();
      const utm = (item.utm || '').trim();
      if (utm && utm !== '----' && !utm.startsWith('default-default')) {
        rawSub = utm;
      }

      const rawStatus = (item.status || '').trim();
      const statusCode = (item.status_code || '').toLowerCase().trim();

      const isCompleted = statusCode === 'completed' || 
                          statusCode === 'paid' || 
                          rawStatus === 'Hoàn thành' || 
                          rawStatus === 'Đã thanh toán';

      const isCancelled = statusCode === 'cancelled' || 
                          rawStatus === 'Huỷ' || 
                          rawStatus === 'Hủy';

      const targetStatus = isCompleted ? 'APPROVED' : (isCancelled ? 'REJECTED' : 'PENDING');

      let resolvedUserId = 'user_guest';
      let resolvedUserName = 'Người dùng Shopee';

      if (rawSub) {
        const cleanSub = rawSub.toLowerCase();
        for (const u of allUsers) {
          const cleanId = (u.id || '').replace('user_', '').replace('google_', '').toLowerCase();
          const cleanName = (u.name || '').toLowerCase().trim();
          const cleanEmailPrefix = (u.email || '').split('@')[0].toLowerCase().trim();
          const subSuffix = cleanSub.split('-').pop();

          const isIdMatch = cleanId && (cleanSub.includes(cleanId) || cleanSub === 'u_' + cleanId || cleanSub.includes((u.id || '').toLowerCase()));
          const isNameMatch = cleanName && cleanName.length > 2 && (cleanSub.includes(cleanName) || (subSuffix.length > 2 && cleanName.includes(subSuffix)));
          const isEmailMatch = cleanEmailPrefix && cleanEmailPrefix.length > 2 && (cleanSub.includes(cleanEmailPrefix) || (subSuffix.length > 2 && cleanEmailPrefix.includes(subSuffix)));

          if (isIdMatch || isNameMatch || isEmailMatch) {
            resolvedUserId = u.id;
            resolvedUserName = u.name || u.email || resolvedUserName;
            matchedCount++;
            break;
          }
        }

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

      const tier = await getCachedTier(resolvedUserId);
      const userCb = Math.round(comm * Math.min(100, baseRate + (MEMBER_RULES[tier]?.bonus || 0)) / 100);
      const adminRev = comm - userCb;

      const existingRes = await query(`
        SELECT id, status, "userCashback", "userId" 
        FROM public."AffiliateOrder" 
        WHERE "orderCode" = $1 AND ("productName" = $2 OR "productName" = 'Sản phẩm Shopee')
      `, [orderCode, productName]);

      let orderTimestamp = item.purchase_time ? Number(item.purchase_time) : null;
      if (!orderTimestamp && /^\d{6}/.test(orderCode)) {
        const yy = orderCode.slice(0, 2);
        const mm = orderCode.slice(2, 4);
        const dd = orderCode.slice(4, 6);
        const parsedDate = new Date(`20${yy}-${mm}-${dd}T12:00:00.000Z`);
        if (!isNaN(parsedDate.getTime())) {
          orderTimestamp = parsedDate.getTime() / 1000;
        }
      }
      if (!orderTimestamp) {
        orderTimestamp = Date.now() / 1000;
      }

      if (existingRes.rows.length === 0) {
        newOrdersCount++;
        await query(`
          INSERT INTO public."AffiliateOrder" (
            id, "orderCode", "userId", "userName", "productName", "shopName", "imageUrl",
            "orderValue", "shopeeCommission", "userCashback", "adminRevenue", status, "subId", "createdAt", "approvedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
            TO_TIMESTAMP($13), NULL
          )
        `, [
          orderCode,
          resolvedUserId,
          resolvedUserName,
          productName,
          item.affiliate || 'Shopee Mall',
          item.image || '',
          orderVal,
          comm,
          userCb,
          adminRev,
          'PENDING',
          rawSub || 'app_direct',
          orderTimestamp
        ]);

        const createdRes = await query(`
          SELECT id FROM public."AffiliateOrder" 
          WHERE "orderCode"=$1 AND "productName"=$2 
          ORDER BY "createdAt" DESC LIMIT 1
        `, [orderCode, productName]);
        const createdId = createdRes.rows[0]?.id;

        if (resolvedUserId !== 'user_guest' && createdId) {
          await query(`UPDATE public."Wallet" SET pending=pending+$1,"updatedAt"=now() WHERE "userId"=$2`, [userCb, resolvedUserId]);
          await query(`INSERT INTO public."WalletLedger" ("userId",type,bucket,direction,amount,status,"orderId",description,"idempotencyKey")
            VALUES ($1,'CASHBACK_RECORDED','PENDING','CREDIT',$2,'PENDING',$3,$4,$5) ON CONFLICT DO NOTHING`,
            [resolvedUserId, userCb, String(createdId), 'Cashback đang chờ đối soát cho đơn ' + orderCode, 'order:' + createdId + ':recorded']);
          if (targetStatus === 'APPROVED') {
            completedCount++;
            totalCashbackCredited += userCb;
            await query(`SELECT public.settle_affiliate_order($1,'APPROVED')`, [String(createdId)]);
          }
        }
      } else {
        const prev = existingRes.rows[0];
        if (prev.status !== 'APPROVED' && targetStatus === 'APPROVED') {
          completedCount++;
          totalCashbackCredited += userCb;

          await query(`UPDATE public."AffiliateOrder" SET
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
            productName,
            orderVal,
            comm,
            userCb,
            adminRev,
            prev.id
          ]);

          await query(`SELECT public.settle_affiliate_order($1,'APPROVED')`, [String(prev.id)]);
        }
      }
    } catch (itemErr) {
      console.error('Error processing single sync item:', itemErr);
    }
  }

  return { totalFetched, matchedCount, completedCount, newOrdersCount, totalCashbackCredited };
}
