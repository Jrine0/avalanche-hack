"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { demoTasks } from "@/lib/tasks"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type VoteRecord = {
  taskId: string
  optionId: string
  at: number
}

export default function CreatorDashboardPage() {
  const [votes, setVotes] = useState<VoteRecord[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("opinion-dapp-votes")
      const parsed = raw ? (JSON.parse(raw) as VoteRecord[]) : []
      setVotes(parsed)
    } catch {
      setVotes([])
    }
  }, [])

  const taskSummaries = useMemo(() => {
    return demoTasks.map((t) => {
      const counts: Record<string, number> = {}
      t.options.forEach((o) => (counts[o.id] = 0))
      votes
        .filter((v) => v.taskId === t.id)
        .forEach((v) => {
          counts[v.optionId] = (counts[v.optionId] || 0) + 1
        })
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      const data = t.options.map((o) => ({
        option: o.label,
        votes: counts[o.id] || 0,
      }))
      return { task: t, total, data }
    })
  }, [votes])

  return (
    <main className="min-h-[100svh] px-6 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold text-balance">Votes Analysis</h1>
            <p className="mt-2 text-foreground/80">Overview of votes per option across your demo tasks.</p>
          </div>
          <Link href="/creator" className="hover-lift focus-ring inline-flex rounded-md px-5 py-2.5 glass">
            Back to Creator
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {taskSummaries.map(({ task, total, data }) => (
            <section key={task.id} className="glass rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-medium">{task.title}</h2>
                <span className="text-foreground/70 text-sm">Total votes: {total}</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} barSize={32}>
                    <CartesianGrid stroke="rgba(229,231,235,0.12)" vertical={false} />
                    <XAxis dataKey="option" tick={{ fill: "var(--foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "var(--foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255,255,255,0.04)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                      }}
                    />
                    <Bar dataKey="votes" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
