import { labelPaymentStatus, labelProductionStatus } from "@/lib/status-labels"

export function StatusBadge({ status }: { status: string }) {
  const label =
    labelPaymentStatus(status) !== status.toLowerCase()
      ? labelPaymentStatus(status)
      : labelProductionStatus(status)

  const cls =
    status === "MENUNGGU_DP"
      ? "border-amber-500/40 bg-amber-950/40 text-amber-300"
      : status === "DP_TERIMA" || status === "LUNAS"
        ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
        : "border-zinc-600 bg-zinc-900/80 text-zinc-300"

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}
