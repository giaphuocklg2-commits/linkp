#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===================================================================
 LinkP Admin - Python User & Sub-ID Management CLI Tool
===================================================================
Chương trình quản trị tài khoản User, Sub_ID và Ví tiền trên LinkP.
"""

import sys
import os

# Safe UTF-8 output encoding for Windows CMD / PowerShell
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("[-] Đang tự động cài đặt thư viện psycopg2-binary...")
    os.system("pip install psycopg2-binary")
    import psycopg2
    from psycopg2.extras import RealDictCursor

DEFAULT_DB_URL = "postgresql://postgres.vrsaihfqfgmvrtxtyxpf:giaphuocklg@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

def get_connection():
    db_url = os.environ.get("DATABASE_URL", DEFAULT_DB_URL)
    conn = psycopg2.connect(db_url, sslmode='require')
    conn.autocommit = False
    return conn

def format_vnd(amount):
    try:
        val = int(amount or 0)
        return f"{val:,}".replace(",", ".") + "đ"
    except:
        return "0đ"

def search_users(conn, search_str):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        query = """
            SELECT id, name, email, "createdAt" 
            FROM public."User" 
            WHERE id ILIKE %s OR name ILIKE %s OR email ILIKE %s
            ORDER BY "createdAt" DESC
            LIMIT 10
        """
        pattern = f"%{search_str.strip()}%"
        cur.execute(query, (pattern, pattern, pattern))
        return cur.fetchall()

def get_user_full_details(conn, user_id):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('SELECT id, name, email, "createdAt" FROM public."User" WHERE id = %s', (user_id,))
        user = cur.fetchone()
        if not user:
            return None

        cur.execute('SELECT balance, pending, withdrawn FROM public."Wallet" WHERE "userId" = %s', (user_id,))
        wallet = cur.fetchone() or {'balance': 0, 'pending': 0, 'withdrawn': 0}

        cur.execute("""
            SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM("orderValue"), 0) as total_gmv,
                COALESCE(SUM("userCashback"), 0) as total_cashback
            FROM public."AffiliateOrder" 
            WHERE "userId" = %s
        """, (user_id,))
        order_stats = cur.fetchone()

        return {
            'user': user,
            'wallet': wallet,
            'stats': order_stats
        }

def print_user_card(details):
    u = details['user']
    w = details['wallet']
    s = details['stats']

    print("\n" + "=" * 65)
    print(f" [USER INFO] THÔNG TIN TÀI KHOẢN: {u['name'] or 'Chưa đặt tên'}")
    print("=" * 65)
    print(f"  ID / Sub_ID        : {u['id']}")
    print(f"  Họ và Tên          : {u['name'] or 'N/A'}")
    print(f"  Email              : {u['email'] or 'N/A'}")
    print("-" * 65)
    print(f" [VÍ TIỀN / WALLET]:")
    print(f"    • Số dư khả dụng : {format_vnd(w['balance'])}")
    print(f"    • Đang chờ đối soát: {format_vnd(w['pending'])}")
    print(f"    • Đã rút tiền     : {format_vnd(w['withdrawn'])}")
    print("-" * 65)
    print(f" [ĐƠN HÀNG TIẾP THỊ]:")
    print(f"    • Tổng số đơn hàng: {s['total_orders']} đơn")
    print(f"    • Tổng doanh số   : {format_vnd(s['total_gmv'])}")
    print(f"    • Hoa hồng nhận   : {format_vnd(s['total_cashback'])}")
    print("=" * 65 + "\n")

def cmd_update_name(conn, user_id):
    new_name = input("--> Nhập Tên Mới cho User: ").strip()
    if not new_name:
        print("[-] Tên không được để trống!")
        return

    try:
        with conn.cursor() as cur:
            cur.execute('UPDATE public."User" SET name = %s WHERE id = %s', (new_name, user_id))
            cur.execute('UPDATE public."AffiliateOrder" SET "userName" = %s WHERE "userId" = %s', (new_name, user_id))
            cur.execute('UPDATE public."Wallet" SET "userName" = %s WHERE "userId" = %s', (new_name, user_id))
        conn.commit()
        print(f"[+] SUCCESS: Đã đổi tên thành '{new_name}' cho User {user_id}!")
    except Exception as e:
        conn.rollback()
        print(f"[-] ERROR: Không thể cập nhật tên: {e}")

def cmd_update_subid(conn, current_user_id):
    new_user_id = input(f"--> Nhập User ID / Sub_ID MỚI (hiện tại: {current_user_id}): ").strip()
    if not new_user_id:
        print("[-] User ID mới không được để trống!")
        return
    if new_user_id == current_user_id:
        print("[-] User ID mới trùng với ID hiện tại!")
        return

    try:
        with conn.cursor() as cur:
            cur.execute('ALTER TABLE public."Wallet" DROP CONSTRAINT IF EXISTS "Wallet_userId_fkey"')
            cur.execute('ALTER TABLE public."WalletLedger" DROP CONSTRAINT IF EXISTS "WalletLedger_userId_fkey"')
            cur.execute('ALTER TABLE public."AffiliateOrder" DROP CONSTRAINT IF EXISTS "AffiliateOrder_userId_fkey"')
            cur.execute('ALTER TABLE public."ConvertedLink" DROP CONSTRAINT IF EXISTS "ConvertedLink_userId_fkey"')

            cur.execute('UPDATE public."User" SET id = %s WHERE id = %s', (new_user_id, current_user_id))
            cur.execute('UPDATE public."Wallet" SET "userId" = %s WHERE "userId" = %s', (new_user_id, current_user_id))
            cur.execute('UPDATE public."WalletLedger" SET "userId" = %s WHERE "userId" = %s', (new_user_id, current_user_id))
            cur.execute('UPDATE public."AffiliateOrder" SET "userId" = %s WHERE "userId" = %s', (new_user_id, current_user_id))
            cur.execute('UPDATE public."ConvertedLink" SET "userId" = %s WHERE "userId" = %s', (new_user_id, current_user_id))
            try:
                cur.execute('UPDATE public."WithdrawalRequest" SET "userId" = %s WHERE "userId" = %s', (new_user_id, current_user_id))
            except:
                pass

            cur.execute("""
                ALTER TABLE public."Wallet" 
                ADD CONSTRAINT "Wallet_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE
            """)
            cur.execute("""
                ALTER TABLE public."WalletLedger" 
                ADD CONSTRAINT "WalletLedger_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE
            """)

        conn.commit()
        print(f"[+] SUCCESS: Đã đổi thành công User ID từ '{current_user_id}' -> '{new_user_id}'!")
        return new_user_id
    except Exception as e:
        conn.rollback()
        print(f"[-] ERROR: Đổi User ID thất bại: {e}")
        return current_user_id

def cmd_update_email(conn, user_id):
    new_email = input("--> Nhập Email MỚI cho User: ").strip()
    if not new_email or "@" not in new_email:
        print("[-] Email không hợp lệ!")
        return

    try:
        with conn.cursor() as cur:
            cur.execute('UPDATE public."User" SET email = %s WHERE id = %s', (new_email, user_id))
        conn.commit()
        print(f"[+] SUCCESS: Đã đổi email thành '{new_email}'!")
    except Exception as e:
        conn.rollback()
        print(f"[-] ERROR: Không thể đổi email: {e}")

def cmd_adjust_wallet(conn, user_id):
    print("\n--- ĐIỀU CHỈNH VÍ TIỀN ---")
    print("1. Thay đổi Số Dư Khả Dụng (Balance)")
    print("2. Thay đổi Số Tiền Đang Chờ (Pending)")
    choice = input("Chọn loại số dư cần điều chỉnh (1/2): ").strip()
    
    amount_str = input("Nhập số tiền điều chỉnh (VD: +50000 hoặc -20000): ").strip()
    try:
        amount = int(amount_str.replace(".", "").replace(",", ""))
    except:
        print("[-] Số tiền không hợp lệ!")
        return

    reason = input("Ghi chú/Lý do điều chỉnh ví: ").strip() or "Điều chỉnh từ Admin CLI"

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if choice == '1':
                cur.execute('UPDATE public."Wallet" SET balance = balance + %s, "updatedAt" = now() WHERE "userId" = %s RETURNING balance', (amount, user_id))
                res = cur.fetchone()
                new_bal = res['balance'] if res else 0
                
                direction = 'CREDIT' if amount >= 0 else 'DEBIT'
                cur.execute("""
                    INSERT INTO public."WalletLedger" 
                    ("userId", type, bucket, direction, amount, status, description, "idempotencyKey")
                    VALUES (%s, 'ADMIN_ADJUSTMENT', 'BALANCE', %s, %s, 'COMPLETED', %s, gen_random_uuid()::text)
                """, (user_id, direction, abs(amount), reason))
                print(f"[+] SUCCESS: Đã điều chỉnh số dư khả dụng {amount_str}đ. Số dư mới: {format_vnd(new_bal)}")

            else:
                cur.execute('UPDATE public."Wallet" SET pending = pending + %s, "updatedAt" = now() WHERE "userId" = %s RETURNING pending', (amount, user_id))
                res = cur.fetchone()
                new_pend = res['pending'] if res else 0

                direction = 'CREDIT' if amount >= 0 else 'DEBIT'
                cur.execute("""
                    INSERT INTO public."WalletLedger" 
                    ("userId", type, bucket, direction, amount, status, description, "idempotencyKey")
                    VALUES (%s, 'ADMIN_ADJUSTMENT', 'PENDING', %s, %s, 'PENDING', %s, gen_random_uuid()::text)
                """, (user_id, direction, abs(amount), reason))
                print(f"[+] SUCCESS: Đã điều chỉnh tiền chờ đối soát {amount_str}đ. Tiền chờ mới: {format_vnd(new_pend)}")

        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"[-] ERROR: Điều chỉnh ví thất bại: {e}")

def cmd_reassign_orders(conn, current_user_id):
    target_id = input("--> Nhập User ID ĐÍCH cần chuyển toàn bộ đơn hàng sang: ").strip()
    if not target_id:
        print("[-] User ID đích không được để trống!")
        return

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('SELECT id, name FROM public."User" WHERE id = %s', (target_id,))
        target_user = cur.fetchone()
        if not target_user:
            print(f"[-] Không tìm thấy User đích có ID '{target_id}' trong hệ thống!")
            return

    confirm = input(f"--> Bạn có CHẮC CHẮN muốn chuyển tất cả đơn hàng từ {current_user_id} sang {target_user['name']} ({target_id})? (y/N): ").strip().lower()
    if confirm != 'y':
        print("[-] Hủy thao tác.")
        return

    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE public."AffiliateOrder" 
                SET "userId" = %s, "userName" = %s 
                WHERE "userId" = %s
            """, (target_id, target_user['name'] or 'Người dùng LinkP', current_user_id))
            count = cur.rowcount
            
            # Auto recalculate wallets for both users
            cur.execute('SELECT public.recalculate_user_wallet(%s)', (current_user_id,))
            cur.execute('SELECT public.recalculate_user_wallet(%s)', (target_id,))
        conn.commit()
        print(f"[+] SUCCESS: Đã chuyển thành công {count} đơn hàng sang cho User {target_user['name']} ({target_id})!")
        print(f"[+] Đã tự động tính toán lại Số dư Ví tiền cho cả 2 tài khoản!")
    except Exception as e:
        conn.rollback()
        print(f"[-] ERROR: Chuyển đơn thất bại: {e}")

def cmd_list_orders(conn, user_id):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT "orderCode", "productName", "orderValue", "userCashback", status, "createdAt"
            FROM public."AffiliateOrder"
            WHERE "userId" = %s
            ORDER BY "createdAt" DESC
            LIMIT 20
        """, (user_id,))
        orders = cur.fetchall()

    if not orders:
        print("\n[-] User chưa có đơn hàng tiếp thị nào.")
        return

    print(f"\n📋 DANH SÁCH 20 ĐƠN HÀNG MỚI NHẤT CỦA USER ({user_id}):")
    print("-" * 80)
    print(f"{'MÃ ĐƠN':<18} | {'TÊN SẢN PHẨM':<30} | {'GIÁ TRỊ':<10} | {'HOÀN TIỀN':<10} | {'TRẠNG THÁI'}")
    print("-" * 80)
    for o in orders:
        name = (o['productName'] or '')[:28]
        status = "✓ HOÀN THÀNH" if o['status'] == 'APPROVED' else ("✕ HỦY" if o['status'] == 'REJECTED' else "⏳ CHỜ DUYỆT")
        print(f"{o['orderCode']:<18} | {name:<30} | {format_vnd(o['orderValue']):<10} | {format_vnd(o['userCashback']):<10} | {status}")
    print("-" * 80 + "\n")

def interactive_admin_loop(conn, user_id):
    current_id = user_id
    while True:
        details = get_user_full_details(conn, current_id)
        if not details:
            print(f"[-] Không tìm thấy dữ liệu cho User ID '{current_id}'!")
            break

        print_user_card(details)

        print("=== MENU LỆNH ADMIN CHỈNH SỬA USER ===")
        print(" [1] Sửa Tên User (Name)")
        print(" [2] Sửa User ID / Sub_ID (Tự động đổi ở tất cả các bảng)")
        print(" [3] Sửa Email Tài Khoản")
        print(" [4] Cộng / Trừ Số Dư Ví Tiền (Balance / Pending)")
        print(" [5] Chuyển Tất Cả Đơn Hàng Sang User Khác")
        print(" [6] Xem Chi Tiết 20 Đơn Hàng Mới Nhất")
        print(" [7] Tra Cứu User Khác")
        print(" [0] Thoát Chương Trình")

        choice = input("\n👉 Nhập lựa chọn lệnh (0-7): ").strip()

        if choice == '1':
            cmd_update_name(conn, current_id)
        elif choice == '2':
            current_id = cmd_update_subid(conn, current_id)
        elif choice == '3':
            cmd_update_email(conn, current_id)
        elif choice == '4':
            cmd_adjust_wallet(conn, current_id)
        elif choice == '5':
            cmd_reassign_orders(conn, current_id)
        elif choice == '6':
            cmd_list_orders(conn, current_id)
        elif choice == '7':
            break
        elif choice == '0':
            print("\n👋 Cảm ơn bạn đã sử dụng LinkP Admin Manager CLI!")
            sys.exit(0)
        else:
            print("[-] Lựa chọn không hợp lệ, vui lòng chọn từ 0 đến 7.")

        input("\nNhấn Enter để tiếp tục...")

def main():
    print("=" * 65)
    print("   LINKP ADMIN USER & SUB-ID MANAGEMENT TOOL")
    print("=" * 65)

    conn = get_connection()
    print("[+] Kết nối thành công Database PostgreSQL Supabase!")

    initial_query = sys.argv[1] if len(sys.argv) > 1 else None

    while True:
        if not initial_query:
            initial_query = input("\n--> Nhập User ID, Sub_ID, Tên hoặc Email cần quản lý (0 để thoát): ").strip()
        
        if not initial_query or initial_query == '0':
            print("👋 Bye!")
            break

        results = search_users(conn, initial_query)
        initial_query = None # Reset for next loop

        if not results:
            print("[-] Không tìm thấy User nào phù hợp!")
            continue

        selected_id = None
        if len(results) == 1:
            selected_id = results[0]['id']
        else:
            print(f"\n[?] Tìm thấy {len(results)} User phù hợp:")
            for idx, r in enumerate(results, 1):
                print(f" [{idx}] ID: {r['id']} | Tên: {r['name'] or 'N/A'} | Email: {r['email']}")
            
            choice_idx = input("\n--> Chọn STT User cần quản lý (1-{}): ".format(len(results))).strip()
            try:
                idx = int(choice_idx) - 1
                if 0 <= idx < len(results):
                    selected_id = results[idx]['id']
                else:
                    print("[-] Lựa chọn nằm ngoài phạm vi!")
                    continue
            except:
                print("[-] Vui lòng nhập số hợp lệ!")
                continue

        if selected_id:
            interactive_admin_loop(conn, selected_id)

    conn.close()

if __name__ == "__main__":
    main()
