import { NextResponse } from "next/server"
import { requireBearerUser } from "@/lib/server/auth/requireUser"
import { createAdminClient } from "@/lib/server/supabase/admin"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { user, error } = await requireBearerUser(request)

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const url = new URL(request.url)
  const since = url.searchParams.get("since")
  const supabase = createAdminClient()

  let query = supabase
    .from("transactions")
    .select(
      "id, receipt_id, source, description, amount, currency, transaction_date, category, metadata, updated_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: true })
    .limit(200)

  if (since) {
    query = query.gt("updated_at", since)
  }

  const { data, error: queryError } = await query

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json({
    transactions: data.map((transaction) => ({
      id: transaction.id,
      receiptId: transaction.receipt_id,
      source: transaction.source,
      description: transaction.description,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      transactionDate: transaction.transaction_date,
      category: transaction.category,
      metadata: transaction.metadata,
      updatedAt: transaction.updated_at,
    })),
    nextCursor: data.at(-1)?.updated_at ?? since ?? null,
  })
}
