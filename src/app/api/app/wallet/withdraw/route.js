import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, userName, amount, bankName, accountNumber, accountHolder, note, idempotencyKey } = body;

    const numAmount = Number(amount);
    if (!userId || !Number.isFinite(numAmount) || numAmount <= 0 || !idempotencyKey) {
      return NextResponse.json({ success: false, error: 'Dữ liệu rút tiền không hợp lệ' }, { status: 400 });
    }

    // Check current wallet balance
    const walletRes = await query(`SELECT * FROM public."Wallet" WHERE "userId" = $1`, [userId]);
    if (walletRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy ví người dùng' }, { status: 404 });
    }

    const bName = (bankName || walletRes.rows[0].bankName || 'MBBank').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const accNo = (accountNumber || walletRes.rows[0].accountNumber || '').trim();
    const holder = (accountHolder || walletRes.rows[0].accountHolder || userName || '').trim().toUpperCase();

    // Generate VietQR Napas247 image URL
    const qrUrl = `https://img.vietqr.io/image/${bName}-${accNo}-compact2.png?amount=${numAmount}&addInfo=${encodeURIComponent(note || 'LinkP Rut Tien')}&accountName=${encodeURIComponent(holder)}`;

    const insertRes = await query(`SELECT * FROM public.request_wallet_withdrawal($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
      userId, userName || holder, numAmount, bName, accNo, holder,
      note || 'Rút hoa hồng hoàn tiền LinkP', qrUrl, idempotencyKey
    ]);

    return NextResponse.json({
      success: true,
      request: insertRes.rows[0],
      qrUrl,
      message: 'Tạo yêu cầu rút tiền thành công. Vui lòng chờ Admin duyệt chuyển khoản.'
    });
  } catch (error) {
    console.error('Withdraw API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
