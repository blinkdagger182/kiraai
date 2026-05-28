import OpenAI from "openai"
import {
  extractedReceiptSchema,
  receiptJsonSchema,
  type ExtractedReceipt,
} from "./receiptSchema"
import { normalizeReceiptDate } from "./normalizeReceiptDate"
import { validateReceiptTotals } from "./validateReceiptTotals"

const supportedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
])

export type ExtractReceiptInput = {
  image: Buffer
  mimeType: string
  defaultCurrency?: string
}

export type ExtractReceiptResult = {
  receipt: ExtractedReceipt
  needsReview: boolean
  itemTotal: number
  totalDifference: number
}

export class ReceiptExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReceiptExtractionError"
  }
}

export async function extractReceiptFromImage({
  image,
  mimeType,
  defaultCurrency = "MYR",
}: ExtractReceiptInput): Promise<ExtractReceiptResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new ReceiptExtractionError("OPENAI_API_KEY is not configured.")
  }

  if (!supportedMimeTypes.has(mimeType)) {
    throw new ReceiptExtractionError(`Unsupported image type: ${mimeType}`)
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const imageUrl = `data:${mimeType};base64,${image.toString("base64")}`

  const response = await client.responses.create({
    model: process.env.OPENAI_RECEIPT_OCR_MODEL ?? "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "You extract retail and restaurant receipt data. Return only data visible in the image. Do not invent item names, prices, taxes, dates, or merchant details. Use null when a field is unclear. Keep money values as decimal numbers. If currency is unclear, use the provided default currency. For Malaysian receipts, ambiguous numeric dates like 08-08-25 are usually dd-MM-yy, meaning 2025-08-08, not 2008-08-25.",
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Extract this receipt into itemized JSON. Default currency: ${defaultCurrency}. If this is not a receipt, return an empty items array, totalAmount 0, confidence 0, and add a warning explaining why.`,
          },
          {
            type: "input_image",
            image_url: imageUrl,
            detail: "high",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "receipt_extraction",
        strict: true,
        schema: receiptJsonSchema,
      },
    },
  })

  const parsed = normalizeReceiptDate(
    extractedReceiptSchema.parse(JSON.parse(response.output_text)),
  )
  const validation = validateReceiptTotals(parsed)

  return {
    receipt: {
      ...parsed,
      warnings: validation.warnings,
    },
    needsReview: validation.needsReview,
    itemTotal: validation.itemTotal,
    totalDifference: validation.totalDifference,
  }
}
