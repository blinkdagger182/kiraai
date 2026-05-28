import { NextResponse } from "next/server"
import {
  extractReceiptFromImage,
  ReceiptExtractionError,
} from "@/lib/server/ocr/receiptExtractor"

export const runtime = "nodejs"
export const maxDuration = 60

const maxImageBytes = 12 * 1024 * 1024

export async function POST(request: Request) {
  const formData = await request.formData()
  const image = formData.get("image")
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

  try {
    const result = await extractReceiptFromImage({
      image: Buffer.from(await image.arrayBuffer()),
      mimeType: image.type,
      defaultCurrency:
        typeof defaultCurrency === "string" && defaultCurrency.length > 0
          ? defaultCurrency
          : "MYR",
    })

    return NextResponse.json({
      status: result.needsReview ? "needs_review" : "completed",
      receipt: result.receipt,
      validation: {
        itemTotal: result.itemTotal,
        totalDifference: result.totalDifference,
        needsReview: result.needsReview,
      },
    })
  } catch (error) {
    if (error instanceof ReceiptExtractionError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Receipt OCR failed", error)

    return NextResponse.json(
      { error: "Receipt OCR failed." },
      { status: 500 },
    )
  }
}
