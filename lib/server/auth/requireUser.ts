import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export async function requireBearerUser(request: Request) {
  const authorization = request.headers.get("authorization")
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!token) {
    return { user: null, error: "Missing bearer token." }
  }

  if (!supabaseUrl || !supabaseKey) {
    return { user: null, error: "Supabase is not configured." }
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return { user: null, error: error?.message ?? "Invalid bearer token." }
  }

  return { user: data.user, error: null }
}
