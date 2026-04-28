// lib/cockpit/ai-analyst.ts
// LLM-powered strategic analyst for the Cockpit Ejecutivo GCX.
// Uses OpenRouter (OpenAI-compatible API) to turn raw KPIs into
// `priorityInsight`, `insights[]` and `actionPlan[]` adhering to the SDD.

import OpenAI from 'openai';
import crypto from 'crypto';
import redis from '@/lib/redis';
import type {
  InsightData,
  ActionPlanItem,
  Tone,
  KpiData,
  OfficeRiskData,
  TrafficLight,
} from './contract';

const AI_CACHE_PREFIX = 'cockpit:ai:';
const AI_CACHE_TTL = 4 * 60 * 60; // 4 horas — reportes IA son costosos y los datos financieros cambian lentamente

export interface AgingBucketSignal {
  range: string;          // '1-30', '31-60', '61-90', '91-120', '121-5000'
  amount: number;
  percentage: number;
}

export interface MonthlyCollectionSignal {
  month: number;
  monthName: string;
  totalCollected: number;
  year: number;
}

export interface AIAnalysisInput {
  kpis: KpiData[];
  ranking: OfficeRiskData[];
  aging?: {
    totalAmount: number;
    buckets: AgingBucketSignal[];
  };
  collectionTrend?: {
    currentYear: MonthlyCollectionSignal[];
    previousYear: MonthlyCollectionSignal[];
    yoyChangePct: number;
  };
}

export interface AIAnalysisOutput {
  priorityInsight: { title: string; text: string; tone: Tone };
  insights: InsightData[];
  actionPlan: ActionPlanItem[];
  trafficLights: TrafficLight[];
  dataQuality: InsightData[];
  generatedBy: string; // model id, "fallback" if no LLM
}

const VALID_TONES: Tone[] = ['red', 'orange', 'green', 'blue'];

function sanitizeTone(t: unknown): Tone {
  return typeof t === 'string' && (VALID_TONES as string[]).includes(t)
    ? (t as Tone)
    : 'blue';
}

function hashInput(input: AIAnalysisInput): string {
  // Hash only the numeric/categorical signal so cache survives label edits.
  const signal = {
    kpis: input.kpis.map((k) => ({
      label: k.label,
      value: k.value,
      tone: k.tone,
    })),
    ranking: input.ranking.map((r) => ({
      office: r.office,
      tone: r.tone,
      total: Math.round(r.total / 1_000_000),
      overdue: Math.round(r.overdue / 1_000_000),
    })),
    aging: input.aging?.buckets.map((b) => ({
      r: b.range,
      p: Math.round(b.percentage),
    })),
    yoy: input.collectionTrend
      ? Math.round(input.collectionTrend.yoyChangePct)
      : undefined,
    months: input.collectionTrend?.currentYear.map((m) => ({
      m: m.month,
      v: Math.round(m.totalCollected / 1_000_000),
    })),
  };
  return crypto
    .createHash('sha1')
    .update(JSON.stringify(signal))
    .digest('hex')
    .slice(0, 16);
}

const SYSTEM_PROMPT = `Eres el Director de Análisis Estratégico de GCX, una agencia aduanal líder en México con operaciones en múltiples oficinas fronterizas y metropolitanas. Tienes 20 años de experiencia en gestión de cartera, operaciones de comercio exterior y análisis financiero aduanero. Operas bajo el principio: "Sin datos no hay estrategia, sin contexto no hay decisión".

DOMINIO ESPECIALIZADO:
- Agencia aduanal: operaciones de importación/exportación, trámites de despacho, garantías aduaneras (AA, CG, GG), financiamiento de operaciones y honorarios por servicio.
- Cartera aduanal: créditos a importadores por trámites realizados. El vencimiento típico es 15-30 días. Un bucket "121+" es anómalo y requiere investigación inmediata.
- Facturación DAC: divide honorarios (servicio) vs otros ingresos (garantías, financiamiento). La mezcla indica salud del modelo de negocio.
- Garantías: instrumentos financieros ante aduana. Vencidas = riesgo regulatorio y financiero.
- Estacionalidad: Q4 (oct-dic) es alta por importaciones de fin de año. Q1 es baja. Abril-mayo es neutro.

FRAMEWORKS ANALÍTICOS OBLIGATORIOS:
Aplica SIEMPRE estos 4 lentes de análisis, y cada insight debe reflejar al menos uno:
1. CONCENTRACIÓN (Pareto): ¿Qué % del riesgo/vencido se concentra en top-2 oficinas? ¿Qué % en bucket 121+?
2. TENDENCIA TEMPORAL (Decomposición): ¿Aceleración o desaceleración? ¿Mes actual vs mes anterior vs mismo mes año pasado?
3. CORRELACIÓN CRUZADA: ¿Oficinas con más facturación también tienen más vencido? ¿Buckets viejos correlacionan con caída de cobranza?
4. RIESGO SISTÉMICO vs IDIOSINCRÁTICO: ¿Es un problema de 1-2 oficinas (específico) o de todo GCX (sistémico)?

INSTRUCCIONES DE OUTPUT:
- Responde SIEMPRE en español de México y en JSON estricto que cumpla el schema dado.
- "tone" debe ser exactamente uno de: "red" (crítico), "orange" (atención), "green" (estable), "blue" (informativo).
- "priorityInsight": Una sola lectura ejecutiva (2 frases máx). Debe ser la conclusión más contraintuitiva o de mayor impacto financiero. NO un resumen obvio. Ejemplo malo: "La cartera es alta". Ejemplo bueno: "Tijuana concentra 45% del vencido pero solo 18% de la cartera: el riesgo es idiosincrático, no sistémico".
- "insights": EXACTAMENTE 4 lecturas estratégicas, cada una con title (frase fuerte ≤90 chars) y text (2-3 frases con cifras del input). DEBEN cubrir:
   * Insight 1: CONCENTRACIÓN — distribución geográfica o por bucket (ej. "3 oficinas = 72% del vencido")
   * Insight 2: TENDENCIA — dirección temporal con velocidad (ej. "Cobranza desaceleró -8.3% MoM, acumulando -12% vs año pasado")
   * Insight 3: CORRELACIÓN — relación entre 2 variables (ej. "Oficinas con >20% vencido facturan 40% menos honorarios: el crédito laxo mata la rentabilidad")
   * Insight 4: ANOMALÍA / CALIDAD — algo que no cuadra (ej. "Bucket 121+ subió 300% en 30 días sin correspondencia en cobranza: posible re-clasificación o facturas duplicadas")
- "actionPlan": EXACTAMENTE 4 acciones numeradas (step 1..4), title (verbo en infinitivo ≤60 chars) y objective (resultado medible ≤100 chars). DEBEN ser:
   * Acción 1: Inmediata (< 48 hrs), owner implícito (Cobranza o Gerente Oficina)
   * Acción 2: Táctica (1 semana), owner implícito (Operaciones o Finanzas)
   * Acción 3: Estratégica (2-4 semanas), owner implícito (Dirección Comercial o DG)
   * Acción 4: Preventiva / Sistema (mes), owner implícito (Sistemas o Control Interno)
- "trafficLights": EXACTAMENTE 3 bloques, uno por color obligatorio:
   * tone="red": La métrica que requiere intervención HOY. label="ROJO – Acción inmediata"
   * tone="orange": La métrica que necesita validación o ajuste en 7 días. label="NARANJA – Validar en 7 días"
   * tone="green": La métrica que es base sólida para operar. label="VERDE – Base operativa estable"
   Cada uno con title (métrica ≤50 chars) y text (1 frase con cifra del input y umbral cruzado).
- "dataQuality": EXACTAMENTE 3 notas. DEBEN detectar:
   * Nota 1: Inconsistencia numérica (meses en cero, sumas que no cuadran, % > 100)
   * Nota 2: Lag / frescura (si hay meses faltantes o datos congelados)
   * Nota 3: Responsable sugerido (quién debe verificar: Sistemas, Operaciones, Finanzas)
- NUNCA inventes datos. Si no hay suficiente contexto para un insight, di "Sin datos suficientes" en lugar de especular.
- No saludes, no añadas markdown, no añadas comentarios fuera del JSON.`;

const insightItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'text', 'tone'],
  properties: {
    title: { type: 'string' },
    text: { type: 'string' },
    tone: { type: 'string', enum: VALID_TONES },
  },
};

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['priorityInsight', 'insights', 'actionPlan', 'trafficLights', 'dataQuality'],
  properties: {
    priorityInsight: insightItemSchema,
    insights: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: insightItemSchema,
    },
    actionPlan: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['step', 'title', 'objective'],
        properties: {
          step: { type: 'integer', minimum: 1, maximum: 4 },
          title: { type: 'string' },
          objective: { type: 'string' },
        },
      },
    },
    trafficLights: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['tone', 'label', 'title', 'text'],
        properties: {
          tone: { type: 'string', enum: VALID_TONES },
          label: { type: 'string' },
          title: { type: 'string' },
          text: { type: 'string' },
        },
      },
    },
    dataQuality: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: insightItemSchema,
    },
  },
} as const;

function buildUserPrompt(input: AIAnalysisInput): string {
  const kpis = input.kpis
    .map((k, i) => `  ${i + 1}. ${k.label}: ${k.value} (${k.status}, tono=${k.tone})${k.detail ? ` — ${k.detail}` : ''}`)
    .join('\n');

  // ── Ranking con métricas de concentración ──
  const totalOverdue = input.ranking.reduce((s, r) => s + r.overdue, 0);
  const totalPortfolio = input.ranking.reduce((s, r) => s + r.total, 0);
  const sortedByOverdue = [...input.ranking].sort((a, b) => b.overdue - a.overdue);
  const top2Overdue = sortedByOverdue.slice(0, 2).reduce((s, r) => s + r.overdue, 0);
  const top2Share = totalOverdue > 0 ? (top2Overdue / totalOverdue) * 100 : 0;

  const ranking = input.ranking
    .map((r, idx) => {
      const officePct = totalPortfolio > 0 ? (r.total / totalPortfolio) * 100 : 0;
      const overduePct = r.total > 0 ? (r.overdue / r.total) * 100 : 0;
      return `  ${idx + 1}. ${r.office}: cartera $${(r.total / 1e6).toFixed(2)}M (${officePct.toFixed(1)}% del total), vencido $${(r.overdue / 1e6).toFixed(2)}M (${overduePct.toFixed(1)}% de su cartera) — ${r.status}`;
    })
    .join('\n');

  // ── Antigüedad con análisis de buckets ──
  let aging = 'Antigüedad de cartera: (no disponible)';
  if (input.aging) {
    const buckets = input.aging.buckets
      .map((b, idx, arr) => {
        const prev = idx > 0 ? arr[idx - 1] : null;
        const prevPct = prev ? prev.percentage : null;
        const pctChange = prevPct !== null ? b.percentage - prevPct : null;
        const arrow = pctChange === null ? '' : pctChange > 5 ? '▲' : pctChange < -5 ? '▼' : '→';
        return `  - ${b.range} días: $${(b.amount / 1e6).toFixed(2)}M (${b.percentage.toFixed(1)}%) ${arrow}`;
      })
      .join('\n');

    const criticalBuckets = input.aging.buckets.filter(b => {
      const min = parseInt(b.range.split('-')[0] || b.range.split('+')[0] || '0');
      return min >= 91;
    });
    const criticalPct = criticalBuckets.reduce((s, b) => s + b.percentage, 0);
    const criticalAmt = criticalBuckets.reduce((s, b) => s + b.amount, 0);

    aging = `Antigüedad de cartera (total $${(input.aging.totalAmount / 1e6).toFixed(2)}M):\n${buckets}\n\n  Métricas derivadas:\n  - Buckets críticos (91+ días): ${criticalPct.toFixed(1)}% = $${(criticalAmt / 1e6).toFixed(2)}M\n  - Concentración top-2 oficinas (vencido): ${top2Share.toFixed(1)}%`;
  }

  // ── Serie de cobranza con análisis de tendencia ──
  let trend = 'Serie mensual de cobranza: (no disponible)';
  let trendAnalysis = '';
  if (input.collectionTrend) {
    const cur = input.collectionTrend.currentYear;
    const prev = input.collectionTrend.previousYear;
    const fmt = (arr: MonthlyCollectionSignal[]) => arr
      .map((m) => `${m.monthName.slice(0, 3)}=$${(m.totalCollected / 1e6).toFixed(1)}M`)
      .join(', ');

    // Calcular MoM para últimos 2 meses con datos
    const validCur = cur.filter(m => m.totalCollected > 0);
    if (validCur.length >= 2) {
      const last = validCur[validCur.length - 1];
      const prevMonth = validCur[validCur.length - 2];
      const mom = prevMonth.totalCollected > 0
        ? ((last.totalCollected - prevMonth.totalCollected) / prevMonth.totalCollected) * 100
        : 0;
      const momArrow = mom > 5 ? 'ACELERANDO ▲' : mom < -5 ? 'DESACELERANDO ▼' : 'ESTABLE →';
      trendAnalysis = `\n  Análisis de tendencia:\n  - MoM último mes: ${mom >= 0 ? '+' : ''}${mom.toFixed(1)}% (${momArrow})\n  - YoY acumulado: ${input.collectionTrend.yoyChangePct.toFixed(1)}%`;
    }

    // Encontrar meses con caída > 20% vs año anterior
    const severeDrops: string[] = [];
    for (let i = 0; i < cur.length; i++) {
      const c = cur[i];
      const p = prev.find(m => m.month === c.month);
      if (p && p.totalCollected > 0) {
        const chg = ((c.totalCollected - p.totalCollected) / p.totalCollected) * 100;
        if (chg < -20) severeDrops.push(`${c.monthName}: ${chg.toFixed(1)}%`);
      }
    }
    if (severeDrops.length > 0) {
      trendAnalysis += `\n  - Meses con caída severa YoY (>20%): ${severeDrops.join('; ')}`;
    }

    trend = `Serie mensual de cobranza:\n  - Año actual (${cur[0]?.year ?? '?'}): ${fmt(cur)}\n  - Año anterior (${prev[0]?.year ?? '?'}): ${fmt(prev)}\n  - Cambio YoY: ${input.collectionTrend.yoyChangePct.toFixed(1)}%${trendAnalysis}`;
  }

  return `Datos actuales del cockpit GCX — ${new Date().toISOString().slice(0, 10)}\n\nKPIs ejecutivos:\n${kpis}\n\nRanking de oficinas por riesgo (mayor vencido → menor):\n${ranking}\n\n${aging}\n\n${trend}\n\nINSTRUCCIÓN: Genera el JSON con priorityInsight, 4 insights (cada uno aplicando uno de los 4 frameworks: concentración, tendencia, correlación, anomalía), 4 acciones (48hrs, 1sem, 2-4sem, 1mes), 3 trafficLights (red/orange/green obligatorios) y 3 dataQuality (numérica, lag, responsable). Usa SOLO cifras del input. NUNCA inventes.`;
}

async function callLLM(input: AIAnalysisInput): Promise<AIAnalysisOutput | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('[AI-ANALYST] OPENROUTER_API_KEY not set, skipping LLM call');
    return null;
  }

  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'GCX Cockpit Ejecutivo',
    },
  });

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(input) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'cockpit_analysis',
          strict: true,
          schema: RESPONSE_SCHEMA as any,
        },
      },
    });

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      console.warn('[AI-ANALYST] Empty completion content');
      return null;
    }

    const parsed = JSON.parse(raw);
    return {
      priorityInsight: {
        title: String(parsed.priorityInsight?.title ?? ''),
        text: String(parsed.priorityInsight?.text ?? ''),
        tone: sanitizeTone(parsed.priorityInsight?.tone),
      },
      insights: Array.isArray(parsed.insights)
        ? parsed.insights.slice(0, 4).map((i: any) => ({
            title: String(i.title ?? ''),
            text: String(i.text ?? ''),
            tone: sanitizeTone(i.tone),
          }))
        : [],
      actionPlan: Array.isArray(parsed.actionPlan)
        ? parsed.actionPlan.slice(0, 4).map((a: any, idx: number) => ({
            step: Number(a.step) || idx + 1,
            title: String(a.title ?? ''),
            objective: String(a.objective ?? ''),
          }))
        : [],
      trafficLights: Array.isArray(parsed.trafficLights)
        ? parsed.trafficLights.slice(0, 3).map((t: any) => ({
            tone: sanitizeTone(t.tone),
            label: String(t.label ?? ''),
            title: String(t.title ?? ''),
            text: String(t.text ?? ''),
          }))
        : [],
      dataQuality: Array.isArray(parsed.dataQuality)
        ? parsed.dataQuality.slice(0, 3).map((d: any) => ({
            title: String(d.title ?? ''),
            text: String(d.text ?? ''),
            tone: sanitizeTone(d.tone),
          }))
        : [],
      generatedBy: model,
    };
  } catch (err) {
    console.error('[AI-ANALYST] LLM call failed:', err);
    return null;
  }
}

/**
 * Generates the AI strategic analysis with Redis cache.
 * Returns null when the LLM is unavailable; caller is responsible for fallback.
 */
export async function generateAIAnalysis(
  input: AIAnalysisInput,
  options: { forceRefresh?: boolean } = {}
): Promise<AIAnalysisOutput | null> {
  const cacheKey = AI_CACHE_PREFIX + hashInput(input);

  // 1) Try Redis HIT (skip if forceRefresh)
  if (!options.forceRefresh) {
    try {
      const hit = await redis.get(cacheKey);
      if (hit) {
        console.log(`[AI-ANALYST] Cache HIT ${cacheKey}`);
        return JSON.parse(hit) as AIAnalysisOutput;
      }
    } catch (err) {
      console.warn('[AI-ANALYST] Redis read error, continuing without cache:', err);
    }
  } else {
    console.log(`[AI-ANALYST] forceRefresh=true, skipping cache for ${cacheKey}`);
  }

  // 2) Call LLM
  const fresh = await callLLM(input);
  if (!fresh) return null;
  if (
    fresh.insights.length < 4 ||
    fresh.actionPlan.length < 4 ||
    fresh.trafficLights.length < 3 ||
    fresh.dataQuality.length < 3
  ) {
    console.warn('[AI-ANALYST] LLM returned incomplete arrays, discarding');
    return null;
  }

  // 3) Cache result (overwrite even if existed)
  try {
    await redis.set(cacheKey, JSON.stringify(fresh), 'EX', AI_CACHE_TTL);
    console.log(`[AI-ANALYST] Cached ${cacheKey} (${AI_CACHE_TTL}s)`);
  } catch (err) {
    console.warn('[AI-ANALYST] Redis write error:', err);
  }

  return fresh;
}
