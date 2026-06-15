export type PrintingInkForm = {
  konsumsiTintaC: string
  konsumsiTintaM: string
  konsumsiTintaY: string
  konsumsiTintaK: string
}

export const EMPTY_PRINTING_INK_FORM: PrintingInkForm = {
  konsumsiTintaC: "",
  konsumsiTintaM: "",
  konsumsiTintaY: "",
  konsumsiTintaK: "",
}

const INK_FIELDS: (keyof PrintingInkForm)[] = [
  "konsumsiTintaC",
  "konsumsiTintaM",
  "konsumsiTintaY",
  "konsumsiTintaK",
]

const INK_LABELS: Record<keyof PrintingInkForm, string> = {
  konsumsiTintaC: "C",
  konsumsiTintaM: "M",
  konsumsiTintaY: "Y",
  konsumsiTintaK: "K",
}

function parseInkValue(raw: string): number | null {
  if (!raw.trim()) return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function validatePrintingInkForm(form: PrintingInkForm): string | null {
  for (const field of INK_FIELDS) {
    const value = parseInkValue(form[field])
    if (value == null) {
      return `Konsumsi tinta ${INK_LABELS[field]} wajib diisi (ml, angka ≥ 0)`
    }
  }
  return null
}

export function printingInkFormToPayload(form: PrintingInkForm) {
  return {
    konsumsiTintaC: parseInkValue(form.konsumsiTintaC)!,
    konsumsiTintaM: parseInkValue(form.konsumsiTintaM)!,
    konsumsiTintaY: parseInkValue(form.konsumsiTintaY)!,
    konsumsiTintaK: parseInkValue(form.konsumsiTintaK)!,
  }
}

export function formatPrintingInkSummary(pipeline: {
  konsumsiTintaC?: number | null
  konsumsiTintaM?: number | null
  konsumsiTintaY?: number | null
  konsumsiTintaK?: number | null
}): string | null {
  const { konsumsiTintaC, konsumsiTintaM, konsumsiTintaY, konsumsiTintaK } =
    pipeline
  if (
    konsumsiTintaC == null ||
    konsumsiTintaM == null ||
    konsumsiTintaY == null ||
    konsumsiTintaK == null
  ) {
    return null
  }
  return `C ${konsumsiTintaC} ml · M ${konsumsiTintaM} ml · Y ${konsumsiTintaY} ml · K ${konsumsiTintaK} ml`
}
