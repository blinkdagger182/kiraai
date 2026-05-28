import type { ExtractedReceipt } from "./receiptSchema"

export type ReceiptValidationResult = {
  itemTotal: number
  totalDifference: number
  needsReview: boolean
  warnings: string[]
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

export function validateReceiptTotals(
  receipt: ExtractedReceipt,
): ReceiptValidationResult {
  const itemTotal = roundMoney(
    receipt.items.reduce((sum, item) => sum + item.totalPrice, 0),
  )
  const totalDifference = roundMoney(itemTotal - receipt.totalAmount)
  const warnings = [...receipt.warnings]

  if (receipt.items.length === 0) {
    warnings.push("No itemized receipt lines were detected.")
  }

  if (Math.abs(totalDifference) > 1) {
    warnings.push(
      `Item total differs from receipt total by ${receipt.currency} ${Math.abs(totalDifference).toFixed(2)}.`,
    )
  }

  if (receipt.confidence < 0.7) {
    warnings.push("Overall extraction confidence is low.")
  }

  if (receipt.purchasedAt) {
    const purchasedAt = new Date(receipt.purchasedAt)

    if (Number.isNaN(purchasedAt.getTime())) {
      warnings.push("Receipt date could not be parsed.")
    } else {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(now.getDate() + 1)

      if (purchasedAt > tomorrow) {
        warnings.push("Receipt date appears to be in the future.")
      }
    }
  }

  return {
    itemTotal,
    totalDifference,
    needsReview: warnings.length > receipt.warnings.length,
    warnings,
  }
}
