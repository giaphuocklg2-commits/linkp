const { Pool } = require('pg');

const connStr = process.env.DATABASE_URL || 'postgresql://postgres:giaphuocklg@db.vrsaihfqfgmvrtxtyxpf.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000
});

async function main() {
  try {
    const res = await pool.query('SELECT COUNT(*) as count FROM public."WithdrawalRequest"');
    console.log('PG TEST SUCCESS! Withdrawal count:', res.rows[0].count);
    const users = await pool.query('SELECT COUNT(*) as count FROM public."User"');
    console.log('PG TEST SUCCESS! User count:', users.rows[0].count);
    await pool.end();
  } catch (err) {
    console.error('PG ERROR:', err);
  }
}

main();
