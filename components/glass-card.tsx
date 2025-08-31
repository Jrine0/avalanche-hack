import type React from "react"
import { cn } from "@/lib/utils"

/* re-usable frosted glass container */
export function GlassCard({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn("glass rounded-xl p-6 md:p-8", className)}>{children}</div>
}
