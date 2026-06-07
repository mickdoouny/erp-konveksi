import {
  expressBadgeClassName,
  expressBadgeLabel,
  labelJenisProduksi,
} from "@/lib/production-queue-sort"

type JenisProduksiBadgeProps = {
  jenisProduksi?: string | null
  expressPriority?: number | null
  className?: string
}

export function JenisProduksiBadge({
  jenisProduksi,
  expressPriority,
  className = "",
}: JenisProduksiBadgeProps) {
  const expressLabel = expressBadgeLabel(jenisProduksi, expressPriority)
  if (expressLabel) {
    return (
      <span
        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${expressBadgeClassName()} ${className}`}
      >
        {expressLabel}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex rounded-full border border-zinc-600 bg-zinc-900/80 px-2.5 py-0.5 text-xs font-semibold text-zinc-400 ${className}`}
    >
      {labelJenisProduksi(jenisProduksi)}
    </span>
  )
}
