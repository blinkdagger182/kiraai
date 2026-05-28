create table if not exists public.user_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_e164 text not null unique,
  whatsapp_wa_id text unique,
  is_verified boolean not null default false,
  is_default_whatsapp boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_inbound_messages (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'meta',
  provider_message_id text not null unique,
  from_wa_id text not null,
  from_phone_e164 text,
  message_type text not null,
  media_id text,
  raw_payload jsonb not null,
  reply_message_id text,
  error_code text,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists user_phone_numbers_user_idx
  on public.user_phone_numbers (user_id);

create index if not exists whatsapp_inbound_from_idx
  on public.whatsapp_inbound_messages (from_wa_id, received_at);

drop trigger if exists user_phone_numbers_set_updated_at on public.user_phone_numbers;
create trigger user_phone_numbers_set_updated_at
before update on public.user_phone_numbers
for each row execute function public.set_updated_at();

alter table public.user_phone_numbers enable row level security;
alter table public.whatsapp_inbound_messages enable row level security;

drop policy if exists "Users can read own phone numbers" on public.user_phone_numbers;
create policy "Users can read own phone numbers"
on public.user_phone_numbers
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own inbound whatsapp messages" on public.whatsapp_inbound_messages;
create policy "Users can read own inbound whatsapp messages"
on public.whatsapp_inbound_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.user_phone_numbers
    where user_phone_numbers.whatsapp_wa_id = whatsapp_inbound_messages.from_wa_id
      and user_phone_numbers.user_id = auth.uid()
  )
);
