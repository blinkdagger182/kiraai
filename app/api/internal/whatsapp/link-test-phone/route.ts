import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server/supabase/admin"

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

  const formData = await request.formData()
  const userId = formData.get("userId")
  const waId = formData.get("waId") ?? process.env.WHATSAPP_TEST_TO

  if (typeof userId !== "string" || userId.length === 0) {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 })
  }

  if (typeof waId !== "string" || waId.length === 0) {
    return NextResponse.json({ error: "Missing waId." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("user_phone_numbers")
    .upsert(
      {
        user_id: userId,
        phone_e164: `+${waId.replace(/^\+/, "")}`,
        whatsapp_wa_id: waId.replace(/^\+/, ""),
        is_verified: true,
        is_default_whatsapp: true,
        verified_at: new Date().toISOString(),
      },
      {
        onConflict: "phone_e164",
      },
    )
    .select("id, user_id, phone_e164, whatsapp_wa_id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ linked: true, phone: data })
}
