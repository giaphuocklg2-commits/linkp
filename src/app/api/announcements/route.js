import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: announcements, error } = await supabase
      .from('Announcement')
      .select('*')
      .eq('isActive', true)
      .order('createdAt', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      announcements: announcements || []
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, content, type } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Thiếu tiêu đề hoặc nội dung thông báo' }, { status: 400 });
    }

    const { data: announcement, error } = await supabase
      .from('Announcement')
      .insert({
        title,
        content,
        type: type || 'PROMOTION',
        isActive: true,
        createdAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      announcement
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
      return NextResponse.json({ success: false, error: 'Thiếu ID thông báo' }, { status: 400 });
    }

    const { error } = await supabase
      .from('Announcement')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Đã xóa thông báo' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
