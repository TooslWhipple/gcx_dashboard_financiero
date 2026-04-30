import { Suspense } from "react"
import { FinancingOverview } from "@/components/financing/financing-overview"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export const dynamic = 'force-dynamic'

export default function FinancingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">Financiamiento</h1>
        <p className="text-muted-foreground text-pretty">Análisis de financiamiento y anticipos otorgados</p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <FinancingOverview />
      </Suspense>
    </div>
  )
}
