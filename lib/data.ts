import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { safeCaseTitle } from '@/lib/utils';

export async function getPackages() {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from('credit_packages').select('*').eq('is_active', true).order('price_zar');
  if (error) throw error;
  return data;
}

export async function getDashboardCases(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc('get_user_case_summaries', { p_user_id: userId });
  if (error) throw error;
  return data;
}

export async function getCaseForUser(caseId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const { data: caseRow, error } = await admin.from('cases').select('*').eq('id', caseId).eq('user_id', userId).single();
  if (error) throw error;

  const { data: messages, error: msgError } = await admin
    .from('chat_messages')
    .select('*')
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(50);
  if (msgError) throw msgError;

  const { data: credits, error: creditsError } = await admin
    .rpc('get_case_available_credits', { p_case_id: caseId, p_user_id: userId });
  if (creditsError) throw creditsError;

  return { caseRow, messages, availableCredits: Number(credits ?? 0) };
}

export async function createCaseForUser(userId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const caseNumber = String(formData.get('case_number') || '').trim();
  if (!caseNumber) return { error: 'Case number is required.' };

  const payload = {
    user_id: userId,
    case_number: caseNumber,
    title: String(formData.get('title') || '').trim() || safeCaseTitle(caseNumber),
    court_name: String(formData.get('court_name') || '').trim() || null,
    plaintiff_name: String(formData.get('plaintiff_name') || '').trim() || null,
    defendant_name: String(formData.get('defendant_name') || '').trim() || null,
    status: 'active'
  };

  const { data, error } = await supabase.from('cases').insert(payload).select('*').single();
  if (error) return { error: error.message };
  return { data };
}
