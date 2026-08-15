'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage(){
  const router=useRouter(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  const login=async(e)=>{e.preventDefault();setLoading(true);setError('');const supabase=createClient();const {error:authError}=await supabase.auth.signInWithPassword({email,password});if(authError){setError('Email hoặc mật khẩu quản trị không đúng.');setLoading(false);return;}router.replace('/');router.refresh();};
  return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-5"><form onSubmit={login} className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-5"><div><div className="text-xs font-black text-blue-600 tracking-widest">LINKP CONTROL</div><h1 className="text-2xl font-black text-slate-900 mt-1">Đăng nhập quản trị</h1><p className="text-sm text-slate-500 mt-2">Chỉ tài khoản đã được cấp quyền mới truy cập được.</p></div><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email quản trị" className="w-full px-4 py-3 rounded-xl border border-slate-200"/><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mật khẩu" className="w-full px-4 py-3 rounded-xl border border-slate-200"/>{error&&<div className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3">{error}</div>}<button disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 text-white font-black disabled:opacity-50">{loading?'ĐANG XÁC THỰC...':'ĐĂNG NHẬP AN TOÀN'}</button></form></main>;
}
