// lib/cockpit/mock.ts
// Mock service that strictly conforms to the SDD contract defined in
// `lib/cockpit/contract.ts`. Used as fallback whenever the real
// aggregator endpoint cannot reach Redis / RECO.

import type { DashboardData } from './contract';

export const mockDashboardData: DashboardData = {
  generatedAt: new Date().toISOString(),
  cutoffLabel: 'Datos observados en pantalla 2026',
  kpis: [
    {
      label: 'Cartera total por oficina',
      value: '$259.17M',
      status: '26.3% vencido',
      tone: 'red',
      detail: '$68.08M vencidos visibles en el ranking de oficinas.',
    },
    {
      label: 'Cartera vencida',
      value: '$68.08M',
      status: 'Crítico',
      tone: 'red',
      detail: 'Riesgo concentrado en Manzanillo, Tampico y Veracruz.',
    },
    {
      label: 'Cobranza vs año anterior',
      value: '-67.1%',
      status: 'Validar datos',
      tone: 'orange',
      detail: 'La caída después de abril requiere confirmar si es dato incompleto o caída real.',
    },
    {
      label: 'Financiamiento facturado',
      value: '63.9%',
      status: 'Oportunidad',
      tone: 'orange',
      detail: '$4,195M facturados vs $2,368M por facturar.',
    },
    {
      label: 'Garantías vencidas',
      value: '29.1%',
      status: 'Atención',
      tone: 'orange',
      detail: '$82.0M vencidos y $199.9M en proceso en vista semanal.',
    },
    {
      label: 'Facturación total DAC',
      value: '$419.54M',
      status: 'Estable',
      tone: 'green',
      detail: '$93.1M honorarios y $326.4M resto facturación.',
    },
  ],
  trafficLights: [
    {
      tone: 'red',
      label: 'ROJO – Acción inmediata',
      title: 'Cartera vencida',
      text: '$68.08M vencidos en oficinas y concentración crítica en Manzanillo y Tampico.',
    },
    {
      tone: 'orange',
      label: 'ÁMBAR – Validar y corregir',
      title: 'Cobranza 2026',
      text: 'La caída de -67.1% requiere distinguir dato incompleto vs caída real.',
    },
    {
      tone: 'green',
      label: 'VERDE – Base operativa',
      title: 'Facturación visible',
      text: '$419.54M facturado DAC, con segmentación entre honorarios y resto.',
    },
  ],
  priorityInsight: {
    title: 'Atacar cartera vencida por oficina antes de revisar nuevas iniciativas.',
    text: 'La información apunta a que el mayor retorno inmediato está en recuperación, depuración de datos y asignación de responsables.',
    tone: 'blue',
  },
  ranking: [
    { office: 'DAC – Manzanillo',   total: 67_000_000,  overdue: 22_600_000, status: 'Crítico', tone: 'red' },
    { office: 'DAC – Tampico',      total: 54_800_000,  overdue: 14_500_000, status: 'Crítico', tone: 'red' },
    { office: 'DAC – Veracruz',     total: 45_900_000,  overdue: 10_900_000, status: 'Alto',    tone: 'orange' },
    { office: 'DAC – CDMX',         total: 28_400_000,  overdue:  7_400_000, status: 'Alto',    tone: 'orange' },
    { office: 'DAC – Nuevo Laredo', total: 18_500_000,  overdue:  5_200_000, status: 'Medio',   tone: 'blue' },
  ],
  dataQuality: [
    {
      title: 'Cobranzas mayo–diciembre',
      text: 'La gráfica muestra valores en cero después de abril. Requiere confirmar carga y fuente.',
      tone: 'orange',
    },
    {
      title: 'RECO / Excel / Compaq',
      text: 'El cruce del sistema está en construcción: fuentes y siguiente paso son definir reglas de conciliación.',
      tone: 'blue',
    },
    {
      title: 'Responsables por indicador',
      text: 'Cada KPI crítico debe tener dueño, frecuencia de actualización y regla de acción.',
      tone: 'blue',
    },
  ],
  insights: [
    {
      title: 'La cartera vencida debe gestionarse por oficina.',
      text: 'Manzanillo, Tampico y Veracruz concentran los montos vencidos más relevantes visibles. Se recomienda un comité semanal de recuperación por oficina.',
      tone: 'red',
    },
    {
      title: 'La caída de cobranza requiere validación inmediata.',
      text: 'La gráfica muestra una caída de -67.1% vs año anterior. Dirección debe confirmar si es dato incompleto o una caída real de cobranza.',
      tone: 'orange',
    },
    {
      title: 'El financiamiento tiene un gap relevante por convertir.',
      text: 'El sistema muestra $2,368M por facturar. Esto indica exposición y eficiencia de conversión a riesgo de flujo.',
      tone: 'orange',
    },
    {
      title: 'Garantías vencidas representan dinero atorado.',
      text: 'Casi un tercio de la cartera de garantías aparece vencida. Convertir el proceso en programadas / en proceso / recuperadas con responsable por etapa.',
      tone: 'orange',
    },
  ],
  actionPlan: [
    { step: 1, title: 'Validar integridad de datos de cobranza de mayo a diciembre.', objective: 'Objetivo: descartar problemas de carga vs caída real.' },
    { step: 2, title: 'Crear comité semanal de cartera crítica por oficina.',         objective: 'Objetivo: aplicar criterios homologados con agenda de recuperación con seguimiento semanal.' },
    { step: 3, title: 'Asignar responsables por KPI crítico, fuente de datos y frecuencia de actualización.', objective: 'Objetivo: cada KPI tiene dueño, fuente de información y rito.' },
    { step: 4, title: 'Preparar Fase 2 con IA para alertas, explicación de variaciones e insights automáticos.', objective: 'Objetivo: evolucionar el dashboard descriptivo a insights accionables.' },
  ],
};
