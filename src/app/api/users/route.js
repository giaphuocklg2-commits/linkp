import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { query } from '@/lib/db';
import { calculateTier, MEMBER_RULES } from '@/lib/membership';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Fetch users and their wallets
    const [{ data: users = [], error: errU }, { data: wallets = [], error: errW }] = await Promise.all([
      supabase.from('User').select('*').order('createdAt', { ascending: false }).limit(100),
      supabase.from('Wallet').select('*')
    ]);

    if (errU) throw errU;

    const walletMap = {};
    wallets.forEach(w => {
      walletMap[w.userId] = w;
    });

    const rankResult = await query(`SELECT "userId", COUNT(*)::int AS "approvedOrders"
      FROM public."AffiliateOrder" WHERE status='APPROVED' GROUP BY "userId"`);
    const approvedOrderMap = Object.fromEntries(rankResult.rows.map(row => [row.userId, Number(row.approvedOrders) || 0]));
    const overrideResult = await query(`SELECT substring(key from 13) AS "userId", value #>> '{}' AS rank FROM public."RemoteConfig" WHERE key LIKE 'member_rank:%'`);
    const overrideMap = Object.fromEntries(overrideResult.rows.map(row => [row.userId,row.rank]));

    let merged = users.map(u => {
      const w = walletMap[u.id] || {};
      const approvedOrders = approvedOrderMap[u.id] || 0;
      const memberDays = Math.max(0, Math.floor((Date.now() - new Date(u.createdAt).getTime()) / 86400000));
      const rankOverride = overrideMap[u.id] || null;
      const rank = calculateTier(approvedOrders,memberDays,rankOverride);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        balance: Number(w.balance) || 0,
        pending: Number(w.pending) || 0,
        withdrawn: Number(w.withdrawn) || 0,
        bankName: w.bankName || '',
        accountNumber: w.accountNumber || '',
        accountHolder: w.accountHolder || '',
        walletUpdatedAt: w.updatedAt || null,
        approvedOrders,
        memberDays,
        rank,
        rankOverride,
        bonusRate: MEMBER_RULES[rank].bonus
      };
    });

    if (search) {
      const q = search.toLowerCase();
      merged = merged.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      users: merged
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, email, name, avatar, role, bankName, accountNumber, accountHolder } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu user id' }, { status: 400 });
    }

    // 1. Upsert User
    const { data: user, error: errUser } = await supabase
      .from('User')
      .upsert({
        id,
        email: email || '',
        name: name || 'Người dùng Google',
        avatar: avatar || '',
        role: role || 'USER'
      })
      .select()
      .single();

    if (errUser) throw errUser;

    // 2. Ensure Wallet
    const { data: wallet, error: errWallet } = await supabase
      .from('Wallet')
      .upsert({
        userId: id,
        userName: name || 'Người dùng Google',
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        accountHolder: accountHolder || (name ? name.toUpperCase() : null),
        updatedAt: new Date().toISOString()
      }, { onConflict: 'userId' })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      user,
      wallet
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { userId, name, email, role, balance, pending, withdrawn, bankName, accountNumber, accountHolder, rankOverride } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Thiếu userId' }, { status: 400 });
    }
    if (role) {
      const currentRole = await query(`SELECT role FROM public."User" WHERE id=$1 LIMIT 1`,[userId]);
      if (currentRole.rows[0]?.role !== role) {
        const auth = await createClient(); const {data:{user:actor}} = await auth.auth.getUser();
        let actorEmail = actor?.email;
        if (!actorEmail) {
          const appToken = request.cookies.get('lp_app_admin')?.value;
          if (appToken) {
            const { verifyAppAdminToken } = require('@/lib/appAdminSession');
            const appSession = await verifyAppAdminToken(appToken);
            if (appSession) actorEmail = appSession.email;
          }
        }
        const actorRole = actorEmail ? await query(`SELECT role FROM public."User" WHERE email=$1 LIMIT 1`,[actorEmail]) : {rows:[]};
        if (actorRole.rows[0]?.role !== 'SUPER_ADMIN') return NextResponse.json({success:false,error:'Chỉ SUPER_ADMIN được cấp hoặc thu hồi quyền'},{status:403});
      }
    }
    if (rankOverride !== undefined) {
      if (rankOverride === null || rankOverride === '' || rankOverride === 'AUTO') {
        await query(`DELETE FROM public."RemoteConfig" WHERE key=$1`, ['member_rank:'+userId]);
      } else if (['SILVER','GOLD','PLATINUM'].includes(rankOverride)) {
        await query(`INSERT INTO public."RemoteConfig" (key,value,description,"updatedAt") VALUES ($1,$2::jsonb,$3,now())
          ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,description=EXCLUDED.description,"updatedAt"=now()`,
          ['member_rank:'+userId,JSON.stringify(rankOverride),'Admin đặt rank thủ công']);
      } else return NextResponse.json({success:false,error:'Rank không hợp lệ'},{status:400});
    }

    // 1. Update User
    if (name || email || role) {
      const userPayload = {};
      if (name) userPayload.name = name;
      if (email) userPayload.email = email;
      if (role) userPayload.role = role;
      await supabase.from('User').update(userPayload).eq('id', userId);
    }

    // 2. Update Wallet
    const walletPayload = {
      updatedAt: new Date().toISOString()
    };
    if (name) walletPayload.userName = name;
    if (bankName !== undefined) walletPayload.bankName = bankName;
    if (accountNumber !== undefined) walletPayload.accountNumber = accountNumber;
    if (accountHolder !== undefined) walletPayload.accountHolder = accountHolder;

    const walletResult = await query(`INSERT INTO public."Wallet"
      (id,"userId","userName",balance,pending,withdrawn,"bankName","accountNumber","accountHolder","updatedAt")
      VALUES (gen_random_uuid(),$1,$2,0,0,0,$3,$4,$5,now())
      ON CONFLICT ("userId") DO UPDATE SET
        "userName"=COALESCE($2,public."Wallet"."userName"),
        "bankName"=$3,"accountNumber"=$4,"accountHolder"=$5,"updatedAt"=now()
      RETURNING *`, [userId,name || 'Người dùng',bankName ?? null,accountNumber ?? null,accountHolder ?? null]);
    let wallet = walletResult.rows[0];
    if (balance !== undefined || pending !== undefined || withdrawn !== undefined) {
      const adjusted = await query('SELECT (public.admin_adjust_wallet($1,$2,$3,$4,$5,$6)).*', [userId,balance===undefined?null:Number(balance),pending===undefined?null:Number(pending),withdrawn===undefined?null:Number(withdrawn),'Điều chỉnh từ LinkP Admin',`admin:${userId}:${Date.now()}`]);
      wallet = adjusted.rows[0];
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thông tin và số dư của User ${userId} thành công!`,
      wallet
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
