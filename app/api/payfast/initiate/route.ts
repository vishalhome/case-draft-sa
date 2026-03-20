import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { buildPaymentForm, payfastProcessUrl } from '@/lib/payfast';
import { payfastId } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const admin = createAdminSupabaseClient();

    let caseId = String(body.case_id || '');
    const packageCode = String(body.package_code || 'STARTER_50');

    const { data: pkg, error: packageError } = await admin.from('credit_packages').select('*').eq('code', packageCode).eq('is_active', true).single();
    if (packageError || !pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 });

    if (!caseId) {
      const caseNumber = String(body.case_number || '').trim();
      if (!caseNumber) return NextResponse.json({ error: 'Case number is required.' }, { status: 400 });
      const { data: existing } = await admin.from('cases').select('id').eq('user_id', auth.user.id).eq('case_number', caseNumber).maybeSingle();
      if (existing) {
        caseId = existing.id;
      } else {
        const { data: created, error: createError } = await admin.from('cases').insert({
          user_id: auth.user.id,
          case_number: caseNumber,
          title: String(body.title || '') || `Case ${caseNumber}`,
          court_name: String(body.court_name || '') || null,
          plaintiff_name: String(body.plaintiff_name || '') || null,
          defendant_name: String(body.defendant_name || '') || null,
          status: 'active'
        }).select('id').single();
        if (createError || !created) return NextResponse.json({ error: createError?.message || 'Could not create case' }, { status: 400 });
        caseId = created.id;
      }
    } else {
      const { data: existingCase } = await admin.from('cases').select('id').eq('id', caseId).eq('user_id', auth.user.id).maybeSingle();
      if (!existingCase) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const paymentId = payfastId();
    const firstName = String(auth.user.user_metadata?.full_name || '').split(' ')[0] || 'User';
    const lastName = String(auth.user.user_metadata?.full_name || '').split(' ').slice(1).join(' ');

    const { error: payError } = await admin.from('payfast_payments').insert({
      m_payment_id: paymentId,
      user_id: auth.user.id,
      case_id: caseId,
      credit_package_id: pkg.id,
      amount_zar: pkg.price_zar,
      status: 'pending'
    });
    if (payError) return NextResponse.json({ error: payError.message }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    const formData = buildPaymentForm({
      mPaymentId: paymentId,
      itemName: pkg.name,
      itemDescription: `${pkg.credits} credits for case ${caseId}`,
      amount: Number(pkg.price_zar),
      email: auth.user.email || '',
      firstName,
      lastName,
      returnUrl: `${baseUrl}/dashboard/cases/${caseId}/payment/success`,
      cancelUrl: `${baseUrl}/dashboard/cases/${caseId}/payment/cancel`,
      notifyUrl: `${baseUrl}/api/payfast/notify`,
      customStr1: caseId,
      customStr2: auth.user.id,
      customStr3: pkg.id
    });

    return NextResponse.json({ payfastUrl: payfastProcessUrl(), formData, caseId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
