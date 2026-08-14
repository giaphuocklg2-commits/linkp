import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vrsaihfqfgmvrtxtyxpf.supabase.co';
const supabaseKey = 'sb_publishable_LilLYEE6WbODOuiskuRTcQ_ZhpKrZRc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing connection to Supabase:', supabaseUrl);
  try {
    const { data, error } = await supabase.from('ConvertedLink').select('*').limit(5);
    console.log('ConvertedLink:', { data, error });
  } catch (err) {
    console.error('Error querying ConvertedLink:', err);
  }

  try {
    const { data, error } = await supabase.from('AffiliateOrder').select('*').limit(5);
    console.log('AffiliateOrder:', { data, error });
  } catch (err) {
    console.error('Error querying AffiliateOrder:', err);
  }

  try {
    const { data, error } = await supabase.from('WithdrawalRequest').select('*').limit(5);
    console.log('WithdrawalRequest:', { data, error });
  } catch (err) {
    console.error('Error querying WithdrawalRequest:', err);
  }
}

test();
