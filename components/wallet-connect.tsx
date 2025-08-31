"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function randomWallet() {
  // Simulated wallet address
  return (
    "0x" +
    Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  )
}

// derive a fun, deterministic color and initials from address
function useIdenticonColor(address?: string) {
  return useMemo(() => {
    if (!address) return { hue: 210, bg: "hsl(210 60% 50%)" }
    const n = Number.parseInt(address.slice(2, 8), 16)
    const hue = n % 360
    return { hue, bg: `hsl(${hue} 65% 50%)` }
  }, [address])
}

function useIdenticonStyle(address?: string) {
  return useMemo(() => {
    // derive lightness from the address to keep variation but stay in cyan hue
    const seed = address ? Number.parseInt(address.slice(2, 8), 16) : 128
    const light = 35 + (seed % 30) // 35% - 65%
    return { background: `hsl(190 65% ${light}%)` } // cyan family
  }, [address])
}

export type WalletState = {
  connected: boolean
  address?: string
}

export default function WalletConnect({
  onChange,
}: {
  onChange?: (state: WalletState) => void
}) {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string | undefined>(undefined)
  const [showImport, setShowImport] = useState(false)
  const [importAddr, setImportAddr] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [network, setNetwork] = useState<string>("Avalanche C-Chain")

  useEffect(() => {
    const cached = typeof window !== "undefined" ? window.localStorage.getItem("demo_wallet") : null
    const net = typeof window !== "undefined" ? window.localStorage.getItem("demo_network") : null
    if (net) setNetwork(net)
    if (cached && /^0x[a-fA-F0-9]{40}$/.test(cached)) {
      setAddress(cached)
      setConnected(true)
      onChange?.({ connected: true, address: cached })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("demo_network", network)
      }
    } catch {}
  }, [network])

  const short = useMemo(() => {
    if (!address) return ""
    return address.slice(0, 6) + "..." + address.slice(-4)
  }, [address])

  const identiconStyle = useIdenticonStyle(address)

  function reallyConnect() {
    const addr = randomWallet()
    setConnected(true)
    setAddress(addr)
    try {
      window.localStorage.setItem("demo_wallet", addr)
    } catch {}
    onChange?.({ connected: true, address: addr })
  }

  function connect() {
    // simulate a brief connecting state for more feedback
    setIsConnecting(true)
    setTimeout(() => {
      reallyConnect()
      setIsConnecting(false)
    }, 800)
  }

  function disconnect() {
    setConnected(false)
    setAddress(undefined)
    try {
      window.localStorage.removeItem("demo_wallet")
    } catch {}
    onChange?.({ connected: false })
  }

  function confirmImport() {
    const v = importAddr.trim()
    if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
      alert("Enter a valid EVM address (0x + 40 hex chars)")
      return
    }
    setIsConnecting(true)
    setTimeout(() => {
      setConnected(true)
      setAddress(v)
      try {
        window.localStorage.setItem("demo_wallet", v)
      } catch {}
      onChange?.({ connected: true, address: v })
      setShowImport(false)
      setImportAddr("")
      setIsConnecting(false)
    }, 600)
  }

  async function copyAddress() {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  function pickNetwork(n: string) {
    setNetwork(n)
  }

  return (
    <div className="relative flex flex-col gap-2">
      {/* subtle animated glow when connected */}
      {connected && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-xl bg-[conic-gradient(var(--tw-gradient-stops))] from-cyan-500/20 via-blue-500/10 to-purple-500/20 blur-xl opacity-40"
        />
      )}

      <div className="relative z-10 flex items-center gap-3">
        {connected ? (
          <>
            {/* Connected pill with identicon and dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="group flex items-center gap-3 rounded-full border border-zinc-700/80 bg-zinc-900/70 px-3 py-2 transition hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  aria-label="Wallet menu"
                >
                  <div
                    className="relative h-8 w-8 shrink-0 rounded-full ring-2 ring-white/10"
                    style={identiconStyle}
                    aria-hidden
                  >
                    <span className="absolute inset-0 m-auto block h-[2px] w-1/2 rotate-45 bg-white/15" />
                    <span className="absolute inset-0 m-auto block h-[2px] w-1/2 -rotate-45 bg-white/15" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-mono text-xs text-white">{short}</span>
                    <span className="flex items-center gap-1 text-[11px] text-zinc-300">
                      <span className="relative inline-flex h-2 w-2">
                        <span className="absolute inline-flex h-2 w-2 rounded-full bg-cyan-400 opacity-75" />
                        <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-cyan-400" />
                      </span>
                      {network}
                    </span>
                  </div>
                  <svg
                    className="ml-1 h-4 w-4 text-zinc-400 transition group-data-[state=open]:rotate-180 group-hover:text-zinc-200"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.207l3.71-3.976a.75.75 0 111.08 1.04l-4.24 4.54a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs">Wallet</DropdownMenuLabel>
                <DropdownMenuItem onClick={copyAddress} className="flex items-center justify-between">
                  Copy address
                  <span className="text-[11px] text-cyan-400">{copied ? "Copied" : ""}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const addr = (crypto?.getRandomValues ? randomWallet() : address) as string
                    if (!addr) return
                    setAddress(addr)
                    try {
                      window.localStorage.setItem("demo_wallet", addr)
                    } catch {}
                    onChange?.({ connected: true, address: addr })
                  }}
                >
                  New random address
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Network</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => pickNetwork("Avalanche C-Chain")}>Avalanche C-Chain</DropdownMenuItem>
                <DropdownMenuItem onClick={() => pickNetwork("Fuji Testnet")}>Fuji Testnet</DropdownMenuItem>
                <DropdownMenuItem onClick={() => pickNetwork("Ethereum Mainnet")}>Ethereum Mainnet</DropdownMenuItem>
                <DropdownMenuItem onClick={() => pickNetwork("Sepolia Testnet")}>Sepolia Testnet</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-400 focus:text-red-500" onClick={disconnect}>
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button
              className="relative overflow-hidden bg-cyan-500 text-black hover:bg-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500/50 transition active:scale-[0.98]"
              onClick={connect}
              disabled={isConnecting}
            >
              <span
                className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.35),transparent_55%)] opacity-70"
                aria-hidden
              />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 bg-transparent"
              onClick={() => setShowImport((s) => !s)}
              aria-expanded={showImport}
              aria-controls="import-wallet"
            >
              Import Wallet
            </Button>
          </>
        )}
      </div>

      {!connected && (
        <div
          id="import-wallet"
          className={`grid grid-rows-[0fr] transition-all duration-300 ease-out ${showImport ? "grid-rows-[1fr]" : ""}`}
        >
          <div className="overflow-hidden">
            <div className="mt-2 flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/80 p-2">
              <Input
                placeholder="0x... paste public address"
                value={importAddr}
                onChange={(e) => setImportAddr(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white"
              />
              <Button
                className="bg-cyan-500 text-black hover:bg-cyan-400"
                onClick={confirmImport}
                disabled={isConnecting}
              >
                {isConnecting ? "Importing..." : "Confirm"}
              </Button>
            </div>
            <p className="mt-1 pl-1 text-[11px] text-zinc-400">
              Demo only — no private keys. Use a public address to simulate connection.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
