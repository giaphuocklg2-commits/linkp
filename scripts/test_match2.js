require('dotenv').config({ path: '.env.local' });
const { query } = require('../src/lib/db.js');

async function testMatch() {
  try {
    const API_KEY = process.env.ADDLIVETAG_API_KEY || 'd563fb333878a1ec9816ab22092ce10055adff1567cabc5f';
    const CONVERSIONS_URL = 'https://addlivetag.com/api/v1/conversions.php';
    
    // 1. Fetch live conversions
    const response = await fetch(`${CONVERSIONS_URL}?type=items&page_size=100`, {
      headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' }
    });
    const payload = await response.json();
    const items = payload.data || [];

    // 2. Load users
    const usersRes = await query(`SELECT id, name, email FROM public."User"`);
    const allUsers = usersRes.rows || [];

    // 3. Find link4p items
    const link4pItems = items.filter(i => JSON.stringify(i).includes('link4p'));
    console.log(`Found ${link4pItems.length} link4p items.`);

    for (const item of link4pItems) {
      let rawSub = (item.sub_id1 || item.utm || '').trim();
      const utm = (item.utm || '').trim();
      if (utm && utm !== '----' && !utm.startsWith('default-default')) {
        rawSub = utm;
      }

      console.log(`Processing Order ${item.order_sn}: rawSub=${rawSub}`);
      
      let resolvedUserId = 'user_guest';
      const cleanSub = rawSub.toLowerCase();
      
      for (const u of allUsers) {
        const cleanId = (u.id || '').replace('user_', '').replace('google_', '').toLowerCase();
        if (cleanSub.includes(cleanId) || cleanSub === 'u_' + cleanId || cleanSub.includes((u.id || '').toLowerCase())) {
          resolvedUserId = u.id;
          break;
        }
      }
      console.log(`  -> Matched User: ${resolvedUserId}`);
    }

  } catch (err) {
    console.error('ERROR:', err);
  }
}
testMatch();
