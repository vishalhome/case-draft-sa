import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const caseId = String(body.caseId || '');
    const prompt = String(body.prompt || '').trim();
    const documents = Array.isArray(body.documents) ? body.documents : [];
    if (!caseId || !prompt) return NextResponse.json({ error: 'caseId and prompt are required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const { data: caseRow } = await admin.from('cases').select('*').eq('id', caseId).eq('user_id', auth.user.id).maybeSingle();
    if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const { data: availableCredits, error: creditsError } = await admin.rpc('get_case_available_credits', { p_case_id: caseId, p_user_id: auth.user.id });
    if (creditsError) return NextResponse.json({ error: creditsError.message }, { status: 500 });
    if (Number(availableCredits || 0) <= 0) return NextResponse.json({ error: 'No credits available for this case.' }, { status: 403 });

    const system = process.env.SYSTEM_PROMPT;
    if (!system) return NextResponse.json({ error: 'SYSTEM_PROMPT is not configured on the server.' }, { status: 500 });

    const content: any[] = [];
    for (const doc of documents) {
      content.push({
        type: 'document',
        title: String(doc.label || doc.fileName || 'Document'),
        source: { type: 'base64', media_type: String(doc.mimeType || 'application/pdf'), data: String(doc.base64 || '') }
      });
    }

    const caseContext = [
      `Case number: ${caseRow.case_number}`,
      caseRow.title ? `Title: ${caseRow.title}` : null,
      caseRow.court_name ? `Court: ${caseRow.court_name}` : null,
      caseRow.plaintiff_name ? `Plaintiff: ${caseRow.plaintiff_name}` : null,
      caseRow.defendant_name ? `Defendant: ${caseRow.defendant_name}` : null
    ].filter(Boolean).join('\n');

    content.push({ type: 'text', text: `[CASE]\n${caseContext}\n[/CASE]\n\n${prompt}` });

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 12000,
      system,
      messages: [{ role: 'user', content }]
    });

    const text = response.content.map((block: any) => ('text' in block ? block.text : '')).join('\n').trim();
    const used = (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0);

    const { error: consumeError } = await admin.rpc('consume_case_credits', {
      p_case_id: caseId,
      p_user_id: auth.user.id,
      p_credits_to_consume: used,
      p_request_type: prompt.slice(0, 100),
      p_model_used: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
    });
    if (consumeError) return NextResponse.json({ error: consumeError.message }, { status: 500 });

    await admin.from('chat_messages').insert([
      {
        case_id: caseId,
        user_id: auth.user.id,
        role: 'user',
        content: prompt,
        credits_used: 0,
        attached_document_names: documents.map((d: any) => String(d.fileName || d.label || 'Document'))
      },
      {
        case_id: caseId,
        user_id: auth.user.id,
        role: 'assistant',
        content: text,
        credits_used: used,
        attached_document_names: null
      }
    ]);

    const { data: remaining } = await admin.rpc('get_case_available_credits', { p_case_id: caseId, p_user_id: auth.user.id });
    return NextResponse.json({ content: text, creditsUsed: used, remainingCredits: Number(remaining || 0) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
