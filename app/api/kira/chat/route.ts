import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 120

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"

export async function POST(request: Request) {
  const secret = request.headers.get("X-Kira-Secret")
  if (INTERNAL_API_SECRET && secret !== INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(115_000),
    })
  } catch (err) {
    const isTimeout =
      err instanceof Error && err.name === "TimeoutError"
    return NextResponse.json(
      { error: isTimeout ? "OpenAI request timed out." : "Failed to reach OpenAI." },
      { status: 502 },
    )
  }

  const data: unknown = await upstreamResponse.json()

  return NextResponse.json(data, { status: upstreamResponse.status })
}
