'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage(){
  const router=useRouter(); 
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if(searchParams.get('error')==='403') {
      setError('Bạn không có quyền truy cập, vui lòng đăng nhập bằng tài khoản khác.');
      const supabase = createClient();
      supabase.auth.signOut();
      document.cookie = 'lp_app_admin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }, []);

  const login=async(e)=>{
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase=createClient();
    const {error:authError}=await supabase.auth.signInWithPassword({email,password});
    if(authError){
      setError('Email hoặc mật khẩu quản trị không đúng.');
      setLoading(false);
      return;
    }
    router.replace('/');
    router.refresh();
  };
  
  const loginGoogle = async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/'
      }
    });
  };

  return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-5"><form onSubmit={login} className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-5"><div><div className="text-xs font-black text-blue-600 tracking-widest">LINKP CONTROL</div><h1 className="text-2xl font-black text-slate-900 mt-1">Đăng nhập quản trị</h1><p className="text-sm text-slate-500 mt-2">Chỉ tài khoản đã được cấp quyền mới truy cập được.</p></div><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email quản trị" className="w-full px-4 py-3 rounded-xl border border-slate-200"/><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mật khẩu" className="w-full px-4 py-3 rounded-xl border border-slate-200"/>{error&&<div className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3">{error}</div>}<button disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 text-white font-black disabled:opacity-50">{loading?'ĐANG XÁC THỰC...':'ĐĂNG NHẬP BẰNG MẬT KHẨU'}</button><div className="relative flex items-center py-2"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink-0 mx-4 text-slate-400 text-sm">hoặc</span><div className="flex-grow border-t border-slate-200"></div></div><button type="button" onClick={loginGoogle} disabled={loading} className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"><svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg> ĐĂNG NHẬP BẰNG GOOGLE</button></form></main>;
}
