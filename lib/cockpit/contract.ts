// lib/cockpit/contract.ts
// Specification-Driven Development (SDD) contract for the
// "Cockpit Ejecutivo GCX" dashboard. Any backend or mock service
// MUST adhere strictly to these interfaces.

export type Tone = 'red' | 'orange' | 'green' | 'blue';

/**
 * Top KPI card on the cockpit grid.
 * `value` is already pre-formatted for display (e.g. "$259.17M", "-67.1%").
 */
export interface KpiData {
  label: string;
  value: string;
  status: string;
  tone: Tone;
  detail?: string;
}

/**
 * Row in the "Ranking de Riesgo por Oficina" table.
 * `total` and `overdue` are amounts in MXN (raw numbers).
 */
export interface OfficeRiskData {
  office: string;
  total: number;
  overdue: number;
  status: string;
  tone: Tone;
}

/**
 * Strategic insight card / list item produced by the dashboard
 * (or, in Phase 2, by an AI agent).
 */
export interface InsightData {
  title: string;
  text: string;
  tone: Tone;
}

/**
 * Single block of the executive risk traffic-light row.
 */
export interface TrafficLight {
  tone: Tone;
  label: string;     // e.g. "ROJO – Acción inmediata"
  title: string;     // e.g. "Cartera vencida"
  text: string;
}

/**
 * Numbered action plan suggestion.
 */
export interface ActionPlanItem {
  step: number;
  title: string;
  objective: string;
}

/**
 * Full payload consumed by the cockpit screen.
 */
export interface DashboardData {
  generatedAt: string;          // ISO timestamp
  cutoffLabel: string;          // e.g. "Datos observados en pantalla 2026"
  kpis: KpiData[];              // exactly 6 cards (3 cols x 2 rows)
  trafficLights: TrafficLight[]; // exactly 3 blocks (red, amber, green)
  priorityInsight: InsightData; // dark-card insight beside the traffic lights
  ranking: OfficeRiskData[];    // top offices by overdue amount
  dataQuality: InsightData[];   // right-side "Calidad de datos" notes
  insights: InsightData[];      // bottom-left strategic insights
  actionPlan: ActionPlanItem[]; // bottom-right numbered plan
}
