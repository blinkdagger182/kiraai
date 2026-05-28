# Kira AI WhatsApp Receipt OCR Backend Spec

Status: ready for implementation planning  
Owner: Kira AI backend/web  
App: `kiraai` Next.js app, deployed on Vercel from this folder  
Client app: `dimeApp` iOS app  
Last updated: 2026-05-28

## Goal

Add a paid WhatsApp receipt ingestion feature for Kira AI.

Users send a receipt image to the Kira AI WhatsApp number. The backend receives the WhatsApp webhook, verifies the sender, checks paid credit availability, runs OCR and structured extraction, stores an itemized bill, creates account transactions, decrements one paid credit, and replies on WhatsApp with a concise itemized summary.

## Non-Goals

- Do not build the iOS UI in this effort beyond the minimum account phone-linking contract.
- Do not store receipt images forever unless the user explicitly needs history images.
- Do not hand-roll WhatsApp infrastructure. Use Meta WhatsApp Cloud API first, because the WhatsApp account is already ready.
- Do not trust OCR totals blindly. Every parsed receipt must preserve confidence and raw extraction data for audit/debug.

## Current Codebase Context

`kiraai` is currently a Next.js App Router app with:

- `app/page.tsx`: marketing page.
- `app/layout.tsx`: shared layout and Vercel Analytics.
- `components/ui/*`: shadcn-style UI components.
- No existing `app/api/*` backend routes yet.
- No existing Supabase, Stripe, WhatsApp, queue, or OCR packages installed.

The backend should be added inside `kiraai` using App Router route handlers:

- `app/api/.../route.ts` for HTTP endpoints.
- `lib/server/...` for server-only providers and business logic.
- `lib/shared/...` for types shared by routes and future UI.
- `supabase/migrations/*.sql` for database schema and RLS.

The iOS app in `dimeApp` remains the user-facing product. Backend records must be designed so `dimeApp` can later fetch itemized receipts and transactions by authenticated Supabase user.

## Recommended Architecture

Use this production flow:

1. WhatsApp sends webhook to `POST /api/webhooks/whatsapp`.
2. Route validates the webhook source and stores an idempotent inbound message row.
3. Route immediately enqueues a background job and returns `200`.
4. Worker downloads the WhatsApp media image.
5. Worker checks sender phone mapping and credit balance.
6. Worker runs OCR and structured receipt extraction.
7. Worker stores receipt, items, generated transactions, and credit ledger entries in Supabase.
8. Worker sends a WhatsApp reply to the user.

Important: webhook handlers must be fast. Do not run OCR inside the webhook request lifecycle.

## App Sync Requirement

The WhatsApp backend and `dimeApp` must stay in sync. A receipt processed from WhatsApp is not complete until the signed-in user can see the generated receipt and transaction inside the app.

For this feature, use a narrow one-way sync first:

- `kiraai` backend is the source of truth for WhatsApp receipt imports.
- `dimeApp` authenticates with the same Supabase project.
- `dimeApp` pulls backend-created receipts and transactions for the signed-in user.
- `dimeApp` stores pulled records in Core Data for fast local display and offline access.
- Existing manually created Core Data transactions remain local unless a later full cloud-sync project is approved.

Do not attempt full bidirectional transaction sync in the first WhatsApp receipt release. That is a larger product change with conflict resolution, delete semantics, and migration risk.

### iOS Sync Fields

Add these fields to the local transaction model when implementing iOS sync:

- `remoteId: String?`: backend `transactions.id`.
- `remoteReceiptId: String?`: backend `receipts.id`.
- `source: String`: `manual`, `whatsapp_receipt`, `bank_import`, etc.
- `syncStatus: String`: `local_only`, `synced`, `pending`, `failed`.
- `remoteUpdatedAt: Date?`: backend `updated_at`.

For receipt item display, either add local receipt tables in Core Data or cache the backend receipt payload as JSON attached to the transaction. Local tables are cleaner if itemized receipt history becomes a core feature.

### Pull Sync Contract

Add backend endpoints:

`GET /api/sync/transactions?since=<iso timestamp>`

Returns backend-created transaction records updated after `since`.

```json
{
  "transactions": [
    {
      "id": "uuid",
      "receiptId": "uuid",
      "source": "whatsapp_receipt",
      "description": "Merchant name",
      "amount": 25.9,
      "currency": "MYR",
      "transactionDate": "2026-05-28",
      "category": "Food",
      "updatedAt": "2026-05-28T10:00:00Z"
    }
  ],
  "nextCursor": "2026-05-28T10:00:00Z"
}
```

`GET /api/sync/receipts?since=<iso timestamp>`

Returns receipt headers and itemized lines updated after `since`.

`GET /api/sync/receipts/:id`

Returns one full receipt with items.

### iOS Sync Behavior

1. User signs in on `dimeApp` with Supabase Auth.
2. App stores the Supabase session securely.
3. App periodically calls sync endpoints:
   - on app launch,
   - after login,
   - when returning to foreground,
   - after the user links WhatsApp,
   - after receiving a push notification in a later phase.
4. App upserts backend records into Core Data by `remoteId`.
5. Log and insights screens read from Core Data as they do today.
6. Duplicate prevention uses `remoteId` and `remoteReceiptId`, not merchant/date/amount guesses.

### Sync Acceptance Criteria

- A receipt sent to WhatsApp appears in `dimeApp` without reinstalling or clearing local data.
- Re-running sync does not duplicate transactions.
- A user cannot fetch another user's receipts or transactions.
- A signed-out app does not call sync endpoints.
- Local manual transactions remain visible after backend sync.
- Backend receipt updates, including `needs_review`, are reflected locally.

## External Services

### Required

- Supabase Auth and Postgres.
- Meta WhatsApp Cloud API.
- OCR/receipt extraction provider.
- Paid credit provider, recommended Stripe.
- Durable background execution, recommended Upstash QStash or equivalent queue.

### OCR Recommendation

Use OpenAI vision structured extraction as the first implementation unless cost or compliance requirements push toward Google Document AI / AWS Textract.

Reason:

- Receipts vary heavily by format and language.
- The output required is semantic, not just text.
- Structured JSON extraction can combine OCR, item parsing, merchant detection, tax/service charge detection, and total validation in one step.

Keep the provider isolated behind:

`lib/server/ocr/receiptExtractor.ts`

So a later provider switch does not rewrite webhook or persistence code.

## End-to-End Test Plan

Build and test this in segments. Do not start with WhatsApp as the first test, because WhatsApp adds webhook setup, phone linking, media download, and provider tokens before the receipt logic is proven.

### Segment 1: Sample Receipt to Structured OCR

Goal: prove receipt image -> itemized JSON.

Inputs:

- One clear receipt image.
- One blurry/partial receipt image.
- One non-receipt image.

Test behavior:

1. Submit the image to an internal OCR test route or local script.
2. Run the selected OCR provider.
3. Validate the output against `ExtractedReceipt`.
4. Confirm detected merchant, date, line items, subtotal, tax/service charge, discount, total, currency, and confidence.
5. Confirm low-quality images return a controlled failure or `needs_review`.

Acceptance:

- Clear receipt returns itemized JSON.
- Non-receipt image is rejected.
- Total validation catches mismatches.
- Raw OCR/extraction data is preserved for debugging.

Current implementation:

- OCR endpoint:
  - `POST /api/ocr/receipt`
- Multipart fields:
  - `image`: receipt image file
  - `defaultCurrency`: optional, defaults to `MYR`
- Server modules:
  - `lib/server/ocr/receiptExtractor.ts`
  - `lib/server/ocr/receiptSchema.ts`
  - `lib/server/ocr/validateReceiptTotals.ts`
- Required local/Vercel env vars:
  - `OPENAI_API_KEY`
  - `OPENAI_RECEIPT_OCR_MODEL`, default `gpt-4.1-mini`

Manual local test:

```bash
curl -sS -X POST "http://localhost:3000/api/ocr/receipt" \
  -F "image=@/absolute/path/to/receipt.jpg" \
  -F "defaultCurrency=MYR"
```

Expected response:

```json
{
  "status": "completed",
  "receipt": {
    "merchantName": "Example Merchant",
    "currency": "MYR",
    "totalAmount": 25.9,
    "items": []
  },
  "validation": {
    "itemTotal": 25.9,
    "totalDifference": 0,
    "needsReview": false
  }
}
```

This endpoint intentionally does not persist to Supabase. Use it to test extraction quality before storage.

Persistence implementation:

- Migration:
  - `supabase/migrations/0001_receipts_sync_schema.sql`
- Persistence module:
  - `lib/server/receipts/persistReceipt.ts`
- Supabase service-role client:
  - `lib/server/supabase/admin.ts`
- Internal extract-and-persist endpoint:
  - `POST /api/internal/ocr/receipt`
- Sync endpoints:
  - `GET /api/sync/transactions?since=<iso timestamp>`
  - `GET /api/sync/receipts?since=<iso timestamp>`
  - `GET /api/sync/receipts/:id`

Required additional env vars:

```bash
SUPABASE_SERVICE_ROLE_KEY=
INTERNAL_API_SECRET=
```

Internal persistence test after applying the migration:

```bash
curl -sS -X POST "http://localhost:3000/api/internal/ocr/receipt" \
  -H "x-kira-internal-secret: $INTERNAL_API_SECRET" \
  -F "userId=<supabase-auth-user-id>" \
  -F "image=@/absolute/path/to/receipt.jpg" \
  -F "defaultCurrency=MYR"
```

Expected persistence response:

```json
{
  "status": "completed",
  "persisted": {
    "receiptId": "uuid",
    "transactionId": "uuid",
    "itemCount": 1
  }
}
```

The internal endpoint is intentionally protected by `x-kira-internal-secret`; do not expose it to clients. WhatsApp processing can call the same `persistReceipt` module after sender-to-user resolution.

### Segment 2: OCR to Supabase Storage

Goal: prove extracted receipts persist under the correct user.

Setup:

- Create one Supabase test user.
- Link a test phone number in `user_phone_numbers`.
- Grant receipt credits in `credit_accounts`.

Test behavior:

1. Process a sample receipt as the test user.
2. Insert `receipt_jobs`, `receipts`, `receipt_items`, `transactions`, and `credit_ledger`.
3. Store the receipt image in private Supabase Storage.
4. Verify RLS prevents another user from reading the receipt.

Acceptance:

- One receipt row is created.
- Multiple item rows are created.
- One transaction row is created for the total.
- One credit is consumed.
- Re-running the same idempotency key does not duplicate data.

### Segment 3: App Sync

Goal: prove backend-created WhatsApp receipt data appears in `dimeApp`.

Test behavior:

1. `dimeApp` signs in with Supabase.
2. App calls `GET /api/sync/transactions?since=<timestamp>`.
3. App calls `GET /api/sync/receipts?since=<timestamp>` or `GET /api/sync/receipts/:id`.
4. App upserts remote records into Core Data by `remoteId`.
5. Existing Log and Insights screens display the synced transaction.

Acceptance:

- A backend receipt appears in the app.
- Re-running sync does not duplicate records.
- Local manual transactions remain visible.
- Signed-out users cannot sync.

### Segment 4: WhatsApp Outbound Smoke Test

Goal: prove Kira AI can send messages through Meta WhatsApp Cloud API.

Use the known phone number id:

- `WHATSAPP_PHONE_NUMBER_ID=1135377602991029`

Test behavior:

1. Set a fresh long-lived or valid temporary access token.
2. Send the approved `hello_world` template to the test phone number.
3. Confirm the user receives the template message.
4. Send a normal text reply only after the user has opened a customer service window by messaging Kira AI.

Acceptance:

- Meta returns a message id.
- Message arrives on the test phone.
- API errors are logged without exposing the token.

### Segment 5: WhatsApp Webhook Verification

Goal: prove Meta can reach the deployed Vercel endpoint.

Setup:

- Deploy `kiraai` to Vercel.
- Configure callback URL:
  - `https://<production-or-preview-domain>/api/webhooks/whatsapp`
- Configure verify token:
  - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- Subscribe to WhatsApp `messages`.

Test behavior:

1. Meta calls `GET /api/webhooks/whatsapp`.
2. Backend validates `hub.verify_token`.
3. Backend returns `hub.challenge`.

Acceptance:

- Meta dashboard accepts the webhook.
- Vercel logs show the verification request.

### Segment 6: WhatsApp Inbound Receipt

Goal: prove real user message -> real backend job.

Test behavior:

1. Test phone sends a receipt image to Kira AI WhatsApp.
2. Meta sends webhook payload to Vercel.
3. Backend stores `whatsapp_inbound_messages` idempotently.
4. Backend creates `receipt_jobs`.
5. Backend resolves `from` / `wa_id` to a verified `user_phone_numbers` row.
6. Backend downloads media from Meta using the image media id.
7. Backend runs OCR and stores receipt data.
8. Backend sends itemized WhatsApp response.
9. App sync pulls the new transaction and receipt.

Acceptance:

- User receives an itemized response in WhatsApp.
- Receipt and items exist in Supabase.
- Credit balance decreases by one.
- Receipt appears in `dimeApp`.
- Duplicate webhooks do not duplicate charges or receipts.

Current webhook implementation:

- Webhook route:
  - `GET /api/webhooks/whatsapp`
  - `POST /api/webhooks/whatsapp`
- Server modules:
  - `lib/server/whatsapp/client.ts`
  - `lib/server/whatsapp/parseWebhook.ts`
  - `lib/server/whatsapp/processInboundReceipt.ts`
  - `lib/server/whatsapp/verifySignature.ts`
  - `lib/server/whatsapp/formatReceiptMessage.ts`
- Migration:
  - `supabase/migrations/0002_whatsapp_ingestion_schema.sql`
- Internal test utilities:
  - `POST /api/internal/whatsapp/send-template`
  - `POST /api/internal/whatsapp/receipt-test`
  - `POST /api/internal/whatsapp/link-test-phone`

Webhook callback for Meta:

```text
https://withkira.app/api/webhooks/whatsapp
```

Webhook verify token:

```text
Use WHATSAPP_WEBHOOK_VERIFY_TOKEN from Vercel env.
```

Current test status:

- Template send accepted by Meta.
- Manual OCR -> persist -> WhatsApp text accepted by Meta.
- Local webhook verification passed.
- Signed synthetic inbound text webhook passed.
- Test phone mapping is seeded for `WHATSAPP_TEST_TO`.

Before production use:

- Move all `.env.local` values into Vercel project env vars.
- Deploy `kiraai`.
- Configure Meta callback to `https://withkira.app/api/webhooks/whatsapp`.
- Subscribe WhatsApp webhook fields to messages.
- Send a real receipt image from the linked test phone.
- Confirm `whatsapp_inbound_messages`, `receipts`, `receipt_items`, and `transactions` rows are created.

## How This Session Can Personally Test the Flow

This session can test the full flow when these credentials/configs are available as environment variables in `kiraai` and Vercel:

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET` if signature verification is enabled
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` or selected OCR provider key
- `APP_BASE_URL`
- A test Supabase user id
- The test user's WhatsApp phone in E.164 format

Testing sequence for this agent:

1. Verify Supabase connectivity from terminal.
2. Verify OCR provider using a local sample receipt image.
3. Verify Supabase insert/read behavior for a test receipt.
4. Deploy or inspect the Vercel preview deployment.
5. Configure/check Vercel environment variables.
6. Send a WhatsApp template message to the test phone using the Meta Graph API.
7. Configure the Meta webhook callback to the Vercel URL.
8. Watch Vercel logs while the test phone sends a receipt image.
9. Confirm database rows, WhatsApp response, credit mutation, and app sync payload.

If the access token is expired, this session can still test Segments 1-3. Segments 4-6 require a fresh token and a configured Meta webhook callback.

## Vercel Hosting Decision

Use Vercel for this feature.

Recommended split:

- Vercel handles WhatsApp webhooks, Supabase writes, credit checks, OCR provider calls, and WhatsApp replies.
- OCR itself should be API-based, such as OpenAI vision structured extraction, Google Document AI, or AWS Textract.
- Do not use native Tesseract/image-processing as the main production OCR path unless later benchmarks prove it is reliable and cheap enough.

Reason:

- Vercel Functions support Node.js route handlers under `app/api`.
- Vercel Functions can run longer tasks with configurable `maxDuration`.
- Fluid compute is suitable for I/O-heavy AI workflows where the function waits on provider APIs.
- WhatsApp webhook handlers should respond quickly; the OCR work should run after the response or via a durable queue.

Recommended production processing model:

1. Webhook route stores inbound message and returns `200`.
2. Queue or background task processes OCR.
3. Worker sends the WhatsApp response when complete.

Use `after()` / `waitUntil()` only for simple early testing or short jobs. For production reliability, use a durable queue such as QStash, because retries and delayed processing are explicit.

## User Identity Model

Users can sign in with:

- Google via Supabase Auth.
- Phone number via Supabase Auth.

For WhatsApp usage, every sender phone number must map to exactly one Supabase user account before paid receipt processing is allowed.

### Phone Linking Rules

- Store phone numbers in E.164 format only, for example `+60123456789`.
- A WhatsApp sender can be linked to only one `auth.users.id`.
- A Supabase user can link multiple verified phone numbers, but only one should be the default WhatsApp phone.
- Phone ownership must be verified before linking.
- Do not link based only on a user typing a phone number in the app.

### Recommended Link Flow

1. Signed-in user opens "Connect WhatsApp" in the app or web account screen.
2. User enters phone number.
3. Backend creates a short OTP and sends it from Kira AI's WhatsApp number.
4. User enters OTP in the app.
5. Backend marks the phone number verified and linked to the Supabase user.
6. Future receipts sent from that WhatsApp number are attributed to that user.

### Unlinked Sender Flow

If an unknown WhatsApp phone sends a receipt:

Reply:

```text
I can read this receipt after your WhatsApp number is connected to your Kira account. Open Kira, go to Account > Connect WhatsApp, and verify this number.
```

No OCR is run and no credit is charged.

## Paid Credit Model

Use a credit ledger rather than a mutable-only balance.

Definitions:

- One successful receipt extraction costs one receipt credit.
- Failed OCR or failed parsing refunds/reserves no credit.
- Duplicate WhatsApp webhook deliveries must not double-charge.
- A credit is consumed only after the inbound image is accepted for processing.

Recommended transaction sequence:

1. Create `receipt_jobs` row with status `queued`.
2. Atomically reserve one credit with a Supabase RPC.
3. If no credit, mark job `blocked_no_credits` and reply with upgrade link.
4. If OCR succeeds, finalize the ledger entry as `consumed`.
5. If OCR fails, release/refund the reserved credit and mark job `failed`.

### Purchase Options

Start with one of:

- Credit packs: simplest paid feature. Example: 10 receipt scans for RM X.
- Subscription allowance: example: Pro includes 50 receipt scans/month.

This spec recommends credit packs first because they are easier to reason about, easier to refund, and avoid monthly allowance edge cases.

## Database Schema

Create migrations under:

`supabase/migrations/`

### Tables

#### `profiles`

App-owned user profile row keyed by Supabase Auth user.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  default_currency text not null default 'MYR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### `user_phone_numbers`

```sql
create table public.user_phone_numbers (
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
```

#### `phone_verification_challenges`

```sql
create table public.phone_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_e164 text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);
```

#### `credit_accounts`

```sql
create table public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_credits integer not null default 0,
  reserved_credits integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint credit_accounts_non_negative check (
    available_credits >= 0 and reserved_credits >= 0
  )
);
```

#### `credit_ledger`

```sql
create type public.credit_ledger_type as enum (
  'purchase',
  'reserve',
  'consume',
  'release',
  'refund',
  'admin_adjustment'
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.credit_ledger_type not null,
  amount integer not null,
  receipt_job_id uuid,
  stripe_event_id text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

#### `whatsapp_inbound_messages`

Stores raw webhook message metadata for idempotency and audit.

```sql
create table public.whatsapp_inbound_messages (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'meta',
  provider_message_id text not null unique,
  from_wa_id text not null,
  from_phone_e164 text,
  message_type text not null,
  media_id text,
  raw_payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
```

#### `receipt_jobs`

```sql
create type public.receipt_job_status as enum (
  'queued',
  'blocked_unlinked_phone',
  'blocked_no_credits',
  'processing',
  'needs_review',
  'completed',
  'failed'
);

create table public.receipt_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  inbound_message_id uuid not null references public.whatsapp_inbound_messages(id) on delete cascade,
  status public.receipt_job_status not null default 'queued',
  credit_ledger_reserve_id uuid references public.credit_ledger(id),
  source text not null default 'whatsapp',
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### `receipts`

```sql
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receipt_job_id uuid not null unique references public.receipt_jobs(id) on delete cascade,
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
```

#### `receipt_items`

```sql
create table public.receipt_items (
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
```

#### `transactions`

Use this for backend-created transactions from WhatsApp receipts. This does not mean all existing local `dimeApp` transactions become cloud-backed in this phase.

```sql
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receipt_id uuid references public.receipts(id) on delete set null,
  source text not null default 'whatsapp_receipt',
  description text not null,
  amount numeric(12,2) not null,
  currency text not null default 'MYR',
  transaction_date date not null,
  category text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### `stripe_customers`

```sql
create table public.stripe_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### `stripe_events`

```sql
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
```

## RLS and Security

Enable RLS on all app tables.

Rules:

- Users can read only their own `profiles`, phone numbers, credit balance, receipts, receipt items through receipt ownership, transactions, and ledger entries.
- Users cannot directly insert/update credit ledger rows from the client.
- Users cannot mark a phone number verified from the client.
- Service-role-only route handlers perform webhook processing, OCR persistence, phone verification completion, and Stripe ledger updates.
- Never expose Supabase service role key to browser or iOS clients.

Provider webhook endpoints must validate signatures/tokens:

- WhatsApp verification token on webhook setup.
- WhatsApp app secret signature if configured.
- Stripe webhook signature.
- Queue signing secret for worker endpoints.

## API Routes

### WhatsApp Webhook

`GET /api/webhooks/whatsapp`

Purpose: Meta webhook verification handshake.

Behavior:

- Read `hub.mode`, `hub.verify_token`, `hub.challenge`.
- If token matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, return challenge.
- Otherwise return `403`.

`POST /api/webhooks/whatsapp`

Purpose: receive inbound WhatsApp events.

Behavior:

- Verify provider signature when configured.
- Parse only image messages for receipt processing.
- Ignore statuses/delivery receipts.
- Insert `whatsapp_inbound_messages` idempotently by provider message id.
- Create `receipt_jobs` row.
- Enqueue `/api/jobs/process-receipt`.
- Return `200` quickly.

Expected non-image reply:

```text
Send me a clear photo of a receipt and I will turn it into an itemized bill.
```

### Receipt Worker

`POST /api/jobs/process-receipt`

Purpose: process one queued receipt job.

Authentication:

- Queue signature or internal bearer token.

Input:

```json
{
  "receiptJobId": "uuid"
}
```

Steps:

1. Load job and inbound message.
2. Resolve sender to verified `user_phone_numbers`.
3. Block if unlinked.
4. Reserve one credit atomically.
5. Download image from WhatsApp media API.
6. Store image in Supabase Storage, private bucket `receipt-images`.
7. Run OCR/extraction.
8. Validate totals.
9. Insert `receipts`, `receipt_items`, and optionally `transactions`.
10. Consume reserved credit.
11. Reply on WhatsApp.
12. Mark job complete.

### Phone Link API

`POST /api/account/whatsapp-phone/start`

Auth: Supabase user session.

Input:

```json
{
  "phoneE164": "+60123456789"
}
```

Behavior:

- Rate limit by user and phone.
- Create verification challenge.
- Send OTP over WhatsApp.

`POST /api/account/whatsapp-phone/verify`

Auth: Supabase user session.

Input:

```json
{
  "phoneE164": "+60123456789",
  "code": "123456"
}
```

Behavior:

- Validate challenge.
- Upsert verified `user_phone_numbers`.
- Set default WhatsApp phone if none exists.

### Credits API

`GET /api/account/credits`

Auth: Supabase user session.

Response:

```json
{
  "availableCredits": 10,
  "reservedCredits": 0
}
```

`POST /api/billing/checkout`

Auth: Supabase user session.

Input:

```json
{
  "priceId": "stripe_price_id"
}
```

Behavior:

- Create or find Stripe customer.
- Create Stripe Checkout Session.
- Redirect user to Stripe.

### Stripe Webhook

`POST /api/webhooks/stripe`

Behavior:

- Verify Stripe signature.
- Store event id idempotently.
- On paid checkout/session or invoice event, credit user account.
- Ignore duplicate event IDs.

## Suggested File Structure

```text
kiraai/
  app/
    api/
      account/
        credits/route.ts
        whatsapp-phone/
          start/route.ts
          verify/route.ts
      billing/
        checkout/route.ts
      jobs/
        process-receipt/route.ts
      webhooks/
        stripe/route.ts
        whatsapp/route.ts
  lib/
    server/
      auth/
        requireUser.ts
      billing/
        stripe.ts
        credits.ts
      queue/
        enqueueReceiptJob.ts
        verifyQueueRequest.ts
      ocr/
        receiptExtractor.ts
        receiptSchema.ts
      supabase/
        admin.ts
        client.ts
      whatsapp/
        client.ts
        parseWebhook.ts
        sendMessages.ts
      receipts/
        processReceiptJob.ts
        validateReceiptTotals.ts
    shared/
      money.ts
      phone.ts
      receiptTypes.ts
  supabase/
    migrations/
      0001_receipt_whatsapp_schema.sql
      0002_receipt_credit_rpcs.sql
```

## Environment Variables

Add to Vercel project settings and local `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=

OPENAI_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_RECEIPT_CREDIT_PRICE_ID=

QUEUE_SIGNING_SECRET=
QSTASH_TOKEN=
APP_BASE_URL=
```

## OCR Output Contract

The extractor must return JSON matching this shape:

```ts
type ExtractedReceipt = {
  merchantName: string | null
  merchantAddress: string | null
  purchasedAt: string | null
  currency: string
  subtotalAmount: number | null
  taxAmount: number | null
  serviceChargeAmount: number | null
  discountAmount: number | null
  totalAmount: number
  paymentMethod: string | null
  confidence: number
  items: Array<{
    name: string
    quantity: number | null
    unitPrice: number | null
    totalPrice: number
    category: string | null
    confidence: number
  }>
  rawText: string
  warnings: string[]
}
```

Validation rules:

- `totalAmount` is required.
- At least one item is required unless the receipt is a simple single-line payment slip.
- Currency defaults to the user's default currency when missing.
- If item totals differ from receipt total by more than configured tolerance, set job status `needs_review` but still reply with a warning.
- Preserve raw OCR text and raw provider JSON for debugging.

## WhatsApp Reply Templates

### Success

```text
Receipt saved.

{merchant}
Total: {currency} {total}

Items:
1. {item} - {currency} {amount}
2. {item} - {currency} {amount}

Credits left: {credits}
```

If there are more than 8 items:

```text
...and {count} more items.
```

### Needs Review

```text
I saved this receipt, but the totals may need review.

Detected total: {currency} {total}
Item total: {currency} {itemTotal}
Credits left: {credits}
```

### No Credits

```text
You are out of receipt credits. Buy more credits here:
{checkoutOrAccountUrl}
```

### Processing Failed

```text
I could not read this receipt clearly. Please send a sharper photo with the full receipt visible. No credit was used.
```

## Idempotency Requirements

Must be idempotent at these boundaries:

- WhatsApp inbound message by `provider_message_id`.
- Receipt job by `inbound_message_id`.
- Credit ledger by `idempotency_key`.
- Stripe events by Stripe event id.
- Queue retries by `receiptJobId`.

Duplicate webhook delivery should result in:

- No duplicate receipt.
- No duplicate transaction.
- No duplicate credit charge.
- Optional duplicate WhatsApp reply avoided by checking job status.

## Error Handling

Job statuses:

- `blocked_unlinked_phone`: sender is not verified.
- `blocked_no_credits`: linked user has no credits.
- `failed`: provider/download/OCR/storage failure.
- `needs_review`: extraction succeeded but totals/confidence are suspicious.
- `completed`: persisted and charged successfully.

Refund/release credit when:

- Media download fails.
- OCR provider fails.
- Extraction JSON fails schema validation.
- Database persistence fails before receipt completion.

Do not refund when:

- Extraction succeeds but confidence is low and the receipt is saved as `needs_review`.

## Privacy and Data Retention

Receipts contain financial and potentially personal data.

Rules:

- Store images in a private Supabase Storage bucket.
- Keep raw images for 30 days by default, then delete or archive unless user has enabled receipt image history.
- Keep structured receipt and item data until user deletion.
- Support user deletion by cascading app tables from `auth.users`.
- Redact obvious card numbers from `raw_ocr_text` before storing when possible.
- Do not log full webhook payloads, OCR raw text, image URLs, phone numbers, or access tokens to Vercel logs.

## Rate Limits and Abuse Protection

Apply limits:

- Phone verification start: 5 attempts per user per hour.
- Phone verification verify: 5 attempts per challenge.
- WhatsApp inbound images: 20 per linked phone per day by default.
- Max image size: follow WhatsApp media limits, but enforce app-level rejection if downloaded image is too large for OCR provider.
- Reject unsupported media types.

## Implementation Phases

### Phase 1: Backend Foundation

- Install Supabase server/client packages.
- Add Supabase admin client.
- Add migrations for profiles, phone numbers, credits, receipts, jobs, and webhooks.
- Add RLS policies.
- Add credit RPCs: reserve, consume, release, grant purchase.
- Add route auth helper.

Acceptance:

- `pnpm build` passes.
- Migrations apply cleanly.
- Authenticated user can read only their own credit balance.

### Phase 2: WhatsApp Webhook

- Add webhook verification route.
- Add POST parser for Meta WhatsApp payloads.
- Store inbound image messages idempotently.
- Reply to unsupported message types.
- Enqueue receipt jobs.

Acceptance:

- Meta webhook verification succeeds.
- Sending an image creates exactly one inbound message and receipt job.
- Replaying the same payload does not create duplicates.

### Phase 3: Phone Linking

- Add start/verify API routes.
- Send WhatsApp OTP.
- Store verified phone mapping.
- Add basic account page or API-only contract for iOS.

Acceptance:

- Signed-in Google user can link a WhatsApp phone.
- Signed-in phone-auth user can link same verified number.
- Unverified numbers cannot process receipts.

### Phase 4: Credits and Billing

- Add Stripe Checkout route.
- Add Stripe webhook.
- Grant credits on successful payment.
- Add no-credit WhatsApp response.

Acceptance:

- Stripe test checkout grants credits once.
- Duplicate Stripe webhook does not grant duplicate credits.
- No-credit users receive upgrade link and are not processed.

### Phase 5: OCR Processing

- Add WhatsApp media download client.
- Store images privately.
- Add OCR provider abstraction.
- Add structured receipt schema validation.
- Persist receipt and items.
- Send success/failure WhatsApp replies.

Acceptance:

- Clear receipt image produces itemized receipt.
- Credit is consumed once on success.
- Credit is not consumed on provider failure.
- Low-confidence total mismatch is marked `needs_review`.

### Phase 6: iOS/Data Contract

- Add authenticated sync endpoints:
  - `GET /api/sync/transactions?since=<iso timestamp>`
  - `GET /api/sync/receipts?since=<iso timestamp>`
  - `GET /api/sync/receipts/:id`
- Add local Core Data sync metadata fields in `dimeApp`.
- Upsert backend-created WhatsApp receipt transactions into Core Data by `remoteId`.
- Keep local manual transactions local for this phase.

Acceptance:

- iOS can fetch receipt and transaction updates for the signed-in user.
- WhatsApp receipt transactions appear in the existing log/insights experience.
- Re-running sync does not create duplicates.
- User cannot fetch another user's receipts or transactions.

## Testing Plan

### Unit Tests

- Phone normalization.
- WhatsApp payload parser.
- Receipt total validation.
- Credit RPC behavior.
- OCR schema validation.

### Integration Tests

- WhatsApp webhook verification.
- Inbound image webhook creates one job.
- Duplicate inbound webhook is idempotent.
- Stripe webhook grants credits once.
- Job processing consumes/releases credits correctly.

### Manual QA

- Link WhatsApp phone to Google-auth account.
- Link WhatsApp phone to phone-auth account.
- Send a clear receipt.
- Send a blurry receipt.
- Send a non-receipt image.
- Send text only.
- Send image from unlinked phone.
- Send receipt with no credits.
- Replay webhook payload.

## Observability

Track structured events without sensitive payloads:

- `whatsapp_webhook_received`
- `receipt_job_queued`
- `receipt_job_processing_started`
- `receipt_ocr_succeeded`
- `receipt_ocr_failed`
- `receipt_credit_reserved`
- `receipt_credit_consumed`
- `receipt_credit_released`
- `whatsapp_reply_sent`

Metrics:

- OCR success rate.
- Average processing time.
- Average OCR cost per receipt.
- Receipts processed per day.
- Credit purchase conversion.
- Unlinked sender count.

## Deployment Checklist

- Add all environment variables in Vercel.
- Configure WhatsApp webhook callback URL:
  - `https://<production-domain>/api/webhooks/whatsapp`
- Subscribe webhook to WhatsApp messages.
- Configure Stripe webhook URL:
  - `https://<production-domain>/api/webhooks/stripe`
- Apply Supabase migrations.
- Create private Supabase Storage bucket `receipt-images`.
- Configure RLS policies.
- Configure queue signing secret.
- Test Meta webhook verification in production.
- Test with Stripe test mode before live mode.

## Key Implementation Notes

- Use `runtime = "nodejs"` for routes that need Stripe signature verification, image buffers, or provider SDKs.
- Keep webhook route lightweight. Store and enqueue, then return.
- Use service role only in server-only modules.
- Keep all provider clients under `lib/server`.
- Keep money values as `numeric(12,2)` in Postgres and avoid floating point math for credit/payment logic.
- Prefer database RPCs for credit mutation so reserve/consume/release operations are atomic.
- Treat WhatsApp media URLs as short-lived. Download immediately during job processing.

## Official Docs

- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Vercel Functions: https://vercel.com/docs/functions
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Phone Login: https://supabase.com/docs/guides/auth/phone-login
- Meta WhatsApp Cloud API Webhooks: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
- Meta WhatsApp Cloud API Media: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media
- Stripe Checkout: https://docs.stripe.com/payments/checkout
- Stripe Webhooks: https://docs.stripe.com/webhooks
