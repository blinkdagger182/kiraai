export type WhatsAppInboundMessage = {
  providerMessageId: string
  fromWaId: string
  messageType: string
  mediaId: string | null
  rawPayload: unknown
}

type MetaMessage = {
  id?: string
  from?: string
  type?: string
  image?: {
    id?: string
  }
}

type MetaChange = {
  value?: {
    messages?: MetaMessage[]
  }
}

type MetaEntry = {
  changes?: MetaChange[]
}

type MetaWebhookPayload = {
  entry?: MetaEntry[]
}

export function parseWhatsAppWebhook(
  payload: MetaWebhookPayload,
): WhatsAppInboundMessage[] {
  const messages: WhatsAppInboundMessage[] = []

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (!message.id || !message.from || !message.type) {
          continue
        }

        messages.push({
          providerMessageId: message.id,
          fromWaId: message.from,
          messageType: message.type,
          mediaId: message.image?.id ?? null,
          rawPayload: message,
        })
      }
    }
  }

  return messages
}
