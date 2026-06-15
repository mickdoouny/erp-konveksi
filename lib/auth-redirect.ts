import type { AuthUser } from "./auth"
import { homePathByRole } from "./auth"
import { PRODUKSI_PAGE_BY_DEPARTMENT, resolveProduksiDepartment } from "./production-operator-stages"

export { homePathByRole }

/** Halaman home per user — produksi diarahkan ke antrian divisi masing-masing. */
export function homePathForUser(user: AuthUser): string {
  if (user.role === "produksi") {
    const department = resolveProduksiDepartment(user)
    if (department) {
      return PRODUKSI_PAGE_BY_DEPARTMENT[department]
    }
  }
  return homePathByRole(user.role)
}
