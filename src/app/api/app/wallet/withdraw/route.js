import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, userName, amount, bankName, accountNumber, accountHolder, note } = body;

    const numAmount = Number(amount);
    if (!userId || !numAmount || numAmount < 50000) {
      return NextResponse.json({ success: false, error: 'Số tiền rút tối thiểu là 50.000đ' }, { status: 400 });
    }

    // Check current wallet balance
    const walletRes = await query(`SELECT * FROM public."Wallet" WHERE "userId" = $1`, [userId]);
    if (walletRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy ví người dùng' }, { status: 404 });
    }

    const currentBalance = Number(walletRes.rows[0].balance) || 0;
    if (numAmount > currentBalance) {
      return NextResponse.json({ success: false, error: 'Số dư ví không đủ để rút' }, { status: 400 });
    }

    const bName = (bankName || walletRes.rows[0].bankName || 'MBBank').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const accNo = (accountNumber || walletRes.rows[0].accountNumber || '').trim();
    const holder = (accountHolder || walletRes.rows[0].accountHolder || userName || '').trim().toUpperCase();

    // Generate VietQR Napas247 image URL
    const qrUrl = `https://img.vietqr.io/image/${bName}-${accNo}-compact2.png?amount=${numAmount}&addInfo=${encodeURIComponent(note || 'LinkP Rut Tien')}&accountName=${encodeURIComponent(holder)}`;

    const reqId = 'w_req_' + Date.now();

    // Create withdrawal request
    const insertRes = await query(`
      INSERT INTO public."WithdrawalRequest" (
        id, "userId", "userName", amount, "bankName", "accountNumber", "accountHolder", status, note, "qrUrl"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9)
      RETURNING *
    `, [
      reqId,
      userId,
      userName || holder,
      numAmount,
      bName,
      accNo,
      holder,
      note || 'Rút hoa hồng hoàn tiền LinkP',
      qrUrl
    ]);

    // Update wallet: deduct available balance, add to withdrawn or pending payout
    await query(`
      UPDATE public."Wallet"
      SET 
        balance = balance - $1,
        withdrawn = withdrawn + $1,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = $2
    `, [numAmount, userId]);

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
