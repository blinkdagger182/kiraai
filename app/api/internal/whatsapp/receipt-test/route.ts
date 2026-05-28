import { NextResponse } from "next/server"
import {
  extractReceiptFromImage,
  ReceiptExtractionError,
} from "@/lib/server/ocr/receiptExtractor"
import { persistReceipt } from "@/lib/server/receipts/persistReceipt"
import { sendWhatsAppText } from "@/lib/server/whatsapp/client"
import { formatReceiptMessage } from "@/lib/server/whatsapp/formatReceiptMessage"

export const runtime = "nodejs"
export const maxDuration = 60

const maxImageBytes = 12 * 1024 * 1024

function verifyInternalRequest(request: Request) {
  const expectedSecret = process.env.INTERNAL_API_SECRET
  const actualSecret = request.headers.get("x-kira-internal-secret")

  return Boolean(expectedSecret && actualSecret && actualSecret === expectedSecret)
}

export async function POST(request: Request) {
  if (!verifyInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const to = process.env.WHATSAPP_TEST_TO

  if (!to) {
    return NextResponse.json(
      { error: "WHATSAPP_TEST_TO is not configured." },
      { status: 400 },
    )
  }

  const formData = await request.formData()
  const image = formData.get("image")
  const userId = formData.get("userId")
  const shouldPersist = formData.get("persist") === "true"
  const defaultCurrency = formData.get("defaultCurrency")

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "Upload a receipt image using multipart field `image`." },
      { status: 400 },
    )
  }

  if (image.size > maxImageBytes) {
    return NextResponse.json(
      { error: "Image is too large. Maximum size is 12 MB." },
      { status: 413 },
    )
  }

  if (shouldPersist && (typeof userId !== "string" || userId.length === 0)) {
    return NextResponse.json(
      { error: "Provide `userId` when `persist=true`." },
      { status: 400 },
    )
  }

  try {
    const result = await extractReceiptFromImage({
      image: Buffer.from(await image.arrayBuffer()),
      mimeType: image.type,
      defaultCurrency:
        typeof defaultCurrency === "string" && defaultCurrency.length > 0
          ? defaultCurrency
          : "MYR",
    })

    const persisted =
      shouldPersist && typeof userId === "string"
        ? await persistReceipt({
            userId,
            receipt: result.receipt,
            source: "manual_whatsapp_test",
          })
        : null

    const message = formatReceiptMessage({
      receipt: result.receipt,
    })
    const whatsapp = await sendWhatsAppText({
      to,
      body: message,
    })

    return NextResponse.json({
      sent: true,
      messageId: whatsapp.messages?.[0]?.id ?? null,
      status: result.needsReview ? "needs_review" : "completed",
      receipt: result.receipt,
      validation: {
        itemTotal: result.itemTotal,
        totalDifference: result.totalDifference,
        needsReview: result.needsReview,
      },
      persisted,
      message,
    })
  } catch (error) {
    if (error instanceof ReceiptExtractionError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Receipt test failed." },
      { status: 500 },
    )
  }
}
