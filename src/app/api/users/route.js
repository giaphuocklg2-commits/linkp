import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { query } from '@/lib/db';

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

    let merged = users.map(u => {
      const w = walletMap[u.id] || {};
      const approvedOrders = approvedOrderMap[u.id] || 0;
      const memberDays = Math.max(0, Math.floor((Date.now() - new Date(u.createdAt).getTime()) / 86400000));
      const rank = approvedOrders >= 30 || memberDays >= 365 ? 'PLATINUM' : approvedOrders >= 10 || memberDays >= 90 ? 'GOLD' : 'SILVER';
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
        rank
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
    const { userId, name, email, role, balance, pending, withdrawn, bankName, accountNumber, accountHolder } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Thiếu userId' }, { status: 400 });
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

    const { data: walletBase, error: errWallet } = await supabase
      .from('Wallet')
      .upsert({
        userId,
        userName: name || 'Người dùng',
        ...walletPayload
      }, { onConflict: 'userId' })
      .select()
      .single();

    if (errWallet) throw errWallet;
    let wallet = walletBase;
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
