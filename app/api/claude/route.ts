import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const STORAGE_BUCKET = 'case-documents';

type IncomingDocument = {
  label?: string;
  fileName?: string;
  docType?: string;
  mimeType?: string;
  storagePath?: string;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const caseId = String(body.caseId || '').trim();
    const prompt = String(body.prompt || '').trim();
    const documents: IncomingDocument[] = Array.isArray(body.documents)
      ? body.documents
      : [];

    if (!caseId || !prompt) {
      return NextResponse.json(
        { error: 'caseId and prompt are required' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();

    const { data: caseRow, error: caseError } = await admin
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (caseError) {
      return NextResponse.json({ error: caseError.message }, { status: 500 });
    }

    if (!caseRow) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const availableCredits = Number(caseRow.credits_balance ?? 0);
    if (availableCredits <= 0) {
      return NextResponse.json(
        { error: 'No credits available for this case.' },
        { status: 403 }
      );
    }

    const system = process.env.SYSTEM_PROMPT;
    if (!system) {
      return NextResponse.json(
        { error: 'SYSTEM_PROMPT is not configured on the server.' },
        { status: 500 }
      );
    }

    const content: Anthropic.Messages.ContentBlockParam[] = [];

    for (const doc of documents) {
      const storagePath = String(doc.storagePath || '').trim();
      if (!storagePath) {
        continue;
      }

      const { data: fileData, error: downloadError } = await admin.storage
        .from(STORAGE_BUCKET)
        .download(storagePath);

      if (downloadError || !fileData) {
        return NextResponse.json(
          {
            error: `Failed to load stored file ${
              doc.fileName || storagePath
            }: ${downloadError?.message || 'Unknown error'}`,
          },
          { status: 500 }
        );
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      content.push({
      type: 'document',
      title: String(doc.label || doc.fileName || 'Document'),
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64,
      },
    });
    }

    const caseContext = [
      `Case number: ${caseRow.case_number}`,
      caseRow.title ? `Title: ${caseRow.title}` : null,
      caseRow.court_name ? `Court: ${caseRow.court_name}` : null,
      caseRow.plaintiff_name ? `Plaintiff: ${caseRow.plaintiff_name}` : null,
      caseRow.defendant_name ? `Defendant: ${caseRow.defendant_name}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    content.push({
      type: 'text',
      text: `[CASE]\n${caseContext}\n[/CASE]\n\n${prompt}`,
    });

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 12000,
      system,
      messages: [{ role: 'user', content }],
    });

    const text = response.content
      .map((block: any) => ('text' in block ? block.text : ''))
      .join('\n')
      .trim();

    const used =
      (response.usage.input_tokens || 0) +
      (response.usage.output_tokens || 0);

    const { error: consumeError } = await admin.rpc('consume_case_credits', {
      p_case_id: caseId,
      p_user_id: auth.user.id,
      p_credits_to_consume: used,
      p_request_type: prompt.slice(0, 100),
      p_model_used:
        process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    });

    if (consumeError) {
      return NextResponse.json({ error: consumeError.message }, { status: 500 });
    }

    await admin.from('chat_messages').insert([
      {
        case_id: caseId,
        user_id: auth.user.id,
        role: 'user',
        content: prompt,
        credits_used: 0,
        attached_document_names: documents.map((d) =>
          String(d.fileName || d.label || 'Document')
        ),
      },
      {
        case_id: caseId,
        user_id: auth.user.id,
        role: 'assistant',
        content: text,
        credits_used: used,
        attached_document_names: null,
      },
    ]);

    const { data: refreshedCase, error: refreshedCaseError } = await admin
      .from('cases')
      .select('credits_balance')
      .eq('id', caseId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (refreshedCaseError) {
      return NextResponse.json(
        { error: refreshedCaseError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      content: text,
      creditsUsed: used,
      remainingCredits: Number(refreshedCase?.credits_balance ?? 0),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
}