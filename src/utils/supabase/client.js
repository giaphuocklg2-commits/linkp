import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vrsaihfqfgmvrtxtyxpf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_LilLYEE6WbODOuiskuRTcQ_ZhpKrZRc';

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
