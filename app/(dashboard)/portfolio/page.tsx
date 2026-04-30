import { Suspense } from "react"
import { PortfolioOverview } from "@/components/portfolio/portfolio-overview"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export const dynamic = 'force-dynamic'

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">Cartera</h1>
        <p className="text-muted-foreground text-pretty">
          Análisis detallado de la cartera de clientes y estado de cuentas
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <PortfolioOverview />
      </Suspense>
    </div>
  )
}
