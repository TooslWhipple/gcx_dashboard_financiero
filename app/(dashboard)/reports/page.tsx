import { Suspense } from "react"
import { ReportsOverview } from "@/components/reports/reports-overview"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export const dynamic = 'force-dynamic'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">Reportes</h1>
        <p className="text-muted-foreground text-pretty">Generación y exportación de reportes personalizados</p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <ReportsOverview />
      </Suspense>
    </div>
  )
}
