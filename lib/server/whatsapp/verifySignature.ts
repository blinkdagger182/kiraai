import { createHmac, timingSafeEqual } from "node:crypto"

export async function verifyWhatsAppSignature(request: Request, body: string) {
  const appSecret = process.env.WHATSAPP_APP_SECRET

  if (!appSecret) {
    return true
  }

  const signature = request.headers.get("x-hub-signature-256")

  if (!signature?.startsWith("sha256=")) {
    return false
  }

  const expected = `sha256=${createHmac("sha256", appSecret)
    .update(body)
    .digest("hex")}`

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
