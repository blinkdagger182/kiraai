import { z } from "zod"

export const receiptItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  totalPrice: z.number(),
  category: z.string().nullable(),
  confidence: z.number().min(0).max(1),
})

export const extractedReceiptSchema = z.object({
  merchantName: z.string().nullable(),
  merchantAddress: z.string().nullable(),
  purchasedAt: z.string().nullable(),
  currency: z.string().min(3).max(3),
  subtotalAmount: z.number().nullable(),
  taxAmount: z.number().nullable(),
  serviceChargeAmount: z.number().nullable(),
  discountAmount: z.number().nullable(),
  totalAmount: z.number(),
  paymentMethod: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  items: z.array(receiptItemSchema),
  rawText: z.string(),
  warnings: z.array(z.string()),
})

export type ExtractedReceipt = z.infer<typeof extractedReceiptSchema>

export const receiptJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    merchantName: { type: ["string", "null"] },
    merchantAddress: { type: ["string", "null"] },
    purchasedAt: {
      type: ["string", "null"],
      description: "ISO 8601 datetime if visible, otherwise null.",
    },
    currency: {
      type: "string",
      description: "Three-letter ISO currency code. Default to MYR if unclear.",
    },
    subtotalAmount: { type: ["number", "null"] },
    taxAmount: { type: ["number", "null"] },
    serviceChargeAmount: { type: ["number", "null"] },
    discountAmount: { type: ["number", "null"] },
    totalAmount: { type: "number" },
    paymentMethod: { type: ["string", "null"] },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          quantity: { type: ["number", "null"] },
          unitPrice: { type: ["number", "null"] },
          totalPrice: { type: "number" },
          category: { type: ["string", "null"] },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
        },
        required: [
          "name",
          "quantity",
          "unitPrice",
          "totalPrice",
          "category",
          "confidence",
        ],
      },
    },
    rawText: {
      type: "string",
      description: "Visible receipt text transcribed from the image.",
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "merchantName",
    "merchantAddress",
    "purchasedAt",
    "currency",
    "subtotalAmount",
    "taxAmount",
    "serviceChargeAmount",
    "discountAmount",
    "totalAmount",
    "paymentMethod",
    "confidence",
    "items",
    "rawText",
    "warnings",
  ],
} as const
