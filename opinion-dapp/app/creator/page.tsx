import CreatorForm from "@/components/creator-form"
import { GlassCard } from "@/components/glass-card"
import Link from "next/link"

export default function CreatorPage() {
  return (
    <main className="min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto max-w-3xl animate-page-in">
        <GlassCard>
          <header className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-balance">Creator Dashboard</h1>
              <p className="text-foreground/80 mt-2">
                Upload any files (any amount), set a reward pool, and publish your task.
              </p>
            </div>
            <Link
              href="/creator/dashboard"
              className="hover-lift focus-ring inline-flex rounded-md px-4 py-2 glass text-sm"
            >
              View Analysis
            </Link>
          </header>
          {/* Keep existing form component, but place it inside glass card */}
          <CreatorForm />
        </GlassCard>

        <p className="mt-6 text-xs text-foreground/70">
          Note: This MVP simulates wallet funding and payouts. Smart contract integration comes next.
        </p>
      </div>
    </main>
  )
}
