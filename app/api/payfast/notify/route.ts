import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const admin = createAdminSupabaseClient();

    await admin.from('payfast_itn_logs').insert({
      raw_body: rawBody
    });

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