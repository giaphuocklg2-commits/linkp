import { Pool } from 'pg';

const DEFAULT_DB_URL = "postgresql://postgres:giaphuocklg@db.vrsaihfqfgmvrtxtyxpf.supabase.co:5432/postgres";

// Use global variable in serverless environments to prevent multiple pool instances
let pool = global.pgPool;

export function getDb() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || DEFAULT_DB_URL;
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PG client:', err);
    });

    if (process.env.NODE_ENV !== 'production') {
      global.pgPool = pool;
    }
  }
  return pool;
}

export async function query(text, params) {
  try {
    const db = getDb();
    const res = await db.query(text, params);
    return res;
  } catch (error) {
    console.error('Database Query Error:', error.message, 'SQL:', text);
    throw error;
  }
}

export async function transaction(callback) {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
