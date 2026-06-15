import type { QueueIdentifierFields } from "@/lib/cs-queue-identifiers"

type QueueIdentifierBadgesProps = QueueIdentifierFields & {
  /** `compact` untuk baris tabel; `card` untuk header kartu status. */
  variant?: "compact" | "card"
  className?: string
}

type IdentifierLineProps = {
  label: string
  value: string
  highlight?: boolean
  variant: "compact" | "card"
}

function IdentifierLine({
  label,
  value,
  highlight = false,
  variant,
}: IdentifierLineProps) {
  if (variant === "card") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700/80 bg-zinc-950/60 px-2 py-1 text-xs">
        <span className="font-semibold text-zinc-500">{label}</span>
        <span
          className={
            highlight
              ? "font-medium text-orange-400"
              : "font-medium text-zinc-300"
          }
        >
          {value}
        </span>
      </span>
    )
  }

  return (
    <p className="text-xs leading-relaxed">
      <span className="text-zinc-500">{label}</span>{" "}
      <span
        className={
          highlight ? "font-medium text-orange-400" : "font-medium text-zinc-300"
        }
      >
        {value}
      </span>
    </p>
  )
}

export function QueueIdentifierBadges({
  orderNumber,
  sppNumber,
  artikelId,
  namaArtikel,
  designId,
  variant = "card",
  className = "",
}: QueueIdentifierBadgesProps) {
  const artikelValue = namaArtikel?.trim()
    ? `${artikelId} · ${namaArtikel.trim()}`
    : artikelId

  const containerClass =
    variant === "card"
      ? `flex flex-wrap justify-end gap-1.5 ${className}`.trim()
      : `space-y-0.5 ${className}`.trim()

  return (
    <div className={containerClass}>
      {orderNumber?.trim() ? (
        <IdentifierLine
          label="Order"
          value={orderNumber.trim()}
          highlight
          variant={variant}
        />
      ) : null}
      {sppNumber?.trim() ? (
        <IdentifierLine
          label="SPP"
          value={sppNumber.trim()}
          variant={variant}
        />
      ) : null}
      <IdentifierLine
        label="Artikel"
        value={artikelValue}
        variant={variant}
      />
      <IdentifierLine label="Desain" value={designId} variant={variant} />
    </div>
  )
}
