import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const res = await query(`
      SELECT * FROM public."Announcement" 
      WHERE "isActive" = TRUE 
      ORDER BY "createdAt" DESC 
      LIMIT 50
    `);
    return NextResponse.json({
      success: true,
      announcements: res.rows
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

    const res = await query(`
      INSERT INTO public."Announcement" (id, title, content, type, "isActive", "createdAt")
      VALUES (gen_random_uuid(), $1, $2, $3, TRUE, CURRENT_TIMESTAMP)
      RETURNING *
    `, [title, content, type || 'PROMOTION']);

    return NextResponse.json({
      success: true,
      announcement: res.rows[0]
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

    await query(`DELETE FROM public."Announcement" WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: 'Đã xóa thông báo' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
