import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '17310500322';
const SHORT_HOSTS = new Set(['vn.shp.ee', 'shp.ee', 's.shopee.vn', 'shope.ee']);
const ALLOWED_HOSTS = new Set(['shopee.vn', 'www.shopee.vn', ...SHORT_HOSTS]);
const DESTINATION_HOSTS = new Set(['shopee.vn', 'www.shopee.vn']);

function checkedUrl(value, base) {
  const url = base ? new URL(value, base) : new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new Error('Liên kết không thuộc Shopee');
  return url;
}
function isDestination(url) { return DESTINATION_HOSTS.has(new URL(url).hostname.toLowerCase()); }
function extractDestination(html, current) {
  const normalized = html.replaceAll('\\/', '/').replaceAll('\\u0026', '&').replaceAll('&amp;', '&');
  const patterns = [
    /<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url=([^"'>]+)/i,
    /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
    /location\.(?:replace|assign)\(\s*["']([^"']+)["']/i,
    /https?:\/\/(?:www\.)?shopee\.vn\/[^\s"'<>\\]+/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern); if (!match) continue;
    const raw = match[1] || match[0];
    try { const candidate = checkedUrl(decodeURIComponent(raw), current).toString(); if (isDestination(candidate)) return candidate; } catch { }
  }
  return null;
}
async function resolveShopeeUrl(raw) {
  let current = checkedUrl(raw.trim()).toString();
  if (isDestination(current)) return current;
  for (let step = 0; step < 10; step++) {
    const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' } });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location'); if (!location) throw new Error('Redirect Shopee thiếu Location');
      current = checkedUrl(location, current).toString(); if (isDestination(current)) return current; continue;
    }
    if (!response.ok) throw new Error(`Shopee phản hồi HTTP ${response.status}`);
    const html = (await response.text()).slice(0, 1_000_000);
    const target = extractDestination(html, current); if (target) return target;
    throw new Error('Không resolve được short link Shopee');
  }
  throw new Error('Redirect quá nhiều bước');
}
async function fetchProductMetadata(url) {
  const fallback = { productName: 'Sản phẩm Shopee', shopName: 'Shopee', imageUrl: '', price: 0, commission: 0 };
  try {
    const response = await fetch(`https://data.addlivetag.com/product-data/product-data.php?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(15000) });
    const json = await response.json(); const p = json.productInfo; if (!response.ok || json.status !== 'success' || !p) return fallback;
    return { productName: p.productName || fallback.productName, shopName: p.shopName || fallback.shopName, imageUrl: p.imageUrl || '', price: Number(p.price) || 0, commission: Number(p.commission) || 0 };
  } catch { return fallback; }
}
export async function POST(request) {
  try {
    const { rawUrl, subId } = await request.json();
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) return NextResponse.json({ success:false, error:'Vui lòng cung cấp liên kết Shopee' }, { status:400 });
    const destinationUrl = await resolveShopeeUrl(rawUrl);
    const cleanSub = typeof subId === 'string' ? subId.slice(0, 100) : 'app_direct';
    const affiliateUrl = `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(destinationUrl)}&affiliate_id=${AFFILIATE_ID}&sub_id=${encodeURIComponent(cleanSub)}`;
    const product = await fetchProductMetadata(destinationUrl); const userCommission = Math.round(product.commission * .8);
    const id = crypto.randomUUID();
    await query(`INSERT INTO public."ConvertedLink" (id,"originalUrl","destinationUrl","affiliateUrl","productName","shopName","imageUrl",price,commission,"userCommission","adminCommission","subId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [id,rawUrl,destinationUrl,affiliateUrl,product.productName,product.shopName,product.imageUrl,product.price,product.commission,userCommission,product.commission-userCommission,cleanSub]);
    return NextResponse.json({ success:true, result:{ id, originalUrl:rawUrl, destinationUrl, affiliateUrl, ...product, userCommission, adminCommission:product.commission-userCommission, subId:cleanSub, createdAt:new Date().toISOString() } });
  } catch (error) { return NextResponse.json({ success:false, error:error.message }, { status:400 }); }
}
