export const OPERATOR_DEPARTMENTS = [
  "SALES",
  "DESAINER",
  "SETTING",
  "LAYOUT",
  "PREPARE",
  "PRESS",
  "JAHIT",
  "FINISHING",
] as const

export type OperatorDepartment = (typeof OPERATOR_DEPARTMENTS)[number]

export const OPERATOR_DEPARTMENT_LABELS: Record<OperatorDepartment, string> = {
  SALES: "Sales",
  DESAINER: "Desainer",
  SETTING: "Setting",
  LAYOUT: "Layout",
  PREPARE: "Prepare",
  PRESS: "Press",
  JAHIT: "Jahit",
  FINISHING: "Finishing",
}

export function isOperatorDepartment(value: string): value is OperatorDepartment {
  return (OPERATOR_DEPARTMENTS as readonly string[]).includes(value)
}
