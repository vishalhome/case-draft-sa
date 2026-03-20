export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface CreditPackage {
  id: string;
  code: 'STARTER_50' | 'TOPUP_20';
  name: string;
  credits: number;
  price_zar: number;
  is_active: boolean;
}

export interface CaseRow {
  id: string;
  user_id: string;
  case_number: string;
  title: string | null;
  court_name: string | null;
  plaintiff_name: string | null;
  defendant_name: string | null;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
}

export interface CaseSummary extends CaseRow {
  available_credits: number;
}

export interface ChatMessageRow {
  id: string;
  case_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  credits_used: number;
  created_at: string;
  attached_document_names: string[] | null;
}
