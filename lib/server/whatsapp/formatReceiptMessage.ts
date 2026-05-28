import type { ExtractedReceipt } from "@/lib/server/ocr/receiptSchema"

const formatMoney = (currency: string, amount: number) =>
  `${currency} ${amount.toFixed(2)}`

export function formatReceiptMessage({
  receipt,
  creditsLeft,
}: {
  receipt: ExtractedReceipt
  creditsLeft?: number
}) {
  const merchant = receipt.merchantName ?? "Receipt"
  const lines = [
    "Receipt saved.",
    "",
    merchant,
    `Total: ${formatMoney(receipt.currency, receipt.totalAmount)}`,
  ]

  if (receipt.purchasedAt) {
    lines.push(`Date: ${receipt.purchasedAt.slice(0, 10)}`)
  }

  lines.push("", "Items:")

  const visibleItems = receipt.items.slice(0, 8)

  if (visibleItems.length === 0) {
    lines.push("No itemized lines detected.")
  } else {
    visibleItems.forEach((item, index) => {
      const quantity =
        item.quantity && item.quantity !== 1 ? ` x${item.quantity}` : ""
      lines.push(
        `${index + 1}. ${item.name}${quantity} - ${formatMoney(
          receipt.currency,
          item.totalPrice,
        )}`,
      )
    })
  }

  if (receipt.items.length > visibleItems.length) {
    lines.push(`...and ${receipt.items.length - visibleItems.length} more items.`)
  }

  if (creditsLeft !== undefined) {
    lines.push("", `Credits left: ${creditsLeft}`)
  }

  if (receipt.warnings.length > 0) {
    lines.push("", "Review notes:")
    receipt.warnings.slice(0, 3).forEach((warning) => {
      lines.push(`- ${warning}`)
    })
  }

  return lines.join("\n")
}
