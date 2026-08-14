import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, email, name, avatar, bankName, accountNumber, accountHolder } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu user id' }, { status: 400 });
    }

    // 1. Upsert User
    const userRes = await query(`
      INSERT INTO public."User" (id, email, name, avatar, role, "createdAt")
      VALUES ($1, $2, $3, $4, 'USER', CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        email = CASE WHEN $2 != '' THEN $2 ELSE public."User".email END,
        name = CASE WHEN $3 != '' THEN $3 ELSE public."User".name END,
        avatar = CASE WHEN $4 != '' THEN $4 ELSE public."User".avatar END
      RETURNING *
    `, [id, email || '', name || 'Người dùng Google', avatar || '']);

    // 2. Ensure Wallet
    const walletRes = await query(`
      INSERT INTO public."Wallet" (id, "userId", "userName", balance, pending, withdrawn, "bankName", "accountNumber", "accountHolder", "updatedAt")
      VALUES (
        gen_random_uuid(), $1, $2, 0, 0, 0, $3, $4, $5, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "userName" = COALESCE(EXCLUDED."userName", public."Wallet"."userName"),
        "bankName" = CASE WHEN $3 IS NOT NULL AND $3 != '' THEN $3 ELSE public."Wallet"."bankName" END,
        "accountNumber" = CASE WHEN $4 IS NOT NULL AND $4 != '' THEN $4 ELSE public."Wallet"."accountNumber" END,
        "accountHolder" = CASE WHEN $5 IS NOT NULL AND $5 != '' THEN $5 ELSE public."Wallet"."accountHolder" END,
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      id,
      name || 'Người dùng Google',
      bankName || null,
      accountNumber || null,
      accountHolder || (name ? name.toUpperCase() : null)
    ]);

    return NextResponse.json({
      success: true,
      user: userRes.rows[0],
      wallet: walletRes.rows[0]
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
