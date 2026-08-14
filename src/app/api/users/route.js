import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let sql = `
      SELECT 
        u.id, u.email, u.name, u.phone, u.role, u."createdAt",
        COALESCE(w.balance, 0) as balance,
        COALESCE(w.pending, 0) as pending,
        COALESCE(w.withdrawn, 0) as withdrawn,
        COALESCE(w."bankName", '') as "bankName",
        COALESCE(w."accountNumber", '') as "accountNumber",
        COALESCE(w."accountHolder", '') as "accountHolder",
        w."updatedAt" as "walletUpdatedAt"
      FROM public."User" u
      LEFT JOIN public."Wallet" w ON u.id = w."userId"
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.id ILIKE $${params.length})`;
    }

    sql += ` ORDER BY u."createdAt" DESC LIMIT 100`;

    const res = await query(sql, params);
    return NextResponse.json({
      success: true,
      users: res.rows
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
    const userRes = await query(`
      INSERT INTO public."User" (id, email, name, avatar, role, "createdAt")
      VALUES ($1, $2, $3, $4, COALESCE($5, 'USER'), CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public."User".email),
        name = COALESCE(EXCLUDED.name, public."User".name),
        avatar = COALESCE(EXCLUDED.avatar, public."User".avatar)
      RETURNING *
    `, [id, email || '', name || 'Người dùng Google', avatar || '', role || 'USER']);

    // 2. Ensure Wallet exists
    const walletRes = await query(`
      INSERT INTO public."Wallet" (id, "userId", "userName", balance, pending, withdrawn, "bankName", "accountNumber", "accountHolder", "updatedAt")
      VALUES (
        gen_random_uuid(), $1, $2, 0, 0, 0, $3, $4, $5, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "userName" = COALESCE(EXCLUDED."userName", public."Wallet"."userName"),
        "bankName" = CASE WHEN $3 IS NOT NULL AND $3 != '' THEN $3 ELSE public."Wallet"."bankName" END,
        "accountNumber" = CASE WHEN $4 IS NOT NULL AND $4 != '' THEN $4 ELSE public."Wallet"."accountNumber" END,
        "accountHolder" = CASE WHEN $5 IS NOT NULL AND $5 != '' THEN $5 ELSE public."Wallet"."accountHolder" END
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

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { userId, name, email, role, balance, pending, withdrawn, bankName, accountNumber, accountHolder } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Thiếu userId' }, { status: 400 });
    }

    // 1. Update User info if provided
    if (name || email || role) {
      await query(`
        UPDATE public."User"
        SET 
          name = COALESCE($1, name),
          email = COALESCE($2, email),
          role = COALESCE($3, role)
        WHERE id = $4
      `, [name || null, email || null, role || null, userId]);
    }

    // 2. Update or Upsert Wallet
    const walletRes = await query(`
      INSERT INTO public."Wallet" (id, "userId", "userName", balance, pending, withdrawn, "bankName", "accountNumber", "accountHolder", "updatedAt")
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "userName" = COALESCE(EXCLUDED."userName", public."Wallet"."userName"),
        balance = CASE WHEN $3 IS NOT NULL THEN $3 ELSE public."Wallet".balance END,
        pending = CASE WHEN $4 IS NOT NULL THEN $4 ELSE public."Wallet".pending END,
        withdrawn = CASE WHEN $5 IS NOT NULL THEN $5 ELSE public."Wallet".withdrawn END,
        "bankName" = COALESCE($6, public."Wallet"."bankName"),
        "accountNumber" = COALESCE($7, public."Wallet"."accountNumber"),
        "accountHolder" = COALESCE($8, public."Wallet"."accountHolder"),
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      userId,
      name || 'Người dùng',
      balance !== undefined ? Number(balance) : null,
      pending !== undefined ? Number(pending) : null,
      withdrawn !== undefined ? Number(withdrawn) : null,
      bankName || null,
      accountNumber || null,
      accountHolder || null
    ]);

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thông tin và số dư của User ${userId} thành công!`,
      wallet: walletRes.rows[0]
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
