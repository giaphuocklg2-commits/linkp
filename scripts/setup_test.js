require('dotenv').config({ path: '.env.local' });
const { query } = require('../src/lib/db.js');

async function setupTest() {
  try {
    console.log('1. Creating test user...');
    await query(`INSERT INTO public."User" (id, name, email, avatar, "createdAt") 
                 VALUES ('user_79121453361548648', 'Quyen Tester', 'quyen@link4p.com', '', now()) 
                 ON CONFLICT (id) DO NOTHING`);
    
    console.log('2. Deleting the 3 link4p orders so sync can re-insert them...');
    await query(`DELETE FROM public."AffiliateOrder" WHERE "orderCode" IN ('260817JF62BX07', '260817JF1JCY3C', '260817JES3FTR7')`);

    console.log('Done! Now the user can click Sync on frontend to see it work.');
  } catch (err) {
    console.error('ERROR:', err);
  }
}
setupTest();
