import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: announcements, error } = await supabase
      .from('Announcement')
      .select('id, title, content, type, createdAt')
      .eq('isActive', true)
      .order('createdAt', { ascending: false })
      .limit(20);

    if (error) throw error;

    const formatted = (announcements || []).map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      type: a.type,
      date: new Date(a.createdAt).toLocaleDateString('vi-VN')
    }));

    return NextResponse.json({
      success: true,
      announcements: formatted
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
