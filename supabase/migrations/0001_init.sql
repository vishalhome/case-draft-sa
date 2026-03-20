create extension if not exists "pgcrypto";

create table if not exists public.credit_packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  credits integer not null check (credits > 0),
  price_zar numeric(10,2) not null check (price_zar > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_number text not null,
  title text,
  court_name text,
  plaintiff_name text,
  defendant_name text,
  status text not null default 'active' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  unique (user_id, case_number)
);

create table if not exists public.payfast_payments (
  id uuid primary key default gen_random_uuid(),
  m_payment_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  credit_package_id uuid not null references public.credit_packages(id),
  amount_zar numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','complete','failed','cancelled','unknown')),
  payfast_payment_id text,
  payfast_status text,
  credits_granted boolean not null default false,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid references public.payfast_payments(id) on delete set null,
  kind text not null check (kind in ('purchase','usage','adjustment')),
  credits integer not null,
  description text,
  model_used text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  credits_used integer not null default 0,
  attached_document_names text[],
  created_at timestamptz not null default now()
);

create index if not exists idx_cases_user on public.cases(user_id);
create index if not exists idx_payfast_case on public.payfast_payments(case_id);
create index if not exists idx_ledger_case on public.case_credit_ledger(case_id, user_id);
create index if not exists idx_messages_case on public.chat_messages(case_id, user_id, created_at);

insert into public.credit_packages (code, name, credits, price_zar)
values
  ('STARTER_50', 'Starter pack', 50, 1000.00),
  ('TOPUP_20', 'Top-up pack', 20, 200.00)
on conflict (code) do update set
  name = excluded.name,
  credits = excluded.credits,
  price_zar = excluded.price_zar,
  is_active = true;

alter table public.credit_packages enable row level security;
alter table public.cases enable row level security;
alter table public.payfast_payments enable row level security;
alter table public.case_credit_ledger enable row level security;
alter table public.chat_messages enable row level security;

create policy if not exists "packages readable by authenticated users"
on public.credit_packages for select to authenticated using (true);

create policy if not exists "users manage own cases"
on public.cases for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "users read own payments"
on public.payfast_payments for select to authenticated using (auth.uid() = user_id);

create policy if not exists "users read own ledger"
on public.case_credit_ledger for select to authenticated using (auth.uid() = user_id);

create policy if not exists "users manage own chat"
on public.chat_messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_payments_touch on public.payfast_payments;
create trigger trg_payments_touch before update on public.payfast_payments
for each row execute function public.touch_updated_at();

create or replace function public.get_case_available_credits(p_case_id uuid, p_user_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(credits), 0)::integer
  from public.case_credit_ledger
  where case_id = p_case_id and user_id = p_user_id;
$$;

grant execute on function public.get_case_available_credits(uuid, uuid) to authenticated;

create or replace function public.get_user_case_summaries(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  case_number text,
  title text,
  court_name text,
  plaintiff_name text,
  defendant_name text,
  status text,
  created_at timestamptz,
  available_credits integer
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.user_id,
    c.case_number,
    c.title,
    c.court_name,
    c.plaintiff_name,
    c.defendant_name,
    c.status,
    c.created_at,
    coalesce((select sum(l.credits) from public.case_credit_ledger l where l.case_id = c.id and l.user_id = c.user_id), 0)::integer as available_credits
  from public.cases c
  where c.user_id = p_user_id
  order by c.created_at desc;
$$;

grant execute on function public.get_user_case_summaries(uuid) to authenticated;

create or replace function public.grant_case_credits_from_payment(p_m_payment_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payfast_payments%rowtype;
  v_package public.credit_packages%rowtype;
begin
  select * into v_payment from public.payfast_payments where m_payment_id = p_m_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;

  if v_payment.credits_granted then
    return;
  end if;

  if v_payment.status <> 'complete' then
    raise exception 'Payment is not complete';
  end if;

  select * into v_package from public.credit_packages where id = v_payment.credit_package_id;
  if not found then
    raise exception 'Package not found';
  end if;

  insert into public.case_credit_ledger (case_id, user_id, payment_id, kind, credits, description)
  values (v_payment.case_id, v_payment.user_id, v_payment.id, 'purchase', v_package.credits, v_package.name || ' payment');

  update public.payfast_payments set credits_granted = true where id = v_payment.id;
end;
$$;

create or replace function public.consume_case_credits(
  p_case_id uuid,
  p_user_id uuid,
  p_credits_to_consume integer,
  p_request_type text,
  p_model_used text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available integer;
begin
  if p_credits_to_consume <= 0 then
    return;
  end if;

  select public.get_case_available_credits(p_case_id, p_user_id) into v_available;
  if v_available < p_credits_to_consume then
    raise exception 'Insufficient credits. Needed %, available %', p_credits_to_consume, v_available;
  end if;

  insert into public.case_credit_ledger (case_id, user_id, kind, credits, description, model_used)
  values (p_case_id, p_user_id, 'usage', (0 - p_credits_to_consume), p_request_type, p_model_used);
end;
$$;

grant execute on function public.consume_case_credits(uuid, uuid, integer, text, text) to authenticated;
