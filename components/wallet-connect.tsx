"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function randomWallet() {
  // Simulated wallet address
  return (
    "0x" +
    Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  )
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

  useEffect(() => {
    const cached = typeof window !== "undefined" ? window.localStorage.getItem("demo_wallet") : null
    if (cached && /^0x[a-fA-F0-9]{40}$/.test(cached)) {
      setAddress(cached)
      setConnected(true)
      onChange?.({ connected: true, address: cached })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const short = useMemo(() => {
    if (!address) return ""
    return address.slice(0, 6) + "..." + address.slice(-4)
  }, [address])

  function connect() {
    const addr = randomWallet()
    setConnected(true)
    setAddress(addr)
    try {
      window.localStorage.setItem("demo_wallet", addr)
    } catch {}
    onChange?.({ connected: true, address: addr })
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
    setConnected(true)
    setAddress(v)
    try {
      window.localStorage.setItem("demo_wallet", v)
    } catch {}
    onChange?.({ connected: true, address: v })
    setShowImport(false)
    setImportAddr("")
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {connected ? (
          <>
            <span className="text-sm text-zinc-300">
              Connected: <span className="font-mono">{short}</span>
            </span>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 bg-transparent"
              onClick={disconnect}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <Button className="bg-cyan-500 text-black hover:bg-cyan-400" onClick={connect}>
              Connect Wallet
            </Button>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 bg-transparent"
              onClick={() => setShowImport((s) => !s)}
            >
              Import Wallet
            </Button>
          </>
        )}
      </div>

      {!connected && showImport && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="0x... paste public address"
            value={importAddr}
            onChange={(e) => setImportAddr(e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-white"
          />
          <Button className="bg-cyan-500 text-black hover:bg-cyan-400" onClick={confirmImport}>
            Confirm
          </Button>
        </div>
      )}
    </div>
  )
}
