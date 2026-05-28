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
    .from("receipts")
    .select(
      "id, source, merchant_name, merchant_address, purchased_at, currency, subtotal_amount, tax_amount, service_charge_amount, discount_amount, total_amount, payment_method, confidence, image_storage_path, updated_at, receipt_items(id, line_index, name, quantity, unit_price, total_price, category, confidence)",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: true })
    .limit(100)

  if (since) {
    query = query.gt("updated_at", since)
  }

  const { data, error: queryError } = await query

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json({
    receipts: data.map((receipt) => ({
      id: receipt.id,
      source: receipt.source,
      merchantName: receipt.merchant_name,
      merchantAddress: receipt.merchant_address,
      purchasedAt: receipt.purchased_at,
      currency: receipt.currency,
      subtotalAmount: receipt.subtotal_amount,
      taxAmount: receipt.tax_amount,
      serviceChargeAmount: receipt.service_charge_amount,
      discountAmount: receipt.discount_amount,
      totalAmount: receipt.total_amount,
      paymentMethod: receipt.payment_method,
      confidence: receipt.confidence,
      imageStoragePath: receipt.image_storage_path,
      updatedAt: receipt.updated_at,
      items: receipt.receipt_items,
    })),
    nextCursor: data.at(-1)?.updated_at ?? since ?? null,
  })
}
