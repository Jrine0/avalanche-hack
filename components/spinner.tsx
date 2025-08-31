/* simple spinner for loading states */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  const s = `${size}px`
  return (
    <span
      aria-label="Loading"
      className={className}
      style={{
        width: s,
        height: s,
        display: "inline-block",
        borderRadius: "9999px",
        border: "2px solid rgba(229, 231, 235, 0.25)",
        borderTopColor: "var(--ring)",
        animation: "spin 0.8s linear infinite",
      }}
    />
  )
}
