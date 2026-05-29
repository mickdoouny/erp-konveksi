"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  DEMO_ACCOUNT_GROUPS,
  DEMO_ACCOUNT_SHARED_PASSWORD,
  homePathByRole,
  type AuthUser,
} from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function fillDemoAccount(demoUsername: string) {
    setUsername(demoUsername)
    setPassword(DEMO_ACCOUNT_SHARED_PASSWORD)
    setError(null)
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
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
        setError(data.error ?? "Login gagal")
        return
      }

      const user = data as AuthUser
      localStorage.setItem("user", JSON.stringify(user))
      router.push(homePathByRole(user.role))
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.")
    } finally {
      setLoading(false)
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
          backgroundSize:
            "100% 100%, 100% 100%, 48px 48px, 48px 48px",
        }}
      />

      <div className="neo-card relative z-10 w-full max-w-3xl p-8 md:p-10">
        <div className="mb-2 h-1 w-16 rounded-full bg-gradient-to-r from-orange-500 to-red-600" />

        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          PT. DASA PUTRA KREATIF
        </h1>

        <p className="mt-2 font-mono text-xs uppercase tracking-[0.25em] text-zinc-500">
          ERP Konveksi · Masuk sistem
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
              onChange={(event) => setUsername(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="neo-btn-primary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Login"}
          </button>
        </form>

        <section className="mt-8 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">
                Akun Demo
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Gunakan salah satu akun berikut untuk mencoba tiap peran.
              </p>
            </div>
            <p className="rounded-md border border-zinc-700/80 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-300">
              Password: {DEMO_ACCOUNT_SHARED_PASSWORD}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DEMO_ACCOUNT_GROUPS.map((group) => (
              <div
                key={group.label}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {group.label}
                </p>

                <div className="mt-2 grid gap-2">
                  {group.accounts.map((account) => (
                    <button
                      key={account.username}
                      type="button"
                      onClick={() => fillDemoAccount(account.username)}
                      className="rounded-lg border border-zinc-800/80 bg-zinc-950/90 px-3 py-2 text-left transition hover:border-orange-500/40 hover:bg-zinc-900"
                    >
                      <p className="text-sm font-medium text-zinc-100">
                        {account.nama}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                        <span className="font-mono text-zinc-300">
                          {account.username}
                        </span>
                        <span aria-hidden>•</span>
                        <span>{account.divisi}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
