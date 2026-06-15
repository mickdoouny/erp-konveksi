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

/** Owner UI tabs — printing is one workstation (SETTING + LAYOUT in DB). */
export const OWNER_OPERATOR_TABS = [
  "SALES",
  "DESAINER",
  "PRINTING",
  "PREPARE",
  "PRESS",
  "JAHIT",
  "FINISHING",
] as const

export type OwnerOperatorTab = (typeof OWNER_OPERATOR_TABS)[number]

const PRINTING_LABEL = "Printing (Setting-Layout-Print)"

export const OWNER_OPERATOR_TAB_LABELS: Record<OwnerOperatorTab, string> = {
  SALES: "Sales",
  DESAINER: "Desainer",
  PRINTING: PRINTING_LABEL,
  PREPARE: "Prepare",
  PRESS: "Press",
  JAHIT: "Jahit",
  FINISHING: "Finishing",
}

/** Department stored in DB when creating an operator from an owner tab. */
export const OWNER_TAB_CREATE_DEPARTMENT: Record<
  OwnerOperatorTab,
  OperatorDepartment
> = {
  SALES: "SALES",
  DESAINER: "DESAINER",
  PRINTING: "SETTING",
  PREPARE: "PREPARE",
  PRESS: "PRESS",
  JAHIT: "JAHIT",
  FINISHING: "FINISHING",
}

export function departmentsForOwnerTab(
  tab: OwnerOperatorTab
): OperatorDepartment[] {
  if (tab === "PRINTING") return ["SETTING", "LAYOUT"]
  return [OWNER_TAB_CREATE_DEPARTMENT[tab]]
}

export const OPERATOR_DEPARTMENT_LABELS: Record<OperatorDepartment, string> = {
  SALES: "Sales",
  DESAINER: "Desainer",
  SETTING: PRINTING_LABEL,
  LAYOUT: PRINTING_LABEL,
  PREPARE: "Prepare",
  PRESS: "Press",
  JAHIT: "Jahit",
  FINISHING: "Finishing",
}

export function isOperatorDepartment(value: string): value is OperatorDepartment {
  return (OPERATOR_DEPARTMENTS as readonly string[]).includes(value)
}
