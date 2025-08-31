import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

function randomTxHash() {
  const bytes = Array.from(crypto.getRandomValues(new Uint8Array(32)))
  return "0x" + bytes.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const walletAddress = String(body?.walletAddress || "").trim()
    const amount = Number(body?.amount || 0)
    const currency = (body?.currency as string) || "AVAX"

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return Response.json({ error: "Invalid wallet address" }, { status: 400 })
    }
    if (!(amount > 0)) {
      return Response.json({ error: "Amount must be greater than 0" }, { status: 400 })
    }

    const txn_hash = randomTxHash()
    const url = process.env.DATABASE_URL

    if (url) {
      const sql = neon(url)
      // Insert with nullable FKs; user_id/task_id/submission_id left NULL to avoid missing FK rows
      await sql`
        INSERT INTO transactions
          (transaction_type, amount, currency, to_address, txn_hash, status)
        VALUES
          ('withdrawal', ${amount}, ${currency}, ${walletAddress}, ${txn_hash}, 'success')
      `
      return Response.json({ ok: true, txn_hash })
    }

    // Fallback demo response
    return Response.json({ ok: true, demo: true, txn_hash })
  } catch (e: any) {
    return Response.json({ error: e?.message || "Redeem failed" }, { status: 500 })
  }
}
