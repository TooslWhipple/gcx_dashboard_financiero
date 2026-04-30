import { Suspense } from "react"
import { GuaranteesOverview } from "@/components/guarantees/guarantees-overview"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export const dynamic = 'force-dynamic'

export default function GuaranteesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">Garantías</h1>
        <p className="text-muted-foreground text-pretty">Gestión y seguimiento de garantías otorgadas</p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <GuaranteesOverview />
      </Suspense>
    </div>
  )
}
