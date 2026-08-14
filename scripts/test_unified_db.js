const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vrsaihfqfgmvrtxtyxpf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LilLYEE6WbODOuiskuRTcQ_ZhpKrZRc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
  console.log('Testing Supabase REST fallback...');
  
  // 1. Test stats
  const { data: orders } = await supabase.from('AffiliateOrder').select('*');
  const { data: withdrawals } = await supabase.from('WithdrawalRequest').select('*');
  const { data: links } = await supabase.from('ConvertedLink').select('*', { count: 'exact' });
  const { data: users } = await supabase.from('User').select('*, Wallet(*)');

  console.log('Orders count:', orders?.length);
  console.log('Withdrawals count:', withdrawals?.length);
  console.log('Users count:', users?.length);
}

runTest();
