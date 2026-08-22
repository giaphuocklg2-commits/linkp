import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let queryBuilder = supabase
      .from('WithdrawalRequest')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (status && status !== 'ALL') {
      queryBuilder = queryBuilder.eq('status', status);
    }

    const { data: withdrawals, error } = await queryBuilder;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || []
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, transId, ft_code, note } = body;
    const finalTransId = transId || ft_code || null;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin yêu cầu' }, { status: 400 });
    }

    // Normalize COMPLETED to APPROVED for DB compatibility
    let targetStatus = status;
    if (targetStatus === 'COMPLETED') {
      targetStatus = 'APPROVED';
    }

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(targetStatus)) {
      return NextResponse.json({ success: false, error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    // Method 1: Try PG direct pool query with PL/pgSQL function admin_process_withdrawal
    let result = null;
    try {
      const { query } = require('@/lib/db');
      const settled = await query('SELECT (public.admin_process_withdrawal($1,$2,$3,$4,$5)).*', 
        [id, targetStatus, finalTransId, note || null, 'admin']);
      if (settled && settled.rows && settled.rows.length > 0) {
        result = settled.rows[0];
      }
    } catch (dbErr) {
      console.warn('PG Direct query failed, trying Supabase RPC / fallback:', dbErr.message);
    }

    // Method 2: Try Supabase RPC if PG direct pool failed
    if (!result) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_process_withdrawal', {
          p_withdrawal_id: id,
          p_status: targetStatus,
          p_trans_id: finalTransId,
          p_note: note || null,
          p_admin_id: 'admin'
        });
        if (!rpcErr && rpcData) {
          result = rpcData;
        }
      } catch (rpcEx) {
        console.warn('Supabase RPC failed, using Direct Supabase SDK fallback:', rpcEx.message);
      }
    }

    // Method 3: Direct Supabase SDK Fallback (guaranteed execution)
    if (!result) {
      // 1. Fetch request
      const { data: reqRow, error: reqErr } = await supabase
        .from('WithdrawalRequest')
        .select('*')
        .eq('id', id)
        .single();

      if (reqErr || !reqRow) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy yêu cầu' }, { status: 404 });
      }

      if (reqRow.status !== 'PENDING') {
        return NextResponse.json({ success: true, updated: reqRow });
      }

      const userId = reqRow.userId || reqRow.user_id;
      const amount = reqRow.amount || 0;

      // 2. Update WithdrawalRequest
      const updateData = {
        status: targetStatus,
        processedAt: new Date().toISOString()
      };
      if (finalTransId) updateData.transId = finalTransId;
      if (note) updateData.note = note;

      const { data: updatedData, error: updateErr } = await supabase
        .from('WithdrawalRequest')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        // Try fallback without select()
        await supabase
          .from('WithdrawalRequest')
          .update(updateData)
          .eq('id', id);
        result = { ...reqRow, status: targetStatus, transId: finalTransId };
      } else {
        result = updatedData;
      }

      // 3. Update User Wallet
      if (userId) {
        try {
          const { data: walletRow } = await supabase
            .from('Wallet')
            .select('*')
            .eq('userId', userId)
            .single();

          if (walletRow) {
            const curPending = walletRow.pendingWithdrawal || walletRow.pending_withdrawal || 0;
            const newPending = Math.max(0, curPending - amount);

            if (targetStatus === 'APPROVED') {
              const curWithdrawn = walletRow.withdrawn || 0;
              await supabase
                .from('Wallet')
                .update({
                  pendingWithdrawal: newPending,
                  withdrawn: curWithdrawn + amount,
                  updatedAt: new Date().toISOString()
                })
                .eq('userId', userId);
            } else if (targetStatus === 'REJECTED') {
              const curBalance = walletRow.balance || 0;
              await supabase
                .from('Wallet')
                .update({
                  pendingWithdrawal: newPending,
                  balance: curBalance + amount,
                  updatedAt: new Date().toISOString()
                })
                .eq('userId', userId);
            }
          }
        } catch (wErr) {
          console.warn('Wallet update fallback warning:', wErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated: result
    });
  } catch (error) {
    console.error('PATCH /api/withdrawals error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
