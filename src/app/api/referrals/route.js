import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://vrsaihfqfgmvrtxtyxpf.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_LilLYEE6WbODOuiskuRTcQ_ZhpKrZRc';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Fetch users to compute referral network
    const resUsers = await fetch(`${SUPABASE_URL}/User?select=*`, { headers, cache: 'no-store' });
    const users = resUsers.ok ? await resUsers.json() : [];

    // Fetch all orders to compute referral bonus (5%)
    const resOrders = await fetch(`${SUPABASE_URL}/AffiliateOrder?select=*`, { headers, cache: 'no-store' });
    const orders = resOrders.ok ? await resOrders.json() : [];

    // Aggregate referrals
    const referralMap = {};

    users.forEach((u) => {
      const inviteCode = 'LP' + (u.subId || u.id || 'GUEST').replace('u_', '').toUpperCase().slice(0, 8);
      referralMap[u.id] = {
        userId: u.id,
        userName: u.name || u.displayName || 'Khách vãng lai',
        email: u.email || '',
        inviteCode: inviteCode,
        referredBy: u.referredBy || '',
        totalInvited: 0,
        invitedUsers: [],
        totalReferralBonus: 0,
        createdAt: u.createdAt || new Date().toISOString(),
      };
    });

    // Map invited users and calculate 5% bonus from their orders
    users.forEach((u) => {
      if (u.referredBy) {
        // Find referrer by invite code or ID
        const referrer = Object.values(referralMap).find(
          (r) => r.inviteCode.toUpperCase() === u.referredBy.toUpperCase() || r.userId === u.referredBy
        );

        if (referrer) {
          referrer.totalInvited += 1;
          referrer.invitedUsers.push({
            id: u.id,
            name: u.name || u.displayName || 'Khách vãng lai',
            email: u.email || '',
          });

          // Calculate 5% of shopeeCommission from invited user orders
          const userOrders = orders.filter((o) => o.userId === u.id && o.status === 'APPROVED');
          const bonus = userOrders.reduce((sum, o) => sum + Math.round((Number(o.shopeeCommission) || 0) * 0.05), 0);
          referrer.totalReferralBonus += bonus;
        }
      }
    });

    let list = Object.values(referralMap);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.userName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.inviteCode.toLowerCase().includes(q) ||
          r.referredBy.toLowerCase().includes(q)
      );
    }

    // Sort by most active referrals first
    list.sort((a, b) => b.totalInvited - a.totalInvited || b.totalReferralBonus - a.totalReferralBonus);

    return NextResponse.json({
      success: true,
      referrals: list,
      stats: {
        totalReferrers: list.filter((r) => r.totalInvited > 0).length,
        totalInvitedUsers: list.reduce((sum, r) => sum + r.totalInvited, 0),
        totalReferralBonusPaid: list.reduce((sum, r) => sum + r.totalReferralBonus, 0),
        referralCommissionRate: '5%',
      },
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
