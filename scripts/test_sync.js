const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:giaphuocklg@db.vrsaihfqfgmvrtxtyxpf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('--- TEST CONNECTING DATABASE ---');
  try {
    const res = await pool.query('SELECT count(*) FROM public."User"');
    console.log('User count in Database:', res.rows[0].count);

    const ordersRes = await pool.query('SELECT count(*) FROM public."AffiliateOrder"');
    console.log('AffiliateOrder count in Database:', ordersRes.rows[0].count);

    const walletRes = await pool.query('SELECT sum(balance) as total_balance, sum(pending) as total_pending FROM public."Wallet"');
    console.log('Wallet sums:', walletRes.rows[0]);

    console.log('--- DATABASE CONNECTION SUCCESSFUL ---');
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await pool.end();
  }
}

main();
