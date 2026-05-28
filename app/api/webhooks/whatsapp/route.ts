import { NextResponse } from "next/server"
import { parseWhatsAppWebhook } from "@/lib/server/whatsapp/parseWebhook"
import { processInboundWhatsAppReceipt } from "@/lib/server/whatsapp/processInboundReceipt"
import { verifyWhatsAppSignature } from "@/lib/server/whatsapp/verifySignature"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Forbidden." }, { status: 403 })
}

export async function POST(request: Request) {
  const body = await request.text()
  const isValidSignature = await verifyWhatsAppSignature(request, body)

  if (!isValidSignature) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 })
  }

  const payload = JSON.parse(body)
  const inboundMessages = parseWhatsAppWebhook(payload)
  const results = []

  for (const inbound of inboundMessages) {
    try {
      results.push(await processInboundWhatsAppReceipt(inbound))
    } catch (error) {
      console.error("WhatsApp inbound processing failed", error)
      results.push({
        providerMessageId: inbound.providerMessageId,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({
    ok: true,
    received: inboundMessages.length,
    results,
  })
}
