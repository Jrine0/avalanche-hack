import Link from "next/link"
import { GlassCard } from "@/components/glass-card"

export default function Home() {
  return (
    <main className="min-h-[100svh] flex items-center justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <GlassCard className="text-center py-10">
          <h1 className="text-4xl md:text-6xl font-semibold text-balance">Shape the Future. Get Rewarded.</h1>
          <p className="mt-5 text-base md:text-lg text-foreground/80 leading-relaxed text-pretty max-w-3xl mx-auto">
            Creators upload 4 visuals. The crowd votes. Rewards are split among voters — fast, fair, and trustless.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/creator"
              className="hover-lift focus-ring inline-flex items-center justify-center rounded-md px-6 py-3 text-base font-medium text-black"
              style={{
                background: "linear-gradient(90deg, #8b5cf6, #3b82f6)",
                boxShadow: "0 8px 24px rgba(139, 92, 246, 0.25), 0 4px 12px rgba(59, 130, 246, 0.20)",
              }}
            >
              I’m a Creator
            </Link>
            <Link
              href="/audience"
              className="hover-lift focus-ring inline-flex items-center justify-center rounded-md px-6 py-3 text-base font-medium text-foreground/90 glass"
            >
              Vote & Earn
            </Link>
          </div>
        </GlassCard>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass rounded-lg p-6">
            <h3 className="text-lg font-medium mb-2">Fast</h3>
            <p className="text-foreground/80">Create a task in under a minute. Get results instantly.</p>
          </div>
          <div className="glass rounded-lg p-6">
            <h3 className="text-lg font-medium mb-2">Trustless</h3>
            <p className="text-foreground/80">Funds are locked in a smart contract. Payouts are automatic.</p>
          </div>
          <div className="glass rounded-lg p-6">
            <h3 className="text-lg font-medium mb-2">Fair</h3>
            <p className="text-foreground/80">Rewards are split across all voters for micro-tasks.</p>
          </div>
          <div className="glass rounded-lg p-6">
            <h3 className="text-lg font-medium mb-2">Simple</h3>
            <p className="text-foreground/80">Connect wallet, click your favorite, and you’re done.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
