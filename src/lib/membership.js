export const MEMBER_RULES = {
  SILVER: { bonus: 2, targetOrders: 10, targetDays: 90 },
  GOLD: { bonus: 4, targetOrders: 20, targetDays: 180 },
  PLATINUM: { bonus: 6, targetOrders: 20, targetDays: 180 },
};

export function calculateTier(approvedOrders, memberDays, override = null) {
  if (['SILVER','GOLD','PLATINUM'].includes(override)) return override;
  if (approvedOrders >= 20 || memberDays >= 180) return 'PLATINUM';
  if (approvedOrders >= 10 || memberDays >= 90) return 'GOLD';
  return 'SILVER';
}

export async function getUserTier(db, userId) {
  if (!userId || userId === 'user_guest' || userId === 'user_default') return 'SILVER';
  const result = await db.query(`SELECT u."createdAt",
    COUNT(o.id) FILTER (WHERE o.status='APPROVED')::int AS "approvedOrders",
    rc.value #>> '{}' AS override
    FROM public."User" u
    LEFT JOIN public."AffiliateOrder" o ON o."userId"=u.id
    LEFT JOIN public."RemoteConfig" rc ON rc.key='member_rank:'||u.id
    WHERE u.id=$1 GROUP BY u.id,u."createdAt",rc.value`, [userId]);
  const row=result.rows[0]; if(!row) return 'SILVER';
  const days=Math.max(0,Math.floor((Date.now()-new Date(row.createdAt).getTime())/86400000));
  return calculateTier(Number(row.approvedOrders)||0,days,row.override);
}
