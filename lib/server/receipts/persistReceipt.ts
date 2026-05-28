import type { ExtractedReceipt } from "@/lib/server/ocr/receiptSchema"
import { createAdminClient } from "@/lib/server/supabase/admin"

export type PersistReceiptInput = {
  userId: string
  receipt: ExtractedReceipt
  source?: string
  imageStoragePath?: string | null
}

export type PersistedReceipt = {
  receiptId: string
  transactionId: string
  itemCount: number
}

export async function persistReceipt({
  userId,
  receipt,
  source = "manual_ocr_test",
  imageStoragePath = null,
}: PersistReceiptInput): Promise<PersistedReceipt> {
  const supabase = createAdminClient()

  const { data: receiptRow, error: receiptError } = await supabase
    .from("receipts")
    .insert({
      user_id: userId,
      source,
      merchant_name: receipt.merchantName,
      merchant_address: receipt.merchantAddress,
      purchased_at: receipt.purchasedAt,
      currency: receipt.currency,
      subtotal_amount: receipt.subtotalAmount,
      tax_amount: receipt.taxAmount,
      service_charge_amount: receipt.serviceChargeAmount,
      discount_amount: receipt.discountAmount,
      total_amount: receipt.totalAmount,
      payment_method: receipt.paymentMethod,
      confidence: receipt.confidence,
      raw_ocr_text: receipt.rawText,
      raw_extraction: receipt,
      image_storage_path: imageStoragePath,
    })
    .select("id")
    .single()

  if (receiptError) {
    throw new Error(`Failed to insert receipt: ${receiptError.message}`)
  }

  const receiptId = receiptRow.id as string

  if (receipt.items.length > 0) {
    const { error: itemsError } = await supabase.from("receipt_items").insert(
      receipt.items.map((item, index) => ({
        receipt_id: receiptId,
        line_index: index,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        category: item.category,
        confidence: item.confidence,
      })),
    )

    if (itemsError) {
      throw new Error(`Failed to insert receipt items: ${itemsError.message}`)
    }
  }

  const transactionDate = receipt.purchasedAt
    ? receipt.purchasedAt.slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  const { data: transactionRow, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      receipt_id: receiptId,
      source,
      description: receipt.merchantName ?? "Receipt",
      amount: receipt.totalAmount,
      currency: receipt.currency,
      transaction_date: transactionDate,
      category: null,
      metadata: {
        paymentMethod: receipt.paymentMethod,
        confidence: receipt.confidence,
      },
    })
    .select("id")
    .single()

  if (transactionError) {
    throw new Error(
      `Failed to insert receipt transaction: ${transactionError.message}`,
    )
  }

  return {
    receiptId,
    transactionId: transactionRow.id as string,
    itemCount: receipt.items.length,
  }
}
