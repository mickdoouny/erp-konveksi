import { ProductionStatus } from "@prisma/client"

/** Workstation grouping for operator UI (DB pipeline stages stay granular). */
export const PRODUKSI_OPERATOR_DEPARTMENTS = [
  "PREPRESS",
  "PREPARE",
  "PRESS",
  "JAHIT",
  "FINISHING",
] as const

export type ProduksiOperatorDepartment =
  (typeof PRODUKSI_OPERATOR_DEPARTMENTS)[number]

/** Legacy operatorDepartment / divisi values mapped to a workstation. */
const LEGACY_DEPARTMENT_ALIASES: Record<string, ProduksiOperatorDepartment> = {
  SETTING: "PREPRESS",
  LAYOUT: "PREPRESS",
}

export const DEPARTMENT_STAGES: Record<
  ProduksiOperatorDepartment,
  ProductionStatus[]
> = {
  PREPRESS: [
    ProductionStatus.SETTING,
    ProductionStatus.MENUNGGU_ACC_SETTING,
    ProductionStatus.LAYOUT_PRINT,
    ProductionStatus.PRINTING,
  ],
  PREPARE: [
    ProductionStatus.POTONG_KERTAS,
    ProductionStatus.PREPARE_BAHAN_KAIN,
  ],
  PRESS: [ProductionStatus.PRESS],
  JAHIT: [ProductionStatus.JAHIT],
  FINISHING: [ProductionStatus.FINISHING],
}

export type OperatorStageAction = {
  startLabel: string
  completeLabel: string
}

export const STAGE_OPERATOR_ACTIONS: Partial<
  Record<ProductionStatus, OperatorStageAction>
> = {
  [ProductionStatus.SETTING]: {
    startLabel: "Proses setting",
    completeLabel: "Kirim ke CS",
  },
  [ProductionStatus.LAYOUT_PRINT]: {
    startLabel: "Proses layout",
    completeLabel: "Layout selesai",
  },
  [ProductionStatus.PRINTING]: {
    startLabel: "Sedang proses printing",
    completeLabel: "Printing selesai",
  },
  [ProductionStatus.POTONG_KERTAS]: {
    startLabel: "Proses potong kertas",
    completeLabel: "Potong kertas selesai",
  },
  [ProductionStatus.PREPARE_BAHAN_KAIN]: {
    startLabel: "Proses potong bahan",
    completeLabel: "Selesai potong bahan",
  },
  [ProductionStatus.PRESS]: {
    startLabel: "Proses press",
    completeLabel: "Press selesai",
  },
  [ProductionStatus.JAHIT]: {
    startLabel: "Proses jahit",
    completeLabel: "Selesai jahit",
  },
  [ProductionStatus.FINISHING]: {
    startLabel: "Mulai QC",
    completeLabel: "QC lulus",
  },
}

export const PRODUKSI_PAGE_BY_DEPARTMENT: Record<
  ProduksiOperatorDepartment,
  string
> = {
  PREPRESS: "/produksi/printing",
  PREPARE: "/produksi/preparing",
  PRESS: "/produksi/press",
  JAHIT: "/produksi/jahit",
  FINISHING: "/produksi/qc",
}

/** Old operator URLs — redirect to combined workstation pages. */
export const LEGACY_PRODUKSI_PAGE_REDIRECTS: Record<string, string> = {
  "/produksi/setting": "/produksi/printing",
  "/produksi/prepress": "/produksi/printing",
}

export const PRODUKSI_PAGE_TITLES: Record<
  ProduksiOperatorDepartment,
  { title: string; description: string }
> = {
  PREPRESS: {
    title: "Printing (Setting-Layout-Print)",
    description:
      "Antrian workstation printing — setting, layout, dan printing dalam satu antrian.",
  },
  PREPARE: {
    title: "Preparing (Potong kertas-Bahan)",
    description:
      "Potong kertas dan preparing bahan kain sebelum press — satu antrian workstation.",
  },
  PRESS: {
    title: "Press",
    description: "Antrian press — selesai press lanjut ke jahit.",
  },
  JAHIT: {
    title: "Jahit",
    description: "Antrian jahit — selesai jahit dikembalikan ke Admin Produksi.",
  },
  FINISHING: {
    title: "QC",
    description: "Quality control — periksa barang sebelum packing dan siap kirim.",
  },
}

export function stagesForDepartment(
  department: string
): ProductionStatus[] | null {
  const resolved =
    LEGACY_DEPARTMENT_ALIASES[department] ??
    (department in DEPARTMENT_STAGES
      ? (department as ProduksiOperatorDepartment)
      : null)
  if (!resolved) return null
  return DEPARTMENT_STAGES[resolved]
}

export function departmentFromDivisi(divisi: string): ProduksiOperatorDepartment | null {
  const lower = divisi.toLowerCase()
  if (
    lower.includes("prepress") ||
    lower.includes("printing") ||
    lower.includes("setting") ||
    lower.includes("print") ||
    lower.includes("layout")
  ) {
    return "PREPRESS"
  }
  if (lower.includes("prepare") || lower.includes("preparing")) return "PREPARE"
  if (lower.includes("press")) return "PRESS"
  if (lower.includes("jahit")) return "JAHIT"
  if (lower.includes("qc") || lower.includes("finishing")) return "FINISHING"
  return null
}

export function resolveProduksiDepartment(user: {
  operatorDepartment?: string
  divisi?: string
}): ProduksiOperatorDepartment | null {
  if (user.operatorDepartment) {
    const mapped =
      LEGACY_DEPARTMENT_ALIASES[user.operatorDepartment] ??
      user.operatorDepartment
    if (mapped in PRODUKSI_PAGE_BY_DEPARTMENT) {
      return mapped as ProduksiOperatorDepartment
    }
  }
  return user.divisi ? departmentFromDivisi(user.divisi) : null
}
