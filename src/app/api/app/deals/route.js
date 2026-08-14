import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`SELECT title, content AS description, link AS url, image AS image, "publishedAt", 'LinkP' AS "sourceName" FROM public."Announcement" WHERE active = true ORDER BY "publishedAt" DESC LIMIT 20`);
    return NextResponse.json({ success: true, deals: result.rows });
  } catch {
    return NextResponse.json({ success: false, deals: [], error: 'Không tải được thông báo LinkP' }, { status: 503 });
  }
}
