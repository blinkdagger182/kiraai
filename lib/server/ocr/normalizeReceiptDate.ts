import type { ExtractedReceipt } from "./receiptSchema"

const numericDatePattern =
  /\b(\d{2})[-/](\d{2})[-/](\d{2})(?:\s+(\d{2}):(\d{2}))?\b/

export function normalizeReceiptDate(receipt: ExtractedReceipt): ExtractedReceipt {
  const match = receipt.rawText.match(numericDatePattern)

  if (!match) {
    return receipt
  }

  const [, dayText, monthText, yearText, hourText, minuteText] = match
  const day = Number(dayText)
  const month = Number(monthText)
  const year = 2000 + Number(yearText)
  const hour = Number(hourText ?? 0)
  const minute = Number(minuteText ?? 0)

  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59
  ) {
    return receipt
  }

  const isoDate = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}T${hour
    .toString()
    .padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`

  return {
    ...receipt,
    purchasedAt: isoDate,
  }
}
