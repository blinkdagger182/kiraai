import { NextResponse } from "next/server"
import { sendWhatsAppHelloWorldTemplate } from "@/lib/server/whatsapp/client"

export const runtime = "nodejs"

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

  try {
    const response = await sendWhatsAppHelloWorldTemplate(to)

    return NextResponse.json({
      sent: true,
      messageId: response.messages?.[0]?.id ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WhatsApp send failed." },
      { status: 500 },
    )
  }
}
