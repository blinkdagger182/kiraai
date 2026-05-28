create extension if not exists "pgcrypto";

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'manual_ocr_test',
  merchant_name text,
  merchant_address text,
  purchased_at timestamptz,
  currency text not null default 'MYR',
  subtotal_amount numeric(12,2),
  tax_amount numeric(12,2),
  service_charge_amount numeric(12,2),
  discount_amount numeric(12,2),
  total_amount numeric(12,2) not null,
  payment_method text,
  confidence numeric(4,3),
  raw_ocr_text text,
  raw_extraction jsonb not null default '{}'::jsonb,
  image_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  line_index integer not null,
  name text not null,
  quantity numeric(12,3),
  unit_price numeric(12,2),
  total_price numeric(12,2) not null,
  category text,
  confidence numeric(4,3),
  created_at timestamptz not null default now(),
  unique (receipt_id, line_index)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receipt_id uuid references public.receipts(id) on delete set null,
  source text not null default 'manual_ocr_test',
  description text not null,
  amount numeric(12,2) not null,
  currency text not null default 'MYR',
  transaction_date date not null,
  category text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists receipts_user_updated_idx
  on public.receipts (user_id, updated_at);

create index if not exists receipt_items_receipt_line_idx
  on public.receipt_items (receipt_id, line_index);

create index if not exists transactions_user_updated_idx
  on public.transactions (user_id, updated_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists receipts_set_updated_at on public.receipts;
create trigger receipts_set_updated_at
before update on public.receipts
for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "Users can read own receipts" on public.receipts;
create policy "Users can read own receipts"
on public.receipts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own receipt items" on public.receipt_items;
create policy "Users can read own receipt items"
on public.receipt_items
for select
to authenticated
using (
  exists (
    select 1
    from public.receipts
    where receipts.id = receipt_items.receipt_id
      and receipts.user_id = auth.uid()
  )
);

drop policy if exists "Users can read own transactions" on public.transactions;
create policy "Users can read own transactions"
on public.transactions
for select
to authenticated
using (auth.uid() = user_id);
