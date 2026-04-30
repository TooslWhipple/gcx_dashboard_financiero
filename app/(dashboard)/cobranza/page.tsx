import { Suspense } from "react"
import { CobranzaOverview } from "@/components/cobranza/cobranza-overview"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export const dynamic = 'force-dynamic'

export default function CobranzaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">Cobranza</h1>
        <p className="text-muted-foreground text-pretty">Tendencia mensual de cobrado con comparativo año anterior</p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <CobranzaOverview />
      </Suspense>
    </div>
  )
}
