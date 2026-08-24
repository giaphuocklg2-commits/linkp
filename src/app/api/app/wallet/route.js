import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json({
        success: true,
        wallet: { userId: 'user_default', subId: 'user_default', balance: 0, pending: 0, withdrawn: 0, bankName: '', accountNumber: '', accountHolder: '' }
      });
    }

    let effectiveId = userId;
    let officialUser = null;

    // 1. Resolve official User ID (Sub_ID) directly from DB User table
    if (email) {
      const uRes = await query(`SELECT id, name, email FROM public."User" WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email.trim()]);
      if (uRes.rows.length) {
        officialUser = uRes.rows[0];
        effectiveId = officialUser.id;
      }
    }

    if (!officialUser && effectiveId) {
      const uRes = await query(`SELECT id, name, email FROM public."User" WHERE id = $1 LIMIT 1`, [effectiveId]);
      if (uRes.rows.length) {
        officialUser = uRes.rows[0];
      }
    }

    // 2. Query Wallet table for official DB User ID
    let res = await query(`SELECT * FROM public."Wallet" WHERE "userId" = $1`, [effectiveId]);

    if (res.rows.length === 0) {
      const created = await query(`
        INSERT INTO public."Wallet"
        (id, "userId", "userName", balance, pending, withdrawn, "bankName", "accountNumber", "accountHolder", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, 0, 0, 0, '', '', '', now())
        ON CONFLICT ("userId") DO UPDATE SET "updatedAt" = public."Wallet"."updatedAt"
        RETURNING *
      `, [effectiveId, officialUser?.name || 'Người dùng']);
      res = created;
    }

    const w = res.rows[0];
    return NextResponse.json({
      success: true,
      wallet: {
        userId: effectiveId,
        subId: effectiveId,
        userName: officialUser?.name || w.userName,
        balance: Number(w.balance) || 0,
        pending: Number(w.pending) || 0,
        withdrawn: Number(w.withdrawn) || 0,
        bankName: w.bankName || '',
        accountNumber: w.accountNumber || '',
        accountHolder: w.accountHolder || '',
      }
    });
  } catch (error) {
    console.error('Error fetching app wallet:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, email, userName, bankName, accountNumber, accountHolder } = body;

    if (!userId || !bankName || !accountNumber) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin ngân hàng' }, { status: 400 });
    }

    let effectiveId = userId;
    if (email) {
      const existing = await query(`SELECT id FROM public."User" WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email.trim()]);
      if (existing.rows.length) effectiveId = existing.rows[0].id;
    }
    const res = await query(`
      INSERT INTO public."Wallet" (id, "userId", "userName", balance, pending, withdrawn, "bankName", "accountNumber", "accountHolder", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 0, 0, 0, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId") DO UPDATE SET
        "bankName" = EXCLUDED."bankName",
        "accountNumber" = EXCLUDED."accountNumber",
        "accountHolder" = EXCLUDED."accountHolder",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      effectiveId,
      userName || 'Người dùng',
      bankName.trim().toUpperCase(),
      accountNumber.trim(),
      (accountHolder || '').trim().toUpperCase()
    ]);

    return NextResponse.json({
      success: true,
      wallet: res.rows[0],
      message: 'Cập nhật tài khoản ngân hàng thành công'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
