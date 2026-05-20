"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error)
      return
    }

    alert("Login berhasil")

    localStorage.setItem("user", JSON.stringify(data))

    if (data.role === "owner") {
      router.push("/owner")
    } else if (data.role === "cs") {
      router.push("/leads")
    } else if (data.role === "desainer") {
      router.push("/designs/list")
    } else {
      router.push("/report")
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030304] px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(234,88,12,0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(220,38,38,0.08) 0%, transparent 45%),
            linear-gradient(rgba(24,24,27,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(24,24,27,0.3) 1px, transparent 1px)`,
          backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
        }}
      />

      <div className="neo-card relative z-10 w-full max-w-md p-8 md:p-10">
        <div className="mb-2 h-1 w-16 rounded-full bg-gradient-to-r from-orange-500 to-red-600" />

        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          Masuk sistem
        </h1>

        <p className="mt-2 font-mono text-xs uppercase tracking-[0.25em] text-zinc-500">
          Dasa Putra Kreatif
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              placeholder="username"
              className="neo-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="•••••"
              className="neo-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="neo-btn-primary w-full py-3.5">
            Login
          </button>
        </form>
      </div>
    </div>
  )
}
