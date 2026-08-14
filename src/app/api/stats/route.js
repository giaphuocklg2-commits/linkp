import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch Orders, Withdrawals, Links via Supabase HTTPS (No IPv6 DNS issues)
    const [
      { data: orders = [], error: errOrders },
      { data: withdrawals = [], error: errWithdrawals },
      { count: totalLinks = 0 }
    ] = await Promise.all([
      supabase.from('AffiliateOrder').select('*').order('createdAt', { ascending: false }),
      supabase.from('WithdrawalRequest').select('*').order('createdAt', { ascending: false }),
      supabase.from('ConvertedLink').select('*', { count: 'exact', head: true })
    ]);

    if (errOrders) console.error('Supabase orders fetch error:', errOrders);
    if (errWithdrawals) console.error('Supabase withdrawals fetch error:', errWithdrawals);

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING');
    const approvedOrders = orders.filter(o => o.status === 'APPROVED');

    const totalGmv = orders.reduce((sum, o) => sum + (Number(o.orderValue) || 0), 0);
    const totalShopeeCommission = approvedOrders.reduce((sum, o) => sum + (Number(o.shopeeCommission) || 0), 0);
    const totalUserCommission = approvedOrders.reduce((sum, o) => sum + (Number(o.userCashback) || 0), 0);
    const pendingUserCashback = pendingOrders.reduce((sum, o) => sum + (Number(o.userCashback) || 0), 0);
    const totalAdminCommission = approvedOrders.reduce((sum, o) => sum + (Number(o.adminRevenue) || 0), 0);
    const vatTax = Math.round(totalAdminCommission * 0.10); // 10% VAT
    const adminNetProfit = totalAdminCommission - vatTax;
    const pendingOrdersCount = pendingOrders.length;

    // 2. Withdrawals Stats
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING');
    const approvedWithdrawals = withdrawals.filter(w => w.status === 'APPROVED');
    const pendingPayoutAmount = pendingWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    const pendingPayoutCount = pendingWithdrawals.length;
    const approvedPayoutAmount = approvedWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

    // 3. 7 Days Timeline
    const daysMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      daysMap[key] = {
        date: dayNames[d.getDay()],
        gmv: 0,
        commission: 0,
        userShare: 0,
        adminNet: 0
      };
    }

    orders.forEach(o => {
      if (!o.createdAt) return;
      const key = o.createdAt.split('T')[0];
      if (daysMap[key]) {
        daysMap[key].gmv += Number(o.orderValue) || 0;
        daysMap[key].commission += Number(o.shopeeCommission) || 0;
        daysMap[key].userShare += Number(o.userCashback) || 0;
        daysMap[key].adminNet += Math.round((Number(o.adminRevenue) || 0) * 0.90);
      }
    });

    const timeline = Object.values(daysMap);

    // 4. Monthly Report
    const monthsMap = {};
    approvedOrders.forEach(o => {
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      const mKey = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      if (!monthsMap[mKey]) {
        monthsMap[mKey] = {
          month: `Tháng ${mKey}`,
          gmv: 0,
          totalComm: 0,
          userShare: 0,
          adminGross: 0,
          vat: 0,
          adminNet: 0
        };
      }
      const gmv = Number(o.orderValue) || 0;
      const comm = Number(o.shopeeCommission) || 0;
      const userShare = Number(o.userCashback) || 0;
      const adminGross = Number(o.adminRevenue) || 0;
      monthsMap[mKey].gmv += gmv;
      monthsMap[mKey].totalComm += comm;
      monthsMap[mKey].userShare += userShare;
      monthsMap[mKey].adminGross += adminGross;
      monthsMap[mKey].vat = Math.round(monthsMap[mKey].adminGross * 0.10);
      monthsMap[mKey].adminNet = monthsMap[mKey].adminGross - monthsMap[mKey].vat;
    });

    const monthlyReport = Object.values(monthsMap);

    return NextResponse.json({
      success: true,
      data: {
        totalGmv,
        totalOrders,
        pendingOrdersCount,
        totalShopeeCommission,
        totalUserCommission,
        pendingUserCashback,
        userSharePercentage: 80,
        totalAdminCommission,
        adminSharePercentage: 20,
        vatRate: 10,
        vatTax,
        adminNetProfit,
        totalLinks: totalLinks || 0,
        pendingPayoutAmount,
        pendingPayoutCount,
        approvedPayoutAmount,
        timeline,
        monthlyReport
      }
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
