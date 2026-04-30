"use client";

// components/cockpit/cockpit-ejecutivo.tsx
// Cockpit Ejecutivo GCX — single consolidated client component.
// Consumes the SDD contract from `lib/cockpit/contract`.

import { Sparkles, AlertTriangle, ShieldCheck, Activity, FileText, RefreshCw } from "lucide-react";
import type {
  DashboardData,
  KpiData,
  OfficeRiskData,
  InsightData,
  TrafficLight,
  ActionPlanItem,
  Tone,
} from "@/lib/cockpit/contract";

// ─────────────────────────────────────────────────────────────────
// Tone styling helpers (reactive to the SDD `tone` property)
// ─────────────────────────────────────────────────────────────────
type ToneClasses = {
  badgeBg: string;
  badgeText: string;
  border: string;
  accent: string;
  softBg: string;
};

function toneStyles(tone: Tone): ToneClasses {
  switch (tone) {
    case "red":
      return {
        badgeBg: "bg-red-100",
        badgeText: "text-red-700",
        border: "border-red-200",
        accent: "#dc2626",
        softBg: "bg-red-50",
      };
    case "orange":
      return {
        badgeBg: "bg-orange-100",
        badgeText: "text-orange-700",
        border: "border-orange-200",
        accent: "#f97316",
        softBg: "bg-orange-50",
      };
    case "green":
      return {
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-700",
        border: "border-emerald-200",
        accent: "#059669",
        softBg: "bg-emerald-50",
      };
    case "blue":
    default:
      return {
        badgeBg: "bg-sky-100",
        badgeText: "text-sky-700",
        border: "border-sky-200",
        accent: "#0284c7",
        softBg: "bg-sky-50",
      };
  }
}

const card: React.CSSProperties = {
  borderRadius: 22,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05)",
};

const formatCurrency = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

// ─────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────
function KpiCard({ kpi }: { kpi: KpiData }) {
  const t = toneStyles(kpi.tone);
  return (
    <div
      className="bg-white p-6 border border-slate-100"
      style={card}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.badgeBg} ${t.badgeText}`}
        >
          {kpi.status}
        </span>
      </div>
      <p className="text-3xl font-bold mt-2 text-[#0f172a]">{kpi.value}</p>
      {kpi.detail && (
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{kpi.detail}</p>
      )}
    </div>
  );
}

function TrafficLightBlock({ light }: { light: TrafficLight }) {
  const t = toneStyles(light.tone);
  return (
    <div
      className={`p-4 border ${t.border} ${t.softBg}`}
      style={{ borderRadius: 16 }}
    >
      <p className={`text-xs font-bold uppercase tracking-wide ${t.badgeText}`}>
        {light.label}
      </p>
      <p className="text-lg font-semibold text-[#0f172a] mt-1">{light.title}</p>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{light.text}</p>
    </div>
  );
}

function RankingTable({ rows }: { rows: OfficeRiskData[] }) {
  return (
    <div
      className="bg-white border border-slate-100 overflow-hidden"
      style={card}
    >
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-base font-semibold text-[#0f172a]">
          Ranking de riesgo por oficina
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Basado en montos visibles en módulos internos.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead style={{ background: "#07185d" }}>
          <tr className="text-white text-xs uppercase tracking-wide">
            <th className="text-left px-6 py-3 font-semibold">Oficina</th>
            <th className="text-right px-6 py-3 font-semibold">Cartera total</th>
            <th className="text-right px-6 py-3 font-semibold">Vencido</th>
            <th className="text-center px-6 py-3 font-semibold">Semáforo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const t = toneStyles(r.tone);
            return (
              <tr
                key={r.office}
                className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
              >
                <td className="px-6 py-3 text-[#0f172a] font-medium">{r.office}</td>
                <td className="px-6 py-3 text-right text-slate-700">
                  {formatCurrency(r.total)}
                </td>
                <td className="px-6 py-3 text-right font-semibold text-[#0f172a]">
                  {formatCurrency(r.overdue)}
                </td>
                <td className="px-6 py-3 text-center">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${t.badgeBg} ${t.badgeText}`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InsightCard({ insight }: { insight: InsightData }) {
  const t = toneStyles(insight.tone);
  return (
    <div
      className="bg-white border border-slate-100 p-5"
      style={card}
    >
      <span
        className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${t.badgeBg} ${t.badgeText}`}
      >
        IA · {insight.tone === "red" ? "Crítico" : insight.tone === "orange" ? "Atención" : insight.tone === "green" ? "Estable" : "Insight"}
      </span>
      <p className="text-sm font-semibold text-[#0f172a] mt-2">
        {insight.title}
      </p>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
        {insight.text}
      </p>
    </div>
  );
}

function ActionItem({ item }: { item: ActionPlanItem }) {
  return (
    <div className="flex gap-3">
      <div
        className="shrink-0 h-8 w-8 rounded-full text-white flex items-center justify-center text-sm font-bold"
        style={{ background: "#07185d" }}
      >
        {item.step}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#0f172a]">{item.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
          {item.objective}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────────────────────────
export function CockpitEjecutivo({
  data,
  onRefresh,
  isLoading = false,
}: {
  data: DashboardData;
  onRefresh?: () => void;
  isLoading?: boolean;
}) {
  const generated = new Date(data.generatedAt);
  return (
    <div className="space-y-6" style={{ color: "#0f172a", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
            <Sparkles className="h-4 w-4" />
            Análisis generado con IA sobre datos visibles del sistema
          </div>
          <h1 className="text-3xl font-bold text-[#0f172a] mt-1">
            Cockpit Ejecutivo GCX
          </h1>
          <p className="text-sm text-slate-500">
            Resumen directivo de cobranza, cartera, financiamiento, garantías y facturación.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#07185d] text-white text-sm font-medium rounded-lg hover:bg-[#0a2375] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Actualizando...' : 'Actualizar datos'}
            </button>
          )}
          <div
            className="bg-white px-5 py-3 border border-slate-100"
            style={card}
          >
            <p className="text-xs font-semibold text-slate-500">Corte visual analizado</p>
            <p className="text-sm font-medium text-[#0f172a]">{data.cutoffLabel}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Generado: {generated.toLocaleString("es-MX")}
            </p>
          </div>
        </div>
      </div>

      {/* KPI grid (3 cols x 2 rows) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Traffic light row + AI priority insight */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white border border-slate-100 p-6" style={card}>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-[#07185d]" />
            <h3 className="text-base font-semibold text-[#0f172a]">
              Semáforo Ejecutivo de Riesgo
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Priorización sugerida por IA para Dirección General.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {data.trafficLights.map((tl) => (
              <TrafficLightBlock key={tl.title} light={tl} />
            ))}
          </div>
        </div>
        <div
          className="p-6 text-white"
          style={{ ...card, background: "#0f172a" }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-300">
            <Sparkles className="h-4 w-4" />
            Insight IA prioritario
          </div>
          <p className="text-lg font-semibold mt-3 leading-snug">
            {data.priorityInsight.title}
          </p>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            {data.priorityInsight.text}
          </p>
        </div>
      </div>

      {/* Ranking + Calidad de datos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RankingTable rows={data.ranking} />
        </div>
        <div className="bg-white border border-slate-100 p-6" style={card}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-[#07185d]" />
            <h3 className="text-base font-semibold text-[#0f172a]">
              Calidad de datos
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Puntos que Dirección debe revisar antes de tomar decisiones definitivas.
          </p>
          <div className="space-y-3">
            {data.dataQuality.map((d) => {
              const t = toneStyles(d.tone);
              return (
                <div
                  key={d.title}
                  className={`p-3 border ${t.border} ${t.softBg}`}
                  style={{ borderRadius: 14 }}
                >
                  <p className="text-sm font-semibold text-[#0f172a]">{d.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {d.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Insights + Action plan */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white border border-slate-100 p-6" style={card}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-[#07185d]" />
            <h3 className="text-base font-semibold text-[#0f172a]">
              Insights IA para Dirección
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Lecturas ejecutivas basadas en los datos visibles del sistema.
          </p>
          <div className="space-y-3">
            {data.insights.map((i) => (
              <InsightCard key={i.title} insight={i} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6" style={card}>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-[#07185d]" />
            <h3 className="text-base font-semibold text-[#0f172a]">
              Plan de acción sugerido
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Acciones ejecutivas recomendadas para las próximas dos semanas.
          </p>
          <div className="space-y-4">
            {data.actionPlan.map((a) => (
              <ActionItem key={a.step} item={a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CockpitEjecutivo;
