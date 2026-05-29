export function canAccessAdminKeuanganRoutes(role: string): boolean {
  return ["admin_keuangan", "owner"].includes(role)
}

export function canAccessAdminProduksiRoutes(role: string): boolean {
  return ["admin_produksi", "owner"].includes(role)
}

export function canAccessCsRoutes(role: string): boolean {
  return ["cs", "owner"].includes(role)
}

export function canAccessDesainerRoutes(role: string): boolean {
  return ["desainer", "owner"].includes(role)
}

/** Label peran untuk tampilan UI (sidebar, dashboard, dll.). */
export function roleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner"
    case "admin_produksi":
      return "Admin Produksi"
    case "admin_keuangan":
      return "Admin Keuangan"
    case "cs":
      return "Customer Service"
    case "desainer":
      return "Desainer"
    case "produksi":
      return "Produksi"
    default:
      return role
  }
}
