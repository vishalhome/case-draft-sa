import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/lib/payfast';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const payload: Record<string, string> = {};
  formData.forEach((value, key) => { payload[key] = String(value); });

  if (!verifySignature(payload)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const paymentId = payload.m_payment_id;
  const status = payload.payment_status?.toLowerCase() === 'complete' ? 'complete' : String(payload.payment_status || 'unknown').toLowerCase();

  const { data: payment, error } = await admin.from('payfast_payments').select('*').eq('m_payment_id', paymentId).single();
  if (error || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  await admin.from('payfast_payments').update({
    status,
    payfast_payment_id: payload.pf_payment_id || null,
    payfast_status: payload.payment_status || null,
    raw_payload: payload
  }).eq('id', payment.id);

  if (status === 'complete') {
    const { error: creditError } = await admin.rpc('grant_case_credits_from_payment', { p_m_payment_id: paymentId });
    if (creditError) return NextResponse.json({ error: creditError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return new NextResponse('ok');
}
