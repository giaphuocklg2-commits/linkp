import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [components, history] = await Promise.all([
      query('SELECT component,status,message,"updatedAt" FROM public."SystemStatus" ORDER BY component'),
      query('SELECT period,status,"ordersChecked","ordersApproved","cashbackAmount",note,"reconciledAt" FROM public."ReconciliationHistory" ORDER BY "reconciledAt" DESC LIMIT 20')
    ]);
    return NextResponse.json({ success: true, components: components.rows, reconciliationHistory: history.rows }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
