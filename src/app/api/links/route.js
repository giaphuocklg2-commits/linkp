import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let queryBuilder = supabase
      .from('ConvertedLink')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (userId) {
      queryBuilder = queryBuilder.eq('userId', userId);
    }

    const { data: links, error } = await queryBuilder;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      links: links || []
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

    const { data: link, error } = await supabase
      .from('ConvertedLink')
      .insert({
        userId: userId || 'user_default',
        originalUrl,
        destinationUrl: destinationUrl || originalUrl,
        affiliateUrl,
        productName: productName || 'Sản phẩm Shopee',
        shopName: shopName || 'Shopee Mall',
        imageUrl: imageUrl || '',
        price: Number(price) || 0,
        commission: Number(commission) || 0,
        userCommission: Number(userCommission) || 0,
        adminCommission: Number(adminCommission) || 0,
        subId: subId || 'app_direct',
        clicks: 0,
        createdAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      link
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

    const { error } = await supabase.from('ConvertedLink').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Đã xóa link' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
