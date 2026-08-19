require('dotenv').config({ path: '.env.local' });
const { query } = require('../src/lib/db.js');

async function runTest() {
  try {
    console.log('1. Creating test user...');
    await query(`INSERT INTO public."User" (id, name, email, avatar, "createdAt") 
                 VALUES ('user_79121453361548648', 'Quyen Tester', 'quyen@link4p.com', '', now()) 
                 ON CONFLICT (id) DO NOTHING`);
    
    console.log('2. Deleting the 3 link4p orders so sync can re-insert them...');
    await query(`DELETE FROM public."AffiliateOrder" WHERE "orderCode" IN ('260817JF62BX07', '260817JF1JCY3C', '260817JES3FTR7')`);

    console.log('3. Running sync API locally via POST handler...');
    const { POST } = require('../src/app/api/orders/sync/route.js');
    const req = { url: 'http://localhost/api/orders/sync' };
    const res = await POST(req);
    const json = await res.json();
    console.log('Sync result:', json);

    console.log('4. Checking if orders were assigned to Quyen Tester...');
    const orders = await query(`SELECT "orderCode", "userId", "userName", "subId" FROM public."AffiliateOrder" WHERE "orderCode" IN ('260817JF62BX07', '260817JF1JCY3C', '260817JES3FTR7')`);
    console.table(orders.rows);

  } catch (err) {
    console.error('ERROR:', err);
  }
}
runTest();
