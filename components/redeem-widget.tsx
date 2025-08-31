"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import type { Task } from "@/lib/tasks-store"

type WalletState = {
  connected: boolean
  address?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function getRedeemedSet(addr?: string) {
  if (!addr) return new Set<string>()
  try {
    const raw = window.localStorage.getItem(`redeemed:${addr.toLowerCase()}`)
    if (!raw) return new Set<string>()
    const arr = JSON.parse(raw) as string[]
    return new Set<string>(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set<string>()
  }
}
function setRedeemedSet(ids: Set<string>, addr?: string) {
  if (!addr) return
  try {
    window.localStorage.setItem(`redeemed:${addr.toLowerCase()}`, JSON.stringify(Array.from(ids)))
  } catch {}
}

export default function RedeemWidget() {
  const [wallet, setWallet] = useState<WalletState>({ connected: false })
  const [pending, setPending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    function load() {
      try {
        const cached = window.localStorage.getItem("demo_wallet")
        if (cached && /^0x[a-fA-F0-9]{40}$/.test(cached)) {
          setWallet({ connected: true, address: cached })
        } else {
          setWallet({ connected: false })
        }
      } catch {
        setWallet({ connected: false })
      }
    }
    load()
    const id = setInterval(load, 800)
    const onVisibility = () => document.visibilityState === "visible" && load()
    window.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearInterval(id)
      window.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  const { data } = useSWR<{ tasks: Task[] }>("/api/tasks", fetcher, { revalidateOnFocus: false })
  const tasks = Array.isArray(data?.tasks) ? (data!.tasks as Task[]) : []

  const { redeemable, eligibleTaskIds } = useMemo(() => {
    const addr = wallet.address?.toLowerCase()
    if (!addr || !Array.isArray(tasks)) return { redeemable: 0, eligibleTaskIds: [] as string[] }
    const redeemed = getRedeemedSet(addr)
    let sum = 0
    const ids: string[] = []
    for (const t of tasks) {
      const total = t.votes?.length || 0
      const didVote = (t.votes || []).some((v) => v.walletAddress?.toLowerCase() === addr)
      if (!didVote || total <= 0) continue
      if (redeemed.has(t.id)) continue
      const perVoter = t.rewardPoolAvax / total
      sum += perVoter
      ids.push(t.id)
    }
    return { redeemable: sum, eligibleTaskIds: ids }
  }, [tasks, wallet.address])

  async function handleRedeem() {
    if (!wallet.connected || !wallet.address) {
      setMsg("Connect wallet to redeem.")
      return
    }
    if (!eligibleTaskIds.length || redeemable <= 0) {
      setMsg("Nothing to redeem yet.")
      return
    }
    setPending(true)
    setMsg(null)
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: wallet.address,
          amount: redeemable,
          currency: "AVAX",
          tasks: eligibleTaskIds,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Redeem failed")
      const cur = getRedeemedSet(wallet.address)
      eligibleTaskIds.forEach((id) => cur.add(id))
      setRedeemedSet(cur, wallet.address)
      setMsg(`Redeemed ${redeemable.toFixed(5)} AVAX ${json?.txn_hash ? `• tx: ${json.txn_hash.slice(0, 10)}…` : ""}`)
    } catch (e: any) {
      setMsg(e?.message || "Redeem failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="glass rounded-md border border-zinc-800 bg-zinc-900/60 p-3 w-full max-w-[280px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-xs text-zinc-300">Redeemable</div>
          <div className="text-white font-medium">{redeemable.toFixed(5)} AVAX</div>
        </div>
      </div>
      <div className="mt-2">
        <Button
          onClick={handleRedeem}
          disabled={!wallet.connected || pending || redeemable <= 0}
          className="h-8 px-3 bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 w-full"
        >
          {pending ? "Redeeming..." : wallet.connected ? "Redeem" : "Connect wallet in card"}
        </Button>
        {msg && <div className="mt-1 text-[11px] text-zinc-400">{msg}</div>}
      </div>
    </div>
  )
}
