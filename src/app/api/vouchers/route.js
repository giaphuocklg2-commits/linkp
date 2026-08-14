import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    let sql = `SELECT * FROM public."Voucher" WHERE "isActive" = TRUE`;
    const params = [];

    if (shop && shop !== 'ALL' && shop !== 'Tất cả') {
      params.push(shop);
      sql += ` AND shop ILIKE $${params.length}`;
    }

    sql += ` ORDER BY "createdAt" DESC LIMIT 100`;

    const res = await query(sql, params);
    return NextResponse.json({
      success: true,
      vouchers: res.rows
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, shop, scope, discount, minOrder, expiry, link } = body;

    if (!code || !discount) {
      return NextResponse.json({ success: false, error: 'Thiếu mã voucher hoặc mức giảm' }, { status: 400 });
    }

    const res = await query(`
      INSERT INTO public."Voucher" (id, code, shop, scope, discount, "minOrder", expiry, link, "isActive", "createdAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, TRUE, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO UPDATE SET
        shop = EXCLUDED.shop,
        scope = EXCLUDED.scope,
        discount = EXCLUDED.discount,
        "minOrder" = EXCLUDED."minOrder",
        expiry = EXCLUDED.expiry,
        link = EXCLUDED.link,
        "isActive" = TRUE
      RETURNING *
    `, [
      code.toUpperCase().trim(),
      shop || 'Shopee',
      scope || 'Toàn sàn',
      discount,
      minOrder || 'Đơn từ 0Đ',
      expiry || '31/12/2026',
      link || 'https://shopee.vn'
    ]);

    return NextResponse.json({
      success: true,
      voucher: res.rows[0]
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID voucher' }, { status: 400 });
    }

    await query(`DELETE FROM public."Voucher" WHERE id = $1 OR code = $1`, [id]);
    return NextResponse.json({ success: true, message: 'Đã xóa voucher thành công' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
