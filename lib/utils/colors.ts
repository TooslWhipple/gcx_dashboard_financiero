// lib/utils/colors.ts
// Material Design 3 color system and chart palettes for GCX Dashboard

import { AgingRange, RiskLevel } from '@/types/dashboard';

// ============================================
// Material Design 3 Chart Palette
// ============================================
export const chartColors = {
  // Primary palette
  primary: '#6750A4',
  primaryLight: '#EADDFF',
  primaryDark: '#21005D',
  
  // Secondary palette
  secondary: '#625B71',
  secondaryLight: '#E8DEF8',
  secondaryDark: '#1D192B',
  
  // Tertiary palette
  tertiary: '#7D5260',
  
  // Semantic colors
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  info: '#2196F3',
  
  // Extended palette for charts
  purple: '#9C27B0',
  teal: '#009688',
  amber: '#FFC107',
  orange: '#FF9800',
  deepOrange: '#FF5722',
  indigo: '#3F51B5',
  pink: '#E91E63',
  cyan: '#00BCD4',
  lime: '#CDDC39',
  
  // Grayscale
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
};

// ============================================
// Aging Risk Colors (US-002)
// ============================================
export const agingRiskColors: Record<AgingRange, { fill: string; text: string; risk: RiskLevel; label: string }> = {
  '1-30': {
    fill: '#4CAF50',      // Green-500
    text: '#1B5E20',      // Green-900
    risk: 'low',
    label: '1-30 días',
  },
  '31-60': {
    fill: '#FF9800',      // Orange-500
    text: '#E65100',      // Orange-900
    risk: 'medium',
    label: '31-60 días',
  },
  '61-90': {
    fill: '#FF5722',      // Deep Orange
    text: '#BF360C',      // Deep Orange-900
    risk: 'high',
    label: '61-90 días',
  },
  '91-120': {
    fill: '#F44336',      // Red-500
    text: '#B71C1C',      // Red-900
    risk: 'critical',
    label: '91-120 días',
  },
  '121-5000': {
    fill: '#B71C1C',      // Red-900
    text: '#7F0000',      // Red darkest
    risk: 'critical',
    label: '121+ días',
  },
};

// ============================================
// Trend Chart Series Colors
// ============================================
export const trendSeriesColors = {
  // US-001: Tendencia Cobrado
  currentYear: '#6750A4',     // Primary
  previousYear: '#958DA5',    // Secondary-light
  
  // US-003: Tendencia CXC (Vencido vs Corriente)
  vencido: '#FFC107',         // Yellow-500 (para gráfica)
  corriente: '#2196F3',       // Blue-500
  
  // US-006: Tendencia Garantías Recuperadas
  recuperadasActual: '#9C27B0',  // Purple-500 (año actual)
  recuperadasAnterior: '#958DA5', // Purple-200 (año anterior)
  
  // US-004: Financiamiento
  porFacturar: '#1565C0',     // Blue-800 (mismo tono que Vencido)
  facturado: '#FF9800',       // Orange-500 (mismo tono que En Tiempo)
  
  // US-007: Facturación
  honorarios: '#2196F3',      // Blue-500
  otros: '#424242',           // Gray-800
};

// ============================================
// Guarantee Status Colors (US-005)
// ============================================
export const guaranteeStatusColors = {
  Programadas: {
    fill: '#E8F4FD',          // Blue-50
    text: '#1565C0',          // Blue-700
    border: '#2196F3',        // Blue-500
  },
  Naviera: {
    fill: '#FFF3E0',          // Orange-50
    text: '#EF6C00',          // Orange-700
    border: '#FF9800',        // Orange-500
  },
  Operación: {
    fill: '#E8F5E9',          // Green-50
    text: '#2E7D32',          // Green-700
    border: '#4CAF50',        // Green-500
  },
  Recuperadas: {
    fill: '#F3E5F5',          // Purple-50
    text: '#7B1FA2',          // Purple-700
    border: '#9C27B0',        // Purple-500
  },
};

// ============================================
// Office Summary Table Colors
// ============================================
export const officeSummaryColors = {
  header: {
    background: '#E7E0EC',    // Surface-variant
    text: '#49454F',          // On-surface-variant
  },
  row: {
    hover: '#F3EDF7',         // Surface-container
    selected: '#EADDFF',      // Primary-container
    critical: '#F9DEDC',      // Error-container for high overdue
  },
  text: {
    primary: '#1D1B20',       // On-surface
    secondary: '#49454F',     // On-surface-variant
    muted: '#79747E',         // Outline
  },
};

// ============================================
// Chart Axis & Grid Colors (Material Design 3)
// ============================================
export const chartAxisColors = {
  grid: '#E7E0EC',            // Outline-variant
  axis: '#79747E',            // Outline
  tick: '#49454F',            // On-surface-variant
  label: '#1D1B20',           // On-surface
};

// ============================================
// Tooltip Colors
// ============================================
export const tooltipColors = {
  background: '#F3EDF7',      // Surface-container-highest
  text: '#1D1B20',            // On-surface
  border: '#E7E0EC',          // Outline-variant
};

// ============================================
// Utility Functions
// ============================================

/**
 * Get color for aging range
 */
export const getAgingColor = (range: AgingRange): string => {
  return agingRiskColors[range]?.fill || chartColors.gray500;
};

/**
 * Get risk level for aging range
 */
export const getAgingRiskLevel = (range: AgingRange): RiskLevel => {
  return agingRiskColors[range]?.risk || 'low';
};

/**
 * Get guarantee status color
 */
export const getGuaranteeStatusColor = (status: 'Programadas' | 'Naviera' | 'Operación' | 'Recuperadas') => {
  return guaranteeStatusColors[status] || guaranteeStatusColors.Programadas;
};

/**
 * Generate chart color palette based on number of items needed
 */
export const generateChartPalette = (count: number): string[] => {
  const baseColors = [
    chartColors.primary,
    chartColors.info,
    chartColors.success,
    chartColors.warning,
    chartColors.purple,
    chartColors.teal,
    chartColors.deepOrange,
    chartColors.indigo,
    chartColors.pink,
    chartColors.cyan,
  ];
  
  // If we need more colors, interpolate or repeat
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }
  
  // Repeat palette with variations if more colors needed
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(baseColors[i % baseColors.length]);
  }
  
  return result;
};

/**
 * Get contrast text color for a background color
 * Returns white for dark backgrounds, black for light backgrounds
 */
export const getContrastColor = (backgroundColor: string): string => {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

/**
 * Format color for Recharts
 */
export const toRechartsColor = (color: string): string => {
  return color;
};
