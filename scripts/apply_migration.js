require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { query } = require('../src/lib/db.js');

async function apply() {
  try {
    const sql = fs.readFileSync('./migrations/005_fix_guest_wallet_creation.sql', 'utf8');
    await query(sql);
    console.log('Applied migration successfully!');
  } catch (err) {
    console.error('CRASH:', err);
  }
}
apply();
