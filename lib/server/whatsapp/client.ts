type WhatsAppMessageResponse = {
  messages?: Array<{ id: string }>
}

function getWhatsAppConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured.")
  }

  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is not configured.")
  }

  return {
    accessToken,
    messagesUrl: `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
  }
}

async function sendWhatsAppPayload(payload: unknown) {
  const { accessToken, messagesUrl } = getWhatsAppConfig()

  const response = await fetch(messagesUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  const body = text ? JSON.parse(text) : {}

  if (!response.ok) {
    const message =
      body?.error?.message ?? `WhatsApp API failed with ${response.status}.`
    throw new Error(message)
  }

  return body as WhatsAppMessageResponse
}

export async function sendWhatsAppText({
  to,
  body,
}: {
  to: string
  body: string
}) {
  return sendWhatsAppPayload({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body,
    },
  })
}

export async function sendWhatsAppHelloWorldTemplate(to: string) {
  return sendWhatsAppPayload({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: "hello_world",
      language: {
        code: "en_US",
      },
    },
  })
}

export async function downloadWhatsAppMedia(mediaId: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is not configured.")
  }

  const mediaResponse = await fetch(
    `https://graph.facebook.com/v25.0/${mediaId}`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  )

  const mediaText = await mediaResponse.text()
  const media = mediaText ? JSON.parse(mediaText) : {}

  if (!mediaResponse.ok) {
    throw new Error(
      media?.error?.message ?? `Failed to load WhatsApp media ${mediaId}.`,
    )
  }

  if (!media.url || !media.mime_type) {
    throw new Error(`WhatsApp media ${mediaId} did not include a URL.`)
  }

  const fileResponse = await fetch(media.url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })

  if (!fileResponse.ok) {
    throw new Error(`Failed to download WhatsApp media ${mediaId}.`)
  }

  return {
    buffer: Buffer.from(await fileResponse.arrayBuffer()),
    mimeType: media.mime_type as string,
    sha256: media.sha256 as string | undefined,
    fileSize: media.file_size as number | undefined,
  }
}
