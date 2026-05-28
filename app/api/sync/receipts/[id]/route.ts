import { NextResponse } from "next/server"
import { requireBearerUser } from "@/lib/server/auth/requireUser"
import { createAdminClient } from "@/lib/server/supabase/admin"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireBearerUser(request)

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error: queryError } = await supabase
    .from("receipts")
    .select("*, receipt_items(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 404 })
  }

  return NextResponse.json({ receipt: data })
}
