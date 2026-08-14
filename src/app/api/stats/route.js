import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. Orders Stats from AffiliateOrder
    const orderRes = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_orders,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN "shopeeCommission" ELSE 0 END), 0) as approved_shopee_commission,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN "userCashback" ELSE 0 END), 0) as approved_user_cashback,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN "adminRevenue" ELSE 0 END), 0) as approved_admin_revenue,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN "userCashback" ELSE 0 END), 0) as pending_user_cashback,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN "orderValue" ELSE 0 END), 0) as approved_gmv,
        COALESCE(SUM("orderValue"), 0) as total_gmv
      FROM public."AffiliateOrder"
    `);
    const o = orderRes.rows[0];

    const totalShopeeCommission = Number(o.approved_shopee_commission) || 0;
    const totalUserCommission = Number(o.approved_user_cashback) || 0;
    const pendingUserCashback = Number(o.pending_user_cashback) || 0;
    const totalAdminCommission = Number(o.approved_admin_revenue) || 0;
    const vatTax = Math.round(totalAdminCommission * 0.10); // 10% VAT
    const adminNetProfit = totalAdminCommission - vatTax;
    const totalGmv = Number(o.total_gmv) || 0;
    const totalOrders = Number(o.total_orders) || 0;
    const pendingOrdersCount = Number(o.pending_orders) || 0;

    // 2. Withdrawals Stats
    const withRes = await query(`
      SELECT 
        COUNT(*) as total_requests,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as approved_amount,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count
      FROM public."WithdrawalRequest"
    `);
    const withStat = withRes.rows[0];

    // 3. Links Count
    const linksRes = await query(`SELECT COUNT(*) as count FROM public."ConvertedLink"`);
    const totalLinks = Number(linksRes.rows[0]?.count) || 0;

    // 4. 7 Days Timeline from real DB
    const timelineRes = await query(`
      SELECT 
        TO_CHAR("createdAt", 'Dy') as day_name,
        DATE("createdAt") as day_date,
        COALESCE(SUM("orderValue"), 0) as gmv,
        COALESCE(SUM("shopeeCommission"), 0) as commission,
        COALESCE(SUM("userCashback"), 0) as user_share,
        COALESCE(SUM("adminRevenue"), 0) as admin_revenue
      FROM public."AffiliateOrder"
      WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE("createdAt"), TO_CHAR("createdAt", 'Dy')
      ORDER BY day_date ASC
    `);

    const timeline = timelineRes.rows.map(r => ({
      date: r.day_name || 'Hôm nay',
      gmv: Number(r.gmv) || 0,
      commission: Number(r.commission) || 0,
      userShare: Number(r.user_share) || 0,
      adminNet: Math.round((Number(r.admin_revenue) || 0) * 0.90)
    }));

    // 5. Monthly Report from real DB
    const monthlyRes = await query(`
      SELECT 
        TO_CHAR("createdAt", 'MM/YYYY') as month_str,
        COALESCE(SUM("orderValue"), 0) as gmv,
        COALESCE(SUM("shopeeCommission"), 0) as total_comm,
        COALESCE(SUM("userCashback"), 0) as user_share,
        COALESCE(SUM("adminRevenue"), 0) as admin_gross
      FROM public."AffiliateOrder"
      WHERE status = 'APPROVED'
      GROUP BY TO_CHAR("createdAt", 'MM/YYYY')
      ORDER BY month_str DESC
    `);

    const monthlyReport = monthlyRes.rows.map(r => {
      const gmv = Number(r.gmv) || 0;
      const totalComm = Number(r.total_comm) || 0;
      const userShare = Number(r.user_share) || 0;
      const adminGross = Number(r.admin_gross) || 0;
      const vat = Math.round(adminGross * 0.10);
      const adminNet = adminGross - vat;
      return {
        month: `Tháng ${r.month_str}`,
        gmv,
        totalComm,
        userShare,
        adminGross,
        vat,
        adminNet
      };
    });

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
        totalLinks,
        pendingPayoutAmount: Number(withStat.pending_amount) || 0,
        pendingPayoutCount: Number(withStat.pending_count) || 0,
        approvedPayoutAmount: Number(withStat.approved_amount) || 0,
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
