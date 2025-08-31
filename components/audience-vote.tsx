"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { submitVote, computeResults, type Task } from "@/lib/tasks-store"
import WalletConnect, { type WalletState } from "./wallet-connect"

export default function AudienceVote({ task, nextTaskId }: { task: Task; nextTaskId?: string }) {
  const [wallet, setWallet] = useState<WalletState>({ connected: false })
  const [selected, setSelected] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [liveTask, setLiveTask] = useState<Task>(task)
  const [feedback, setFeedback] = useState<string>("")
  const [submitted, setSubmitted] = useState(false)

  const images = useMemo(() => (Array.isArray(liveTask?.images) ? liveTask.images : []), [liveTask])

  const results = useMemo(() => {
    try {
      return computeResults(liveTask)
    } catch {
      return { counts: Array.from({ length: images.length }, () => 0), total: 0, winnerIndex: -1, perVoter: 0 }
    }
  }, [liveTask, images.length])

  const perItemPrice = useMemo(() => {
    const pool = Number(liveTask?.rewardPoolAvax ?? 0)
    const count = images.length
    if (!pool || !count) return 0
    return pool / count
  }, [liveTask?.rewardPoolAvax, images.length])

  useEffect(() => {
    setLiveTask(task)
    setSubmitted(false)
    setSelected(null)
    setMessage(null)
    setFeedback("")
  }, [task])

  function handleSelect(index: number) {
    setSelected(index)
    setMessage(null)
  }

  function handleSubmit() {
    if (selected == null) {
      setMessage("Please select an option first.")
      return
    }
    if (!wallet.connected || !wallet.address) {
      setMessage("Please connect your wallet first.")
      return
    }
    setMessage(null)
    startTransition(async () => {
      try {
        const newTask = await (submitVote as any)({
          taskId: liveTask.id,
          walletAddress: wallet.address!,
          choiceIndex: selected,
          feedback,
        })
        setLiveTask(newTask)
        setFeedback("")
        setMessage("Vote submitted!")
        setSubmitted(true)
      } catch (err: any) {
        setMessage(err?.message || "Could not submit vote.")
      }
    })
  }

  return (
    <Card className="bg-zinc-900/70 border-zinc-800">
      <CardHeader className="flex flex-col gap-2">
        <CardTitle className="text-white text-balance">{liveTask?.title || "Audience Vote"}</CardTitle>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <p className="text-sm text-zinc-300">
            Reward Pool: <span className="text-white font-medium">{Number(liveTask?.rewardPoolAvax ?? 0)} AVAX</span>
          </p>
          <WalletConnect onChange={setWallet} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {images.length === 0 && (
            <div className="col-span-2 md:col-span-4 text-sm text-zinc-300">This task has no options yet.</div>
          )}
          {images.map((img, i) => {
            const isImage =
              (img as any)?.mime?.startsWith?.("image/") ||
              (typeof (img as any)?.src === "string" && (img as any).src.startsWith("data:image")) ||
              (typeof (img as any)?.src === "string" && /\.(png|jpe?g|gif|webp|svg)$/i.test((img as any).src))
            const isSelected = selected === i
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                className={`group relative rounded-md overflow-hidden border transition focus:outline-none focus:ring-2 focus:ring-blue-500/60 ${
                  isSelected ? "border-cyan-500" : "border-zinc-800 hover:border-zinc-600"
                }`}
                aria-pressed={isSelected}
                aria-label={`Select option ${i + 1}`}
              >
                {isImage ? (
                  <img
                    src={(img as any)?.src || "/placeholder.svg?height=160&width=240&query=option%20preview"}
                    alt={(img as any)?.alt || `Option ${i + 1}`}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 flex items-center justify-center bg-zinc-900 text-zinc-300 text-sm px-2 text-center">
                    {(img as any)?.name || (img as any)?.alt || `File ${i + 1}`}
                  </div>
                )}

                <div className="absolute top-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] text-white">
                  {perItemPrice ? `${perItemPrice.toFixed(5)} AVAX` : "—"}
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-white">
                  Option {i + 1} • {results?.counts?.[i] ?? 0} votes
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="feedback" className="text-sm text-zinc-300">
            Feedback
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional feedback about your choice..."
            className="min-h-[80px] w-full rounded-md bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-300">
            Total votes: <span className="text-white">{results?.total || 0}</span>{" "}
            {(results?.total || 0) > 0 && (
              <span className="ml-2 text-zinc-400">
                Current leader: <span className="text-white">#{(results?.winnerIndex ?? -1) + 1 || "-"}</span>
              </span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSubmit}
              disabled={pending || selected == null || !wallet.connected}
              className="bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {pending ? "Submitting..." : "Submit Vote"}
            </Button>
            <Button disabled className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
              Distribute Rewards (Auto via Contract)
            </Button>
          </div>
        </div>

        {(results?.total || 0) > 0 && (
          <p className="text-xs text-zinc-400">
            Estimated per-voter payout:{" "}
            <span className="text-emerald-400">{Number(results?.perVoter ?? 0).toFixed(5)} AVAX</span>
          </p>
        )}

        {message && <div className="text-sm text-zinc-300">{message}</div>}

        {submitted && (
          <div className="pt-2">
            <Link href={nextTaskId ? `/audience?task=${nextTaskId}` : "/audience"} className="inline-flex">
              <Button className="bg-cyan-500 text-black hover:bg-cyan-400">Next Task</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
