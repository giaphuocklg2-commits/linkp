const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:giaphuocklg@db.vrsaihfqfgmvrtxtyxpf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const API_KEY = 'd563fb333878a1ec9816ab22092ce10055adff1567cabc5f';
const API_URL = 'https://addlivetag.com/api/v1/conversions.php?type=items&page_size=20';

async function testSync() {
  console.log('--- TESTING ADDLIVETAG API SYNC ---');
  try {
    const res = await fetch(API_URL, {
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'LinkP-Sync-Test/2.0'
      }
    });

    console.log('API Status:', res.status);
    const json = await res.json();
    console.log('Meta:', json.meta);
    console.log('Summary:', json.summary);
    console.log('Items received:', (json.data || []).length);

    if (json.data && json.data.length > 0) {
      console.log('Sample item 1:');
      console.log('  Order SN:', json.data[0].order_sn || json.data[0].checkout_id);
      console.log('  Product:', json.data[0].item_name);
      console.log('  Status:', json.data[0].status, '| Code:', json.data[0].status_code);
      console.log('  Commission Status:', json.data[0].commission_status);
      console.log('  Order Value:', json.data[0].order_value, 'VNĐ');
      console.log('  Shopee Commission:', json.data[0].commission, 'VNĐ');
      console.log('  Sub ID / UTM:', json.data[0].sub_id1 || json.data[0].utm);
    }
  } catch (err) {
    console.error('Error during sync test:', err);
  } finally {
    await pool.end();
  }
}

testSync();
