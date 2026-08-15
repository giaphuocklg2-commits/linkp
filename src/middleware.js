import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const URL='https://vrsaihfqfgmvrtxtyxpf.supabase.co';
const KEY='sb_publishable_LilLYEE6WbODOuiskuRTcQ_ZhpKrZRc';
const publicPaths=['/login','/oauth','/api/app'];
const permissions={
  SUPPORT:['/','/api/stats','/users','/api/users','/orders','/api/orders'],
  FINANCE:['/','/api/stats','/orders','/api/orders','/withdrawals','/api/withdrawals','/tax-report'],
  ADMIN:['/','/api/stats','/announcements','/api/announcements','/remote-config','/vouchers','/api/vouchers','/system-status','/links','/api/links','/referrals','/api/referrals'],
};

export async function middleware(request){
  const path=request.nextUrl.pathname;
  if(publicPaths.some(p=>path.startsWith(p))||path.startsWith('/_next')||path==='/favicon.ico') return NextResponse.next();
  let response=NextResponse.next({request});
  const supabase=createServerClient(URL,KEY,{cookies:{getAll:()=>request.cookies.getAll(),setAll:(list)=>list.forEach(({name,value,options})=>response.cookies.set(name,value,options))}});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){const url=request.nextUrl.clone();url.pathname='/login';url.searchParams.set('next',path);return NextResponse.redirect(url);}
  const roleRes=await fetch(`${URL}/rest/v1/User?email=eq.${encodeURIComponent(user.email)}&select=role&limit=1`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`},cache:'no-store'});
  const rows=roleRes.ok?await roleRes.json():[]; const role=rows[0]?.role||'USER';
  if(role==='SUPER_ADMIN') return response;
  if(role==='SUPPORT' && request.method!=='GET') return NextResponse.json({success:false,error:'SUPPORT chỉ có quyền xem'},{status:403});
  const allowed=(permissions[role]||[]).some(p=>path===p||path.startsWith(p+'/')||path.startsWith(p+'?'));
  if(!allowed) return NextResponse.json({success:false,error:'Không có quyền thực hiện thao tác này'},{status:403});
  return response;
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
