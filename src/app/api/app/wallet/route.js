import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId) {
      return NextResponse.json({ success: true, wallet: { balance: 0, pending: 0, withdrawn: 0, bankName: '', accountNumber: '', accountHolder: '' } });
    }

    let effectiveId = userId;
    let res = await query(`SELECT * FROM public."Wallet" WHERE "userId" = $1`, [effectiveId]);
    if (res.rows.length === 0 && email) {
      const existing = await query(`SELECT id FROM public."User" WHERE email=$1 LIMIT 1`, [email]);
      if (existing.rows.length) {
        effectiveId = existing.rows[0].id;
        res = await query(`SELECT * FROM public."Wallet" WHERE "userId"=$1`, [effectiveId]);
      }
    }
    
    if (res.rows.length === 0) {
      const created = await query(`INSERT INTO public."Wallet"
        (id,"userId","userName",balance,pending,withdrawn,"bankName","accountNumber","accountHolder","updatedAt")
        VALUES (gen_random_uuid(),$1,'Người dùng',0,0,0,'','','',now())
        ON CONFLICT ("userId") DO UPDATE SET "updatedAt"=public."Wallet"."updatedAt"
        RETURNING *`, [effectiveId]);
      res = created;
    }

    const w = res.rows[0];
    return NextResponse.json({
      success: true,
      wallet: {
        userId: w.userId,
        userName: w.userName,
        balance: Number(w.balance) || 0,
        pending: Number(w.pending) || 0,
        withdrawn: Number(w.withdrawn) || 0,
        bankName: w.bankName || '',
        accountNumber: w.accountNumber || '',
        accountHolder: w.accountHolder || '',
      }
    });
  } catch (error) {
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
      const existing = await query(`SELECT id FROM public."User" WHERE email=$1 LIMIT 1`, [email]);
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
