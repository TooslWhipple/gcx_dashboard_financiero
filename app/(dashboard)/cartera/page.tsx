import { Suspense } from "react"
import { CarteraOverview } from "@/components/cartera/cartera-overview"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export const dynamic = 'force-dynamic'

export default function CarteraPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">Cartera</h1>
        <p className="text-muted-foreground text-pretty">Antigüedad de cartera con rangos exactos y detalle por cliente</p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <CarteraOverview />
      </Suspense>
    </div>
  )
}
