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
const AI_CACHE_TTL = 60 * 60; // 1 hour

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

const SYSTEM_PROMPT = `Eres un analista financiero senior y consultor ejecutivo de GCX, una agencia aduanal mexicana.
Recibirás KPIs ejecutivos del cockpit directivo (cartera, vencido, cobranza vs año anterior, financiamiento facturado, garantías vencidas y facturación DAC), el ranking de oficinas con mayor vencido, la antigüedad de cartera por buckets (1-30, 31-60, 61-90, 91-120, 121+) y la serie mensual de cobranza del año actual y anterior.

Tu tarea es generar lecturas estratégicas, plan de acción accionable, semáforo ejecutivo de riesgo y notas de calidad de datos para Dirección General. Sé directo, evita relleno, usa cifras del input, y NUNCA inventes datos.

Reglas:
- Responde SIEMPRE en español de México y en JSON estricto que cumpla el schema dado.
- "tone" debe ser exactamente uno de: "red" (crítico), "orange" (atención), "green" (estable), "blue" (informativo).
- "priorityInsight": una sola lectura ejecutiva (1-2 frases) con la acción de mayor retorno inmediato.
- "insights": exactamente 4 lecturas, cada una con title (frase fuerte ≤90 chars) y text (1-2 frases con cifras del input). Aprovecha la antigüedad de cartera y la serie de cobranza para detectar tendencias temporales y concentración por bucket.
- "actionPlan": exactamente 4 acciones numeradas (step 1..4), title (verbo en infinitivo) y objective (qué se logra). Concretas, ejecutables en 2 semanas.
- "trafficLights": EXACTAMENTE 3 bloques, uno por color: el primero con tone="red" (acción inmediata), el segundo con tone="orange" (validar/corregir), el tercero con tone="green" (base operativa). Cada uno con label (encabezado en mayúsculas como "ROJO – Acción inmediata"), title (la métrica) y text (1 frase con cifra del input).
- "dataQuality": EXACTAMENTE 3 notas sobre calidad de datos / integridad / responsables, cada una con title corto y text con recomendación. Detecta inconsistencias (por ejemplo, meses en cero, porcentajes irreales, brechas entre fuentes).
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
  const ranking = input.ranking
    .map((r) => `  - ${r.office}: total ${(r.total / 1e6).toFixed(2)}M, vencido ${(r.overdue / 1e6).toFixed(2)}M (${r.status})`)
    .join('\n');

  let aging = 'Antigüedad de cartera: (no disponible)';
  if (input.aging) {
    const buckets = input.aging.buckets
      .map((b) => `  - ${b.range} días: $${(b.amount / 1e6).toFixed(2)}M (${b.percentage.toFixed(1)}%)`)
      .join('\n');
    aging = `Antigüedad de cartera (total $${(input.aging.totalAmount / 1e6).toFixed(2)}M):\n${buckets}`;
  }

  let trend = 'Serie mensual de cobranza: (no disponible)';
  if (input.collectionTrend) {
    const cur = input.collectionTrend.currentYear;
    const prev = input.collectionTrend.previousYear;
    const fmt = (arr: MonthlyCollectionSignal[]) => arr
      .map((m) => `${m.monthName.slice(0, 3)}=$${(m.totalCollected / 1e6).toFixed(1)}M`)
      .join(', ');
    trend = `Serie mensual de cobranza:\n  - Año actual (${cur[0]?.year ?? '?'}): ${fmt(cur)}\n  - Año anterior (${prev[0]?.year ?? '?'}): ${fmt(prev)}\n  - Cambio YoY: ${input.collectionTrend.yoyChangePct.toFixed(1)}%`;
  }

  return `Datos actuales del cockpit GCX:\n\nKPIs:\n${kpis}\n\nRanking de oficinas (mayor vencido):\n${ranking}\n\n${aging}\n\n${trend}\n\nGenera el JSON con priorityInsight, 4 insights, 4 acciones, 3 trafficLights y 3 dataQuality.`;
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
): Promise<AIAnalysisOutput | null> {
  const cacheKey = AI_CACHE_PREFIX + hashInput(input);

  // 1) Try Redis HIT
  try {
    const hit = await redis.get(cacheKey);
    if (hit) {
      console.log(`[AI-ANALYST] Cache HIT ${cacheKey}`);
      return JSON.parse(hit) as AIAnalysisOutput;
    }
  } catch (err) {
    console.warn('[AI-ANALYST] Redis read error, continuing without cache:', err);
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

  // 3) Cache result
  try {
    await redis.set(cacheKey, JSON.stringify(fresh), 'EX', AI_CACHE_TTL);
    console.log(`[AI-ANALYST] Cached ${cacheKey} (${AI_CACHE_TTL}s)`);
  } catch (err) {
    console.warn('[AI-ANALYST] Redis write error:', err);
  }

  return fresh;
}
