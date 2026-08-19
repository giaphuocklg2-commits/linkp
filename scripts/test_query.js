require('dotenv').config({ path: '.env.local' });
const { query } = require('../src/lib/db.js');

async function test() {
  try {
    const result = await query(`SELECT u."createdAt",
      COUNT(o.id) FILTER (WHERE o.status='APPROVED')::int AS "approvedOrders",
      rc.value #>> '{}' AS override
      FROM public."User" u
      LEFT JOIN public."AffiliateOrder" o ON o."userId"=u.id
      LEFT JOIN public."RemoteConfig" rc ON rc.key='member_rank:'||u.id
      WHERE u.id=$1 GROUP BY u.id,u."createdAt",rc.value`, ['user_guest']);
    console.log('Result:', result.rows);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();
