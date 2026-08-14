import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let sql = `SELECT * FROM public."ConvertedLink"`;
    const params = [];

    if (userId) {
      params.push(userId);
      sql += ` WHERE "userId" = $1`;
    }

    sql += ` ORDER BY "createdAt" DESC LIMIT 100`;

    const res = await query(sql, params);
    return NextResponse.json({
      success: true,
      links: res.rows
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { originalUrl, destinationUrl, affiliateUrl, productName, shopName, imageUrl, price, commission, userCommission, adminCommission, subId, userId } = body;

    if (!originalUrl || !affiliateUrl) {
      return NextResponse.json({ success: false, error: 'Thiếu link gốc hoặc link tiếp thị' }, { status: 400 });
    }

    const res = await query(`
      INSERT INTO public."ConvertedLink" (
        id, "userId", "originalUrl", "destinationUrl", "affiliateUrl", "productName",
        "shopName", "imageUrl", price, commission, "userCommission", "adminCommission", "subId", clicks, "createdAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, CURRENT_TIMESTAMP
      )
      RETURNING *
    `, [
      userId || 'user_default',
      originalUrl,
      destinationUrl || originalUrl,
      affiliateUrl,
      productName || 'Sản phẩm Shopee',
      shopName || 'Shopee Mall',
      imageUrl || '',
      Number(price) || 0,
      Number(commission) || 0,
      Number(userCommission) || 0,
      Number(adminCommission) || 0,
      subId || 'app_direct'
    ]);

    return NextResponse.json({
      success: true,
      link: res.rows[0]
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
      return NextResponse.json({ success: false, error: 'Thiếu ID link' }, { status: 400 });
    }

    await query(`DELETE FROM public."ConvertedLink" WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: 'Đã xóa link' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
