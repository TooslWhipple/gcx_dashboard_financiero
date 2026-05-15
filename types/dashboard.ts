// types/dashboard.ts
// TypeScript definitions for GCX Financial Dashboard
// Based on User Stories US-001 through US-008

// ============================================
// US-001: Tendencia Cobrado
// ============================================
export interface CollectionTrendData {
  currentYear: MonthlyCollectionData[];
  previousYear: MonthlyCollectionData[];
}

export interface MonthlyCollectionData {
  month: number;
  monthName: string;
  totalCollected: number;
  invoiceCount: number;
  year: number;
}

// ============================================
// US-002: Antigüedad Cartera
// ============================================
export type AgingRange = 'Vigente' | '1-30' | '31-60' | '61-90' | '91-120' | '121-5000';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AgingData {
  chartData: AgingBucket[];
  tableData: AgingDetail[];
  summary: AgingSummary;
}

export interface AgingBucket {
  range: AgingRange;
  amount: number;
  percentage: number;
  color: string;
  riskLevel: RiskLevel;
}

export interface AgingDetail {
  clientName: string;
  rfc: string;
  vigente: number;
  range1to30: number;
  range31to60: number;
  range61to90: number;
  range91to120: number;
  range121plus: number;
  total: number;
  branch: string;
}

export interface AgingSummary {
  totalAmount: number;
  totalClients: number;
  averageDays: number;
}

// ============================================
// US-003: Tendencia Cartera CXC
// ============================================
export interface PortfolioTrendData {
  months: MonthPortfolioData[];
  tableData: PortfolioDetail[];
}

export interface MonthPortfolioData {
  month: number;
  monthName: string;
  overdue: number;
  onTime: number;
  total: number;
  overduePercentage: number;
}

export interface PortfolioDetail {
  clientName: string;
  rfc: string;
  onTime: number;
  overdue: number;
  total: number;
  month: number;
}

// ============================================
// US-004: Financiamiento
// ============================================
export interface FinancingTrendData {
  months: MonthFinancingData[];
  tableData: FinancingDetail[];
  filters: {
    offices: Office[];
    units: Unit[];
  };
}

export interface MonthFinancingData {
  month: number;
  monthName: string;
  pendingInvoice: number; // FinanciadoPTE - Por facturar
  invoiced: number;       // FinanciadoFAC - Facturado
  paymentsMade: number;   // Pagos Hechos
  total: number;
}

export interface FinancingDetail {
  unit: string;
  office: string;
  pendingInvoice: number;
  invoiced: number;
  month: number;
}

export interface Office {
  id: string;
  name: string;
}

export interface Unit {
  id: string;
  name: string;
}

// ============================================
// US-005: Estatus Garantías
// ============================================
export type GuaranteeStatus = 'Programadas' | 'Naviera' | 'Operación' | 'Recuperadas';

export interface GuaranteeStatusData {
  // Resumen total por estatus
  summary: GuaranteeStatusSummary[];
  // Tabla por semana: cada entrada es una semana con montos por estatus
  weeks: WeekGuaranteeData[];
  // Para la gráfica de barras apiladas
  chartData: WeekGuaranteeData[];
}

export interface GuaranteeStatusSummary {
  status: GuaranteeStatus;
  amount: number;
  percentage: number;
}

export interface WeekGuaranteeData {
  weekNumber: number;   // Número de semana del año (DATEPART WEEK)
  weekLabel: string;    // 'Sem.21', 'Sem.22', etc.
  scheduled: number;    // Programadas
  naviera: number;      // Naviera
  operation: number;    // Operación
  recovered: number;    // Recuperadas
  total: number;
}

// Mantener compatibilidad con hook anterior
export interface MonthGuaranteeData {
  month: number;
  monthName: string;
  scheduled: number;
  naviera: number;
  operation: number;
  recovered: number;
  total: number;
}

export interface GuaranteeStatusDetail {
  status: GuaranteeStatus;
  amount: number;
  month: number;
  monthName: string;
}

export interface RecoveredTrendData {
  data: {
    month: number;
    monthName: string;
    amount: number;
  }[];
}

// ============================================
// US-006: Resumen Corporativo por Oficina
// ============================================
export interface OfficeSummaryData {
  offices: OfficeSummary[];
  totals: OfficeSummary;
}

export interface OfficeSummary {
  id: string;
  name: string;
  invoiceCount: number;
  range01to30: number;
  range31to45: number;
  range46to60: number;
  range61to90: number;
  range91to120: number;
  range121plus: number;
  total: number;
  dacBalance: number;
  clientBalance: number;
  collected: number;
  overdue: number;
}

// ============================================
// US-007: Facturación DAC
// ============================================
export interface BillingData {
  aduanas: AduanaBilling[];
  months: string[];
}

export interface AduanaBilling {
  id: string;
  name: string;
  monthlyData: MonthBillingData[];
  average: number;
  totalHonorarios: number;
  totalOtros: number;
}

export interface MonthBillingData {
  month: number;
  monthName: string;
  honorarios: number;     // Honorarios (azul, parte inferior de gráfica)
  otros: number;          // OtrosIngresos / Complementarios (naranja, parte superior)
  total: number;          // Honorarios + OtrosIngresos
  pagosHechos?: number;   // PagosHechos del SP mensual
  anticipos?: number;     // Anticipos del SP mensual
  totalCGA?: number;      // TotalCGA del SP mensual
}

// ============================================
// US-008: Tendencia Cartera Garantías (semanal, umbral 45 días)
// ============================================
export interface GuaranteeTrendData {
  weeks: WeekGuaranteeTrend[];
  tableData: GuaranteeTrendDetail[];
  overdueThreshold: number; // 45 días
}

export interface WeekGuaranteeTrend {
  weekNumber: number;
  weekLabel: string;           // 'Sem.1', 'Sem.2', ...
  date: string;                // fecha de corte (viernes)
  garantiasEnProceso: number;  // En tiempo (≤45 días)
  programado: number;          // Total cartera
  overdue: number;             // Vencido (>45 días)
  total: number;
  overduePercentage: number;
}

export interface GuaranteeTrendDetail {
  providerName: string;
  onTime: number;
  overdue: number;
  total: number;
  branch: string;
  weekLabel: string;
}

// ============================================
// API Request/Response Types
// ============================================
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface CollectionTrendParams {
  year: number;
  idEmpresa: number;
}

export interface AgingParams {
  fechaCorte: string;
  idEmpresa: number;
}

export interface PortfolioTrendParams {
  year: number;
  idEmpresa: number;
}

export interface FinancingTrendParams {
  year: number;
  idEmpresa: number;
  officeId?: string;
}

export interface GuaranteeStatusParams {
  year: number;
  idEmpresa: number;
}

export interface OfficeSummaryParams {
  fechaCorte: string;
  idEmpresa?: number;
}

export interface BillingParams {
  year: number;
  aduanaId?: string;
}

export interface GuaranteeTrendParams {
  year: number;
  idEmpresa: number;
}

// ============================================
// Chart & UI Types
// ============================================
export interface ChartConfig {
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  colors?: string[];
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'percentage' | 'number' | 'date' | 'none';
  width?: string;
}

export interface FilterOption {
  id: string;
  label: string;
  value: string;
}
export interface RecoveredTrendData {
  currentYear: { month: number, monthName: string, amount: number }[];
  previousYear: { month: number, monthName: string, amount: number }[];
}
