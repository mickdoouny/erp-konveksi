type BarItem = {
  label: string
  value: number
  secondaryValue?: number
}

export function SimpleBarChart({
  items,
  formatValue = (n) => String(n),
  primaryClassName = "bg-gradient-to-r from-orange-500 to-orange-600",
  secondaryClassName = "bg-zinc-600",
  showSecondary = false,
}: {
  items: BarItem[]
  formatValue?: (n: number) => string
  primaryClassName?: string
  secondaryClassName?: string
  showSecondary?: boolean
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        Belum ada data penjualan.
      </p>
    )
  }

  const max = Math.max(
    ...items.map((item) =>
      showSecondary && item.secondaryValue != null
        ? Math.max(item.value, item.secondaryValue)
        : item.value
    ),
    1
  )

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const primaryWidth = `${Math.round((item.value / max) * 100)}%`
        const secondaryWidth =
          item.secondaryValue != null
            ? `${Math.round((item.secondaryValue / max) * 100)}%`
            : "0%"

        return (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-zinc-300">
                {item.label}
              </span>
              <span className="shrink-0 font-mono text-zinc-500">
                {formatValue(item.value)}
                {showSecondary && item.secondaryValue != null ? (
                  <span className="text-zinc-600">
                    {" "}
                    / {formatValue(item.secondaryValue)}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800/90">
                <div
                  className={`h-full rounded-full transition-all ${primaryClassName}`}
                  style={{ width: primaryWidth }}
                />
              </div>
              {showSecondary && item.secondaryValue != null ? (
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className={`h-full rounded-full ${secondaryClassName}`}
                    style={{ width: secondaryWidth }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
