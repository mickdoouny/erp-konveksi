import { PageHeader } from "@/components/layout/page-header"

export function OwnerDashboardHeader({
  workflowEnabled,
}: {
  workflowEnabled: boolean
}) {
  return (
    <PageHeader
      badge="Owner"
      title="Dashboard"
      titleAccent="Owner"
      description={
        workflowEnabled
          ? "Ringkasan report produksi, penjualan final order, keuangan, dan performa CS."
          : "Ringkasan report produksi, lead penjualan, antrian desain, dan performa CS."
      }
    />
  )
}
