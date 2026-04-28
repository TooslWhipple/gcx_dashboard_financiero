// app/api/cockpit/ai-analysis/route.ts
// Endpoint dedicado para generar/consultar análisis estratégico IA del Cockpit.
// Permite force-refresh para regenerar sin esperar al TTL de cache.
// Los reportes se guardan en Redis con TTL 4h para evitar costos repetidos de LLM.

import { NextRequest, NextResponse } from 'next/server';
import { generateAIAnalysis, type AIAnalysisInput } from '@/lib/cockpit/ai-analyst';
import { mockDashboardData } from '@/lib/cockpit/mock';
import { getMexicoDateString } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

async function safeFetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[AI-ANALYSIS-API] safeFetchJSON failed for ${url}:`, err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const origin = url.origin;
    const forceRefresh = url.searchParams.get('refresh') === '1';
    const year = new Date().getFullYear();
    const fechaCorte = getMexicoDateString();

    // Fetch same signals the cockpit uses
    const [oficinas, tendCobrado, antiguedad, facturacion, financiamiento, garantiasTrend] = await Promise.all([
      safeFetchJSON<any>(`${origin}/api/resumen-oficinas?fechaCorte=${fechaCorte}&idEmpresa=1`),
      safeFetchJSON<any>(`${origin}/api/tendencia-cobrado?year=${year}&idEmpresa=1`),
      safeFetchJSON<any>(`${origin}/api/antiguedad-cartera?fechaCorte=${fechaCorte}&idEmpresa=1`),
      safeFetchJSON<any>(`${origin}/api/facturacion?year=${year}`),
      safeFetchJSON<any>(`${origin}/api/financiamiento?year=${year}&idEmpresa=1`),
      safeFetchJSON<any>(`${origin}/api/garantias/tendencia?year=${year}&idEmpresa=1`),
    ]);

    // Build KPIs (same logic as cockpit route)
    const kpis = [...mockDashboardData.kpis];

    if (oficinas?.totals) {
      const total = Number(oficinas.totals.total) || 0;
      const overdue = Number(oficinas.totals.overdue) || 0;
      if (total > 0) {
        const pct = (overdue / total) * 100;
        kpis[0] = { label: 'Cartera total', value: `$${(total / 1e6).toFixed(2)}M`, status: `${pct.toFixed(1)}% vencido`, tone: pct >= 20 ? 'red' : pct >= 10 ? 'orange' : 'green', detail: '' };
        kpis[1] = { label: 'Cartera vencida', value: `$${(overdue / 1e6).toFixed(2)}M`, status: pct >= 20 ? 'Crítico' : pct >= 10 ? 'Atención' : 'Estable', tone: pct >= 20 ? 'red' : pct >= 10 ? 'orange' : 'green', detail: '' };
      }
    }

    // Ranking
    let ranking: any[] = [];
    if (oficinas?.offices) {
      ranking = (oficinas.offices as any[])
        .filter((o: any) => Number(o.total) > 0)
        .sort((a: any, b: any) => Number(b.overdue) - Number(a.overdue))
        .slice(0, 5)
        .map((o: any) => ({
          office: o.name,
          total: Number(o.total) || 0,
          overdue: Number(o.overdue) || 0,
          status: 'N/A',
          tone: 'blue' as const,
        }));
    }

    // Aging signal
    const agingSignal = antiguedad?.chartData
      ? {
          totalAmount: Number(antiguedad?.summary?.totalAmount) || 0,
          buckets: (antiguedad.chartData as any[]).map((b: any) => ({
            range: String(b.range),
            amount: Number(b.amount) || 0,
            percentage: Number(b.percentage) || 0,
          })),
        }
      : undefined;

    // Collection trend
    let collectionTrendSignal: any = undefined;
    if (tendCobrado?.currentYear && tendCobrado?.previousYear) {
      const cur = (tendCobrado.currentYear as any[]).reduce((s: number, m: any) => s + (m.totalCollected || 0), 0);
      const prev = (tendCobrado.previousYear as any[]).reduce((s: number, m: any) => s + (m.totalCollected || 0), 0);
      const yoy = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
      collectionTrendSignal = {
        currentYear: (tendCobrado.currentYear as any[]).map((m: any) => ({
          month: m.month,
          monthName: m.monthName,
          totalCollected: Number(m.totalCollected) || 0,
          year: m.year,
        })),
        previousYear: (tendCobrado.previousYear as any[]).map((m: any) => ({
          month: m.month,
          monthName: m.monthName,
          totalCollected: Number(m.totalCollected) || 0,
          year: m.year,
        })),
        yoyChangePct: yoy,
      };
    }

    const input: AIAnalysisInput = {
      kpis,
      ranking,
      aging: agingSignal,
      collectionTrend: collectionTrendSignal,
    };

    const ai = await generateAIAnalysis(input, { forceRefresh });

    if (!ai) {
      return NextResponse.json(
        { error: 'LLM unavailable or returned incomplete data', fallback: true, timestamp: new Date().toISOString() },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ...ai,
      generatedAt: new Date().toISOString(),
      cacheStatus: forceRefresh ? 'refreshed' : 'cached-or-new',
    });
  } catch (error) {
    console.error('[AI-ANALYSIS-API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal error', fallback: true },
      { status: 500 }
    );
  }
}
