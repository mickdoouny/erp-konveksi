import { ProductionStatus } from "@prisma/client"
import type { OperatorDepartment } from "@/lib/operators"

/** Tahap produksi per halaman operator divisi. */
export const DEPARTMENT_STAGES: Record<
  Exclude<
    OperatorDepartment,
    "SALES" | "DESAINER" | "FINISHING"
  >,
  ProductionStatus[]
> = {
  SETTING: [ProductionStatus.SETTING],
  LAYOUT: [ProductionStatus.LAYOUT_PRINT, ProductionStatus.PRINTING],
  PREPARE: [
    ProductionStatus.POTONG_KERTAS,
    ProductionStatus.PREPARE_BAHAN_KAIN,
  ],
  PRESS: [ProductionStatus.PRESS],
  JAHIT: [ProductionStatus.JAHIT],
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
    completeLabel: "Selesai setting",
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
    startLabel: "Preparing bahan",
    completeLabel: "Preparing selesai",
  },
  [ProductionStatus.PRESS]: {
    startLabel: "Proses press",
    completeLabel: "Press selesai",
  },
  [ProductionStatus.JAHIT]: {
    startLabel: "Proses jahit",
    completeLabel: "Selesai jahit",
  },
}

export const PRODUKSI_PAGE_BY_DEPARTMENT: Record<
  Exclude<
    OperatorDepartment,
    "SALES" | "DESAINER" | "FINISHING"
  >,
  string
> = {
  SETTING: "/produksi/setting",
  LAYOUT: "/produksi/printing",
  PREPARE: "/produksi/preparing",
  PRESS: "/produksi/press",
  JAHIT: "/produksi/jahit",
}

export const PRODUKSI_PAGE_TITLES: Record<
  keyof typeof PRODUKSI_PAGE_BY_DEPARTMENT,
  { title: string; description: string }
> = {
  SETTING: {
    title: "Setting",
    description: "Antrian order tahap setting — proses dan selesaikan sebelum printing.",
  },
  LAYOUT: {
    title: "Printing",
    description: "Layout & printing — proses layout lalu printing sebelum preparing.",
  },
  PREPARE: {
    title: "Preparing",
    description: "Potong kertas dan preparing bahan kain sebelum press.",
  },
  PRESS: {
    title: "Press",
    description: "Antrian press — selesai press lanjut ke jahit.",
  },
  JAHIT: {
    title: "Jahit",
    description: "Antrian jahit — selesai jahit dikembalikan ke Admin Produksi.",
  },
}

export function stagesForDepartment(
  department: string
): ProductionStatus[] | null {
  if (department in DEPARTMENT_STAGES) {
    return DEPARTMENT_STAGES[
      department as keyof typeof DEPARTMENT_STAGES
    ]
  }
  return null
}

export function departmentFromDivisi(divisi: string): string | null {
  const lower = divisi.toLowerCase()
  if (lower.includes("setting")) return "SETTING"
  if (lower.includes("print") || lower.includes("layout")) return "LAYOUT"
  if (lower.includes("prepare") || lower.includes("preparing")) return "PREPARE"
  if (lower.includes("press")) return "PRESS"
  if (lower.includes("jahit")) return "JAHIT"
  return null
}
