/** Halaman default setelah login / saat user salah peran. */
export function homePathByRole(role: string): string {
  switch (role) {
    case "owner":
      return "/owner"
    case "cs":
      return "/leads"
    case "desainer":
      return "/designs/list"
    case "produksi":
      return "/report"
    default:
      return "/login"
  }
}
