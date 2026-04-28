// app/api/cockpit/route.ts
// Aggregator endpoint for the Cockpit Ejecutivo GCX (SDD).
// Reuses existing module endpoints, applies tone heuristics and caches the
// final DashboardData payload in Redis (TTL 5 min). Failsafe: any partial
// failure falls back to the mock payload section, the UI never breaks.

import { NextRequest, NextResponse } from 'next/server';
import { getCachedData } from '@/lib/cache-service';
import type {
  DashboardData,
  KpiData,
  OfficeRiskData,
  Tone,
} from '@/lib/cockpit/contract';
import { mockDashboardData } from '@/lib/cockpit/mock';
import { getMexicoDateString } from '@/lib/date-utils';
import { generateAIAnalysis } from '@/lib/cockpit/ai-analyst';

export const dynamic = 'force-dynamic';

const COCKPIT_CACHE_KEY = 'cockpit:v1';
const COCKPIT_TTL_SECONDS = 300; // 5 min

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const formatM = (n: number) => `$${(n / 1_000_000).toFixed(2)}M`;
const formatPct = (n: number) => `${n.toFixed(1)}%`;

function overdueTone(pct: number): Tone {
  if (pct >= 20) return 'red';
  if (pct >= 10) return 'orange';
  return 'green';
}

function yoyTone(pct: number): Tone {
  if (pct <= -30) return 'red';
  if (pct <= -10) return 'orange';
  if (pct <= 5) return 'blue';
  return 'green';
}

function rankingTone(overduePct: number): Tone {
  if (overduePct >= 25) return 'red';
  if (overduePct >= 15) return 'orange';
  return 'blue';
}

function rankingStatus(tone: Tone): string {
  if (tone === 'red') return 'Crítico';
  if (tone === 'orange') return 'Alto';
  if (tone === 'blue') return 'Medio';
  return 'Estable';
}

async function safeFetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[COCKPIT] safeFetchJSON failed for ${url}:`, err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Main aggregator
// ─────────────────────────────────────────────────────────────────
async function buildDashboardData(origin: string): Promise<DashboardData> {
  const fechaCorte = getMexicoDateString();
  const year = new Date().getFullYear();

  const [oficinas, financiamiento, tendCobrado, garantiasTrend, facturacion, antiguedad] = await Promise.all([
    safeFetchJSON<any>(`${origin}/api/resumen-oficinas?fechaCorte=${fechaCorte}&idEmpresa=1`),
    safeFetchJSON<any>(`${origin}/api/financiamiento?year=${year}&idEmpresa=1`),
    safeFetchJSON<any>(`${origin}/api/tendencia-cobrado?year=${year}&idEmpresa=1`),
    safeFetchJSON<any>(`${origin}/api/garantias/tendencia?year=${year}&idEmpresa=1`),
    safeFetchJSON<any>(`${origin}/api/facturacion?year=${year}`),
    safeFetchJSON<any>(`${origin}/api/antiguedad-cartera?fechaCorte=${fechaCorte}&idEmpresa=1`),
  ]);

  // Start from mock as fallback baseline (cumple estrictamente con el contrato).
  const data: DashboardData = JSON.parse(JSON.stringify(mockDashboardData));
  data.generatedAt = new Date().toISOString();
  data.cutoffLabel = `Datos al corte ${fechaCorte}`;

  // ── KPI 1 & 2: Cartera total + vencida (fuente: /api/resumen-oficinas) ──
  if (oficinas?.totals) {
    const total = Number(oficinas.totals.total) || 0;
    const overdue = Number(oficinas.totals.overdue) || 0;
    if (total > 0) {
      const pct = (overdue / total) * 100;
      const t1 = overdueTone(pct);
      data.kpis[0] = {
        label: 'Cartera total por oficina',
        value: formatM(total),
        status: `${pct.toFixed(1)}% vencido`,
        tone: t1,
        detail: `${formatM(overdue)} vencidos visibles en el ranking de oficinas.`,
      } as KpiData;
      data.kpis[1] = {
        label: 'Cartera vencida',
        value: formatM(overdue),
        status: t1 === 'red' ? 'Crítico' : t1 === 'orange' ? 'Atención' : 'Estable',
        tone: t1,
        detail: 'Riesgo concentrado en oficinas top del ranking.',
      } as KpiData;
    }

    // Ranking
    const offices = Array.isArray(oficinas.offices) ? oficinas.offices : [];
    const ranking: OfficeRiskData[] = offices
      .filter((o: any) => Number(o.total) > 0)
      .sort((a: any, b: any) => Number(b.overdue) - Number(a.overdue))
      .slice(0, 5)
      .map((o: any) => {
        const total = Number(o.total) || 0;
        const overdue = Number(o.overdue) || 0;
        const pct = total > 0 ? (overdue / total) * 100 : 0;
        const tone = rankingTone(pct);
        return {
          office: o.name,
          total,
          overdue,
          status: rankingStatus(tone),
          tone,
        };
      });
    if (ranking.length > 0) data.ranking = ranking;
  }

  // ── KPI 3: Cobranza vs año anterior ──
  if (tendCobrado?.currentYear && tendCobrado?.previousYear) {
    const cur = (tendCobrado.currentYear as any[]).reduce((s, m) => s + (m.totalCollected || 0), 0);
    const prev = (tendCobrado.previousYear as any[]).reduce((s, m) => s + (m.totalCollected || 0), 0);
    if (prev > 0) {
      const yoy = ((cur - prev) / prev) * 100;
      const tone = yoyTone(yoy);
      data.kpis[2] = {
        label: 'Cobranza vs año anterior',
        value: `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`,
        status: tone === 'red' ? 'Validar datos' : tone === 'orange' ? 'Atención' : 'Estable',
        tone,
        detail: `Año actual ${formatM(cur)} vs año anterior ${formatM(prev)}.`,
      } as KpiData;
    }
  }

  // ── KPI 4: Financiamiento facturado (% facturado) ──
  if (financiamiento?.months) {
    const totals = (financiamiento.months as any[]).reduce(
      (acc, m) => {
        acc.invoiced += m.invoiced || 0;
        acc.pending += m.pendingInvoice || 0;
        return acc;
      },
      { invoiced: 0, pending: 0 }
    );
    const sum = totals.invoiced + totals.pending;
    if (sum > 0) {
      const pct = (totals.invoiced / sum) * 100;
      const tone: Tone = pct >= 80 ? 'green' : pct >= 60 ? 'orange' : 'red';
      data.kpis[3] = {
        label: 'Financiamiento facturado',
        value: formatPct(pct),
        status: tone === 'green' ? 'Estable' : 'Oportunidad',
        tone,
        detail: `${formatM(totals.invoiced)} facturados vs ${formatM(totals.pending)} por facturar.`,
      } as KpiData;
    }
  }

  // ── KPI 5: Garantías vencidas (%) ──
  if (garantiasTrend?.weeks?.length) {
    const last = (garantiasTrend.weeks as any[])[garantiasTrend.weeks.length - 1];
    const overdue = Number(last?.overdue) || 0;
    const onProcess = Number(last?.garantiasEnProceso) || 0;
    const sum = overdue + onProcess;
    if (sum > 0) {
      const pct = (overdue / sum) * 100;
      const tone: Tone = pct >= 30 ? 'red' : pct >= 15 ? 'orange' : 'green';
      data.kpis[4] = {
        label: 'Garantías vencidas',
        value: formatPct(pct),
        status: tone === 'red' ? 'Crítico' : tone === 'orange' ? 'Atención' : 'Estable',
        tone,
        detail: `${formatM(overdue)} vencidos y ${formatM(onProcess)} en proceso (vista semanal).`,
      } as KpiData;
    }
  }

  // ── KPI 6: Facturación total DAC ──
  if (facturacion?.aduanas) {
    let total = 0;
    let honor = 0;
    for (const a of facturacion.aduanas as any[]) {
      honor += Number(a.totalHonorarios) || 0;
      total += (Number(a.totalHonorarios) || 0) + (Number(a.totalOtros) || 0);
    }
    if (total > 0) {
      data.kpis[5] = {
        label: 'Facturación total DAC',
        value: formatM(total),
        status: 'Estable',
        tone: 'green',
        detail: `${formatM(honor)} honorarios y ${formatM(total - honor)} resto facturación.`,
      } as KpiData;
    }
  }

  // Build AI signals: aging buckets + monthly collection trend
  const agingSignal = antiguedad?.chartData
    ? {
        totalAmount: Number(antiguedad?.summary?.totalAmount) || 0,
        buckets: (antiguedad.chartData as any[]).map((b) => ({
          range: String(b.range),
          amount: Number(b.amount) || 0,
          percentage: Number(b.percentage) || 0,
        })),
      }
    : undefined;

  let collectionTrendSignal: any = undefined;
  if (tendCobrado?.currentYear && tendCobrado?.previousYear) {
    const cur = (tendCobrado.currentYear as any[]).reduce((s, m) => s + (m.totalCollected || 0), 0);
    const prev = (tendCobrado.previousYear as any[]).reduce((s, m) => s + (m.totalCollected || 0), 0);
    const yoy = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
    collectionTrendSignal = {
      currentYear: (tendCobrado.currentYear as any[]).map((m) => ({
        month: m.month,
        monthName: m.monthName,
        totalCollected: Number(m.totalCollected) || 0,
        year: m.year,
      })),
      previousYear: (tendCobrado.previousYear as any[]).map((m) => ({
        month: m.month,
        monthName: m.monthName,
        totalCollected: Number(m.totalCollected) || 0,
        year: m.year,
      })),
      yoyChangePct: yoy,
    };
  }

  // ── AI augmentation: priorityInsight + insights[] + actionPlan[] + trafficLights + dataQuality ──
  try {
    const ai = await generateAIAnalysis({
      kpis: data.kpis,
      ranking: data.ranking,
      aging: agingSignal,
      collectionTrend: collectionTrendSignal,
    });
    if (ai) {
      data.priorityInsight = ai.priorityInsight;
      data.insights = ai.insights;
      data.actionPlan = ai.actionPlan;
      data.trafficLights = ai.trafficLights;
      data.dataQuality = ai.dataQuality;
      console.log(`[COCKPIT] AI analysis applied (model=${ai.generatedBy})`);
    } else {
      console.log('[COCKPIT] AI unavailable, using mock insights/actionPlan/trafficLights/dataQuality');
    }
  } catch (err) {
    console.error('[COCKPIT] AI augmentation failed:', err);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const origin = url.origin;
    const forceRefresh = url.searchParams.get('refresh') === '1';

    if (forceRefresh) {
      const fresh = await buildDashboardData(origin);
      // Re-cache via getCachedData wrapper would not refresh; do it explicitly.
      const { setCachedData } = await import('@/lib/cache-service');
      await setCachedData(COCKPIT_CACHE_KEY, fresh, COCKPIT_TTL_SECONDS);
      return NextResponse.json(fresh);
    }

    const data = await getCachedData<DashboardData>(
      COCKPIT_CACHE_KEY,
      () => buildDashboardData(origin),
      COCKPIT_TTL_SECONDS,
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error('[COCKPIT] Unexpected error, returning mock:', error);
    return NextResponse.json(mockDashboardData);
  }
}
