require('dotenv').config({ path: '.env.local' });
const { query } = require('../src/lib/db.js');

async function check() {
  const res = await query(`SELECT id, price, commission, "originalUrl", "createdAt" FROM public."ConvertedLink" ORDER BY "createdAt" DESC LIMIT 10`);
  console.table(res.rows);
}
check();
