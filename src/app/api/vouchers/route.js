import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    let queryBuilder = supabase
      .from('Voucher')
      .select('*')
      .eq('isActive', true)
      .order('createdAt', { ascending: false })
      .limit(100);

    if (shop && shop !== 'ALL' && shop !== 'Tất cả') {
      queryBuilder = queryBuilder.ilike('shop', `%${shop}%`);
    }

    const { data: vouchers, error } = await queryBuilder;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      vouchers: vouchers || []
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

    const { data: voucher, error } = await supabase
      .from('Voucher')
      .upsert({
        code: code.toUpperCase().trim(),
        shop: shop || 'Shopee',
        scope: scope || 'Toàn sàn',
        discount,
        minOrder: minOrder || 'Đơn từ 0Đ',
        expiry: expiry || '31/12/2026',
        link: link || 'https://shopee.vn',
        isActive: true,
        createdAt: new Date().toISOString()
      }, { onConflict: 'code' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      voucher
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

    const { error } = await supabase
      .from('Voucher')
      .delete()
      .or(`id.eq.${id},code.eq.${id}`);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Đã xóa voucher thành công' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
