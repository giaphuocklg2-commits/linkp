import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    announcements: [
      {
        id: '1',
        title: '🎉 Siêu Sale Shopee Mega 9.9',
        content: 'Tặng thêm 5% hoa hồng thưởng cho tất cả liên kết tạo trong ngày!',
        type: 'PROMOTION',
        date: '14/08/2026'
      },
      {
        id: '2',
        title: '⚡ Nâng cấp tính năng Batch Converter',
        content: 'Hỗ trợ dán đoạn văn bản chứa nhiều link và xuất link hàng loạt nhanh chóng.',
        type: 'SYSTEM',
        date: '12/08/2026'
      },
      {
        id: '3',
        title: '💳 Thanh toán VietQR Napas247',
        content: 'Rút tiền hoa hồng tức thì về mọi ngân hàng Việt Nam, duyệt tự động.',
        type: 'PAYMENT',
        date: '10/08/2026'
      }
    ]
  });
}
