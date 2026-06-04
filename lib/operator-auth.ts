import type { AuthUser } from "@/lib/auth"
import {
  OPERATOR_DEPARTMENT_LABELS,
  type OperatorDepartment,
} from "@/lib/operators"
import { verifyPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"

const PRODUCTION_DEPARTMENTS: OperatorDepartment[] = [
  "SETTING",
  "LAYOUT",
  "PREPARE",
  "PRESS",
  "JAHIT",
  "FINISHING",
]

export function roleForOperatorDepartment(
  department: OperatorDepartment
): string {
  if (department === "DESAINER") {
    return "desainer"
  }
  if (PRODUCTION_DEPARTMENTS.includes(department)) {
    return "produksi"
  }
  return "operator"
}

export function operatorToAuthUser(operator: {
  id: string
  name: string
  username: string
  department: OperatorDepartment
}): AuthUser {
  return {
    id: operator.id,
    nama: operator.name,
    username: operator.username,
    role: roleForOperatorDepartment(operator.department),
    divisi: OPERATOR_DEPARTMENT_LABELS[operator.department],
    operatorDepartment: operator.department,
  }
}

export async function authenticateOperator(
  username: string,
  password: string
): Promise<AuthUser | null> {
  const normalizedUsername = username.trim()
  if (!normalizedUsername || !password) {
    return null
  }

  const operator = await prisma.operator.findFirst({
    where: {
      username: normalizedUsername,
      isActive: true,
    },
  })

  if (!operator || !verifyPassword(password, operator.passwordHash)) {
    return null
  }

  return operatorToAuthUser(operator)
}
