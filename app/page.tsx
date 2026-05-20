import Link from "next/link"

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#030304] px-6 py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(234,88,12,0.2), transparent 55%)",
        }}
      />

      <main className="relative z-10 max-w-lg text-center">
        <div className="mx-auto mb-6 h-1.5 w-20 rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-red-600" />

        <p className="font-mono text-xs uppercase tracking-[0.35em] text-zinc-500">
          Dasa Putra Kreatif
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
          ERP Konveksi
        </h1>

        <p className="mt-4 text-lg leading-relaxed text-zinc-400">
          Sistem manajemen produksi — akses aman per peran, alur CS hingga
          produksi.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="neo-btn-primary inline-block min-w-[180px] px-8 py-3.5 text-center"
          >
            Masuk
          </Link>

          <span className="hidden text-zinc-600 sm:inline">|</span>

          <p className="text-sm text-zinc-500">
            Gunakan akun yang sudah terdaftar
          </p>
        </div>
      </main>
    </div>
  )
}
