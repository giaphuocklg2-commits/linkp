require('dotenv').config({ path: '.env.local' });
const { query } = require('../src/lib/db.js');

async function fixSubIds() {
  try {
    const API_KEY = process.env.ADDLIVETAG_API_KEY || 'd563fb333878a1ec9816ab22092ce10055adff1567cabc5f';
    const CONVERSIONS_URL = 'https://addlivetag.com/api/v1/conversions.php';
    const pageSize = '500'; // fetch more to be safe
    const type = 'items';

    console.log('Fetching live conversions to fix sub_ids...');
    const response = await fetch(`${CONVERSIONS_URL}?type=${type}&page_size=${pageSize}`, {
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'LinkP-Admin/2.0'
      }
    });

    if (!response.ok) throw new Error('API failed');

    const payload = await response.json();
    const items = payload.data || [];

    let fixedCount = 0;
    for (const item of items) {
      const orderCode = (item.order_sn || item.checkout_id || '').trim().toUpperCase();
      if (!orderCode) continue;

      let rawSub = (item.sub_id1 || item.utm || '').trim();
      const utm = (item.utm || '').trim();
      if (utm && utm !== '----' && !utm.startsWith('default-default')) {
        rawSub = utm;
      }

      if (rawSub && rawSub !== '----') {
        const res = await query(`UPDATE public."AffiliateOrder" SET "subId" = $1 WHERE "orderCode" = $2 AND "subId" != $1 RETURNING id`, [rawSub, orderCode]);
        if (res.rows.length > 0) {
          console.log(`Fixed order ${orderCode}: set subId to ${rawSub}`);
          fixedCount++;
        }
      }
    }
    console.log(`Successfully fixed ${fixedCount} orders.`);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
fixSubIds();
