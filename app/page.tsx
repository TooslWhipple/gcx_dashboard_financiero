import { headers } from "next/headers"
import { CockpitEjecutivo } from "@/components/cockpit/cockpit-ejecutivo"
import { mockDashboardData } from "@/lib/cockpit/mock"
import type { DashboardData } from "@/lib/cockpit/contract"

export const dynamic = 'force-dynamic'

async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const h = headers()
    const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
    const proto = h.get('x-forwarded-proto') ?? 'http'
    const res = await fetch(`${proto}://${host}/api/cockpit`, { cache: 'no-store' })
    if (!res.ok) return mockDashboardData
    return (await res.json()) as DashboardData
  } catch (err) {
    console.error('[CockpitPage] fallback to mock:', err)
    return mockDashboardData
  }
}

export default async function CockpitPage() {
  const data = await fetchDashboardData()
  return <CockpitEjecutivo data={data} />
}
