import { LoginDebugPanel } from "@/app/login/login-debug-panel"
import { LoginExistingSession } from "@/app/login/login-existing-session"

type LoginFormProps = {
  errorMessage: string | null
  initialUsername: string
  debug?: boolean
}

export function LoginForm({
  errorMessage,
  initialUsername,
  debug = false,
}: LoginFormProps) {
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

      <div className="neo-card relative z-10 w-full max-w-md p-8 md:p-10">
        <div className="mb-2 h-1 w-16 rounded-full bg-gradient-to-r from-orange-500 to-red-600" />

        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          PT. DASA PUTRA KREATIF
        </h1>

        <p className="mt-2 font-mono text-xs uppercase tracking-[0.25em] text-zinc-500">
          ERP Konveksi · Masuk sistem
        </p>

        <LoginExistingSession />

        <noscript>
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
            JavaScript tidak wajib untuk login. Isi form lalu tekan Login.
          </p>
        </noscript>

        <form
          method="POST"
          action="/api/login"
          encType="application/x-www-form-urlencoded"
          className="mt-8 space-y-5"
          autoComplete="on"
        >
          {debug ? <input type="hidden" name="debug" value="1" /> : null}

          <div>
            <label
              htmlFor="login-username"
              className="mb-2 block text-sm font-medium text-zinc-400"
            >
              Username (mis. cs1)
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="next"
              defaultValue={initialUsername}
              placeholder="mis. cs1"
              className="neo-input"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm font-medium text-zinc-400"
            >
              Password (demo: 12345)
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              enterKeyHint="go"
              placeholder="•••••"
              className="neo-input"
            />
          </div>

          {errorMessage ? (
            <p
              role="alert"
              className="sticky top-3 z-20 rounded-lg border border-red-500/50 bg-red-950/90 px-3 py-3 text-sm leading-snug text-red-100 shadow-lg backdrop-blur-sm"
            >
              {errorMessage}
            </p>
          ) : null}

          <button type="submit" className="neo-btn-primary w-full py-3.5">
            Login
          </button>
        </form>

        {debug ? <LoginDebugPanel /> : null}
      </div>
    </div>
  )
}
