import { NextResponse } from 'next/server';

const SOURCE = 'https://matumi.vn/ma-giam-gia';
const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = null;
let cachedAt = 0;

function decodeHtml(value = '') {
  const named = { amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>' };

  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, key) => {
      if (key[0] !== '#') return named[key.toLowerCase()] ?? entity;
      const radix = key[1]?.toLowerCase() === 'x' ? 16 : 10;
      const digits = radix === 16 ? key.slice(2) : key.slice(1);
      const codePoint = Number.parseInt(digits, radix);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function classText(block, className) {
  const pattern = new RegExp(
    `<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    'i',
  );
  return decodeHtml(block.match(pattern)?.[1]);
}

async function fetchMatumiVouchers() {
  const response = await fetch(SOURCE, {
    signal: AbortSignal.timeout(20_000),
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) LinkP/2.0' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`Matumi HTTP ${response.status}`);

  const html = await response.text();
  const vouchers = [];
  const cards = html.matchAll(
    /<article[^>]*class=["'][^"']*\bv-card\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi,
  );

  for (const match of cards) {
    const block = match[1];
    const code = decodeHtml(block.match(/data-code=["']([^"']+)["']/i)?.[1]);
    const title = classText(block, 'v-title');
    if (!code || !title) continue;

    vouchers.push({
      shop: classText(block, 'v-shop') || 'Shopee',
      scope: classText(block, 'v-scope'),
      title,
      code,
      meta: classText(block, 'v-meta'),
      link: decodeHtml(block.match(/class=["'][^"']*\bv-go\b[^"']*["'][^>]*href=["']([^"']+)["']/i)?.[1]),
    });
  }

  if (!vouchers.length) throw new Error('Không parse được voucher Matumi');
  return vouchers;
}

export async function GET(request) {
  try {
    if (!cache || Date.now() - cachedAt > CACHE_TTL_MS) {
      cache = await fetchMatumiVouchers();
      cachedAt = Date.now();
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'Tất cả';
    const query = (searchParams.get('q') || '').toLocaleLowerCase('vi');
    let result = cache;

    if (category !== 'Tất cả') {
      result = result.filter((voucher) => category === voucher.shop || category === voucher.scope);
    }
    if (query) {
      result = result.filter((voucher) =>
        `${voucher.shop} ${voucher.scope} ${voucher.title} ${voucher.code} ${voucher.meta}`
          .toLocaleLowerCase('vi')
          .includes(query),
      );
    }

    return NextResponse.json({ success: true, vouchers: result, source: SOURCE, stale: false });
  } catch (error) {
    console.error('Unable to refresh Matumi vouchers:', error);
    if (cache) {
      return NextResponse.json({
        success: true,
        vouchers: cache,
        source: SOURCE,
        stale: true,
        warning: error.message,
      });
    }
    return NextResponse.json(
      { success: false, vouchers: [], source: SOURCE, error: error.message },
      { status: 503 },
    );
  }
}
