import { NextRequest, NextResponse } from 'next/server';
import { verifyItnSignature } from '@/lib/payfast';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = String(value);
    });

    if (!verifyItnSignature(payload)) {
      return new NextResponse('Invalid signature', { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const paymentId = payload.m_payment_id;

    if (!paymentId) {
      return new NextResponse('Missing m_payment_id', { status: 400 });
    }

    const isComplete =
      typeof payload.payment_status === 'string' &&
      payload.payment_status.toUpperCase() === 'COMPLETE';

    const { data: payment, error } = await admin
      .from('payfast_payments')
      .select('*')
      .eq('m_payment_id', paymentId)
      .single();

    if (error || !payment) {
      return new NextResponse('Payment not found', { status: 404 });
    }

    const { error: updateError } = await admin
      .from('payfast_payments')
      .update({
        status: isComplete ? 'complete' : 'pending',
        payfast_payment_id: payload.pf_payment_id || null,
        payfast_status: payload.payment_status || null,
        raw_payload: payload
      })
      .eq('id', payment.id);

    if (updateError) {
      return new NextResponse(updateError.message, { status: 500 });
    }

    if (isComplete && payment.status !== 'complete') {
      const { error: creditError } = await admin.rpc(
        'grant_case_credits_from_payment',
        { p_m_payment_id: paymentId }
      );

      if (creditError) {
        return new NextResponse(creditError.message, { status: 500 });
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : 'Webhook error',
      { status: 500 }
    );
  }
}

export async function GET() {
  return new NextResponse('ok');
}