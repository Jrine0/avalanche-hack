"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { createTask } from "@/lib/tasks-store"

type FilePreview = { src: string; file: File; alt?: string; mime?: string; name?: string }

export default function CreatorForm() {
  const [title, setTitle] = useState("")
  const [reward, setReward] = useState<number>(5)
  const [previews, setPreviews] = useState<FilePreview[]>([])
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const [aiBrief, setAiBrief] = useState("")
  const [aiPending, setAiPending] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<{ title: string; rationale: string }[]>([])

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files) // no limit
    const reads = await Promise.all(
      arr.map(
        (f) =>
          new Promise<FilePreview>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () =>
              resolve({
                src: reader.result as string,
                file: f,
                alt: f.name,
                mime: f.type,
                name: f.name,
              })
            reader.onerror = reject
            reader.readAsDataURL(f)
          }),
      ),
    )
    setPreviews(reads)
  }

  async function getCreatorSuggestions() {
    setAiError(null)
    setAiSuggestions([])
    setAiPending(true)
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileNames: previews.map((p) => p.name || "file"),
          brief: aiBrief || title || "Give 3 concise improvements for this set of options.",
        }),
      })
      if (!res.ok) throw new Error("Failed to get suggestions")
      const data = await res.json()
      if (Array.isArray(data?.suggestions)) {
        setAiSuggestions(data.suggestions)
      } else {
        throw new Error("Invalid suggestions format")
      }
    } catch (e: any) {
      setAiError(e?.message || "Could not fetch suggestions")
    } finally {
      setAiPending(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (previews.length < 1) {
      setMessage("Please upload at least one file.")
      return
    }
    if (!title.trim()) {
      setMessage("Please enter a title.")
      return
    }
    startTransition(async () => {
      try {
        const task = await createTask({
          title: title.trim(),
          rewardPoolAvax: reward,
          images: previews.map((p) => ({ src: p.src, alt: p.alt, mime: p.mime, name: p.name })),
        })
        setCreatedId(task.id)
        setMessage("Task created successfully! Share with your audience.")
        setTitle("")
        setPreviews([])
      } catch (err: any) {
        setMessage(err.message || "Failed to create task.")
      }
    })
  }

  return (
    <Card className="bg-zinc-900/70 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white text-balance">Create a Feedback Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className="text-zinc-300">
              Task Title
            </Label>
            <Input
              id="title"
              placeholder="Best Travel Vlog Thumbnail"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reward" className="text-zinc-300">
              Reward Pool (AVAX)
            </Label>
            <Input
              id="reward"
              type="number"
              min={0}
              step="0.01"
              value={reward}
              onChange={(e) => setReward(Number.parseFloat(e.target.value || "0"))}
              className="bg-zinc-950 border-zinc-800 text-white"
            />
            <p className="text-xs text-zinc-400">
              Funds are simulated in this demo. Smart contract funding comes next.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="images" className="text-zinc-300">
              Upload files (any type, any amount)
            </Label>
            <Input
              id="images"
              type="file"
              multiple
              accept="*/*" // allow any file type
              onChange={(e) => handleFiles(e.target.files)}
              className="bg-zinc-950 border-zinc-800 text-white"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {previews.map((p, i) => {
                const isImage =
                  (p.mime && p.mime.startsWith("image/")) ||
                  (p.src && typeof p.src === "string" && p.src.startsWith("data:image"))
                return (
                  <div key={i} className="rounded-md overflow-hidden border border-zinc-800">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.src || "/placeholder.svg"}
                        alt={p.alt || `Option ${i + 1}`}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-zinc-900 text-zinc-300 text-xs">
                        {p.name || `File ${i + 1}`}
                      </div>
                    )}
                    <div className="px-2 py-1 text-xs text-zinc-300 truncate">{p.name || `Option ${i + 1}`}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {previews.length > 0 && (
            <div className="glass rounded-md p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Creator Suggestions (AI)</h3>
                  <p className="text-xs text-foreground/70">
                    Get quick ideas to improve your options. Visible only to you.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={getCreatorSuggestions}
                  disabled={aiPending}
                  className="bg-blue-600 text-white hover:bg-blue-500"
                >
                  {aiPending ? "Getting ideas..." : "Get AI Suggestions"}
                </Button>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <Label htmlFor="brief" className="text-zinc-300 text-xs">
                  Optional brief for AI
                </Label>
                <Input
                  id="brief"
                  placeholder="e.g., Optimize for CTR, keep brand colors consistent"
                  value={aiBrief}
                  onChange={(e) => setAiBrief(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-500"
                />
              </div>

              {aiError && <p className="mt-3 text-xs text-red-400">{aiError}</p>}

              {aiSuggestions.length > 0 && (
                <ul className="mt-4 list-disc pl-5 space-y-2">
                  {aiSuggestions.map((s, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{s.title}:</span>{" "}
                      <span className="text-foreground/80">{s.rationale}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button type="submit" disabled={pending} className="bg-cyan-500 text-black hover:bg-cyan-400">
              {pending ? "Creating..." : "Create Task"}
            </Button>
            {createdId && (
              <a href={`/audience?task=${createdId}`} className="text-emerald-400 text-sm hover:underline">
                View as Audience
              </a>
            )}
          </div>

          {message && <div className="text-sm text-zinc-300">{message}</div>}
        </form>
      </CardContent>
    </Card>
  )
}
