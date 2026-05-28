import { extractReceiptFromImage } from "@/lib/server/ocr/receiptExtractor"
import { persistReceipt } from "@/lib/server/receipts/persistReceipt"
import { createAdminClient } from "@/lib/server/supabase/admin"
import {
  downloadWhatsAppMedia,
  sendWhatsAppText,
} from "@/lib/server/whatsapp/client"
import { formatReceiptMessage } from "@/lib/server/whatsapp/formatReceiptMessage"
import type { WhatsAppInboundMessage } from "@/lib/server/whatsapp/parseWebhook"

const toE164 = (waId: string) => `+${waId.replace(/^\+/, "")}`

export async function processInboundWhatsAppReceipt(
  inbound: WhatsAppInboundMessage,
) {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from("whatsapp_inbound_messages")
    .select("id, processed_at, reply_message_id")
    .eq("provider_message_id", inbound.providerMessageId)
    .maybeSingle()

  if (existing?.processed_at) {
    return {
      skipped: true,
      reason: "already_processed",
      inboundMessageId: existing.id as string,
      replyMessageId: existing.reply_message_id as string | null,
    }
  }

  const { data: inboundRow, error: inboundError } = await supabase
    .from("whatsapp_inbound_messages")
    .upsert(
      {
        provider_message_id: inbound.providerMessageId,
        from_wa_id: inbound.fromWaId,
        from_phone_e164: toE164(inbound.fromWaId),
        message_type: inbound.messageType,
        media_id: inbound.mediaId,
        raw_payload: inbound.rawPayload,
      },
      {
        onConflict: "provider_message_id",
        ignoreDuplicates: false,
      },
    )
    .select("id")
    .single()

  if (inboundError) {
    throw new Error(`Failed to store inbound WhatsApp message: ${inboundError.message}`)
  }

  const inboundMessageId = inboundRow.id as string

  try {
    const { data: phoneMapping, error: phoneError } = await supabase
      .from("user_phone_numbers")
      .select("user_id")
      .eq("whatsapp_wa_id", inbound.fromWaId)
      .eq("is_verified", true)
      .maybeSingle()

    if (phoneError) {
      throw new Error(`Failed to resolve WhatsApp sender: ${phoneError.message}`)
    }

    if (!phoneMapping?.user_id) {
      const reply = await sendWhatsAppText({
        to: inbound.fromWaId,
        body: "I can read receipts after this WhatsApp number is connected to your Kira account.",
      })

      await supabase
        .from("whatsapp_inbound_messages")
        .update({
          reply_message_id: reply.messages?.[0]?.id ?? null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", inboundMessageId)

      return {
        skipped: true,
        reason: "unlinked_phone",
        inboundMessageId,
        replyMessageId: reply.messages?.[0]?.id ?? null,
      }
    }

    if (inbound.messageType !== "image" || !inbound.mediaId) {
      const reply = await sendWhatsAppText({
        to: inbound.fromWaId,
        body: "Send me a clear photo of a receipt and I will turn it into an itemized bill.",
      })

      await supabase
        .from("whatsapp_inbound_messages")
        .update({
          reply_message_id: reply.messages?.[0]?.id ?? null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", inboundMessageId)

      return {
        skipped: true,
        reason: "unsupported_message_type",
        inboundMessageId,
        replyMessageId: reply.messages?.[0]?.id ?? null,
      }
    }

    const media = await downloadWhatsAppMedia(inbound.mediaId)
    const extracted = await extractReceiptFromImage({
      image: media.buffer,
      mimeType: media.mimeType,
      defaultCurrency: "MYR",
    })
    const persisted = await persistReceipt({
      userId: phoneMapping.user_id as string,
      receipt: extracted.receipt,
      source: "whatsapp_receipt",
    })
    const replyBody = formatReceiptMessage({
      receipt: extracted.receipt,
    })
    const reply = await sendWhatsAppText({
      to: inbound.fromWaId,
      body: replyBody,
    })

    await supabase
      .from("whatsapp_inbound_messages")
      .update({
        reply_message_id: reply.messages?.[0]?.id ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", inboundMessageId)

    return {
      skipped: false,
      inboundMessageId,
      replyMessageId: reply.messages?.[0]?.id ?? null,
      persisted,
      status: extracted.needsReview ? "needs_review" : "completed",
    }
  } catch (error) {
    await supabase
      .from("whatsapp_inbound_messages")
      .update({
        error_code: "processing_failed",
        error_message:
          error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
        processed_at: new Date().toISOString(),
      })
      .eq("id", inboundMessageId)

    throw error
  }
}
