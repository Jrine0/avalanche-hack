"use client"

import { cn } from "@/lib/utils"

/* drifting purple/blue background blobs, aria-hidden and pointer-events-none */
export function BackgroundBlobs({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}>
      <div
        className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(139,92,246,0.25), transparent)" }}
      />
      <div
        className="absolute top-1/3 -right-24 h-96 w-96 rounded-full blur-3xl animate-blob"
        style={{ background: "radial-gradient(closest-side, rgba(59,130,246,0.25), transparent)" }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full blur-3xl animate-blob-delayed"
        style={{ background: "radial-gradient(closest-side, rgba(139,92,246,0.20), transparent)" }}
      />
    </div>
  )
}
