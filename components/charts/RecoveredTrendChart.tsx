// components/charts/RecoveredTrendChart.tsx
// Gráfica de Tendencia de Garantías Recuperadas
// Similar a Tendencia de Cobranza pero para garantías recuperadas

'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ShieldCheck, TrendingDown } from 'lucide-react';
import { RecoveredTrendData } from '@/types/dashboard';
import { formatCurrency, formatNumber, formatMonthNameShort } from '@/lib/utils/formatters';
import { trendSeriesColors, chartAxisColors } from '@/lib/utils/colors';

interface RecoveredTrendChartProps {
  data: RecoveredTrendData;
  year: number;
  className?: string;
}

interface ChartDataPoint {
  month: number;
  monthName: string;
  currentYear: number;
  previousYear: number;
}

export function RecoveredTrendChart({ data, year, className }: RecoveredTrendChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Transform data for Recharts
  const chartData: ChartDataPoint[] = data.currentYear.map((current) => {
    const previous = data.previousYear.find(p => p.month === current.month);
    return {
      month: current.month,
      monthName: formatMonthNameShort(current.month),
      currentYear: current.amount,
      previousYear: previous?.amount || 0,
    };
  });

  // Calculate totals and trends
  const currentYearTotal = data.currentYear.reduce((sum, m) => sum + m.amount, 0);
  const previousYearTotal = data.previousYear.reduce((sum, m) => sum + m.amount, 0);
  const percentageChange = previousYearTotal > 0 
    ? ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100 
    : 0;
  const isPositiveTrend = percentageChange >= 0;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const current = payload.find(p => p.dataKey === 'currentYear');
      const previous = payload.find(p => p.dataKey === 'previousYear');
      const monthIndex = chartData.findIndex(d => d.monthName === label) + 1;

      return (
        <div className="bg-surface-container-highest border border-outline-variant rounded-lg p-3 shadow-elevation-2">
          <p className="text-title-small text-on-surface mb-2">
            {formatMonthNameShort(monthIndex)} {year}
          </p>
          {current && (
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: trendSeriesColors.recuperadasActual }}
              />
              <span className="text-body-medium text-on-surface-variant">
                Año Actual:
              </span>
              <span className="text-body-medium text-on-surface font-medium">
                {formatCurrency(Number(current.value))}
              </span>
            </div>
          )}
          {previous && (
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: trendSeriesColors.recuperadasAnterior }}
              />
              <span className="text-body-medium text-on-surface-variant">
                Año Anterior:
              </span>
              <span className="text-body-medium text-on-surface font-medium">
                {formatCurrency(Number(previous.value))}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Find best month
  const bestMonth = data.currentYear.reduce((best, current) => 
    current.amount > best.amount ? current : best, 
    data.currentYear[0] || { monthName: 'N/A', amount: 0 }
  );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-100">
            <ShieldCheck className="w-5 h-5 text-purple-700" />
          </div>
          <CardTitle className="text-base sm:text-title-large text-on-surface">
            Tendencia Garantías Recuperadas — {year}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {isPositiveTrend ? (
            <TrendingUp className="w-5 h-5 text-green-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-600" />
          )}
          <span className={`text-title-medium font-semibold ${
            isPositiveTrend ? 'text-green-600' : 'text-red-600'
          }`}>
            {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              onMouseMove={(state) => {
                if (state.activeTooltipIndex !== undefined) {
                  setHoveredMonth(state.activeTooltipIndex + 1);
                }
              }}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              <CartesianGrid 
                strokeDasharray="4 4" 
                stroke={chartAxisColors.grid}
                vertical={false}
              />
              <XAxis 
                dataKey="monthName"
                axisLine={{ stroke: chartAxisColors.axis }}
                tickLine={{ stroke: chartAxisColors.axis }}
                tick={{ fill: chartAxisColors.tick, fontSize: 12 }}
              />
              <YAxis 
                axisLine={{ stroke: chartAxisColors.axis }}
                tickLine={{ stroke: chartAxisColors.axis }}
                tick={{ fill: chartAxisColors.tick, fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top"
                iconType="line"
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="currentYear"
                name={`${year}`}
                stroke={trendSeriesColors.recuperadasActual}
                strokeWidth={2}
                dot={{ fill: trendSeriesColors.recuperadasActual, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              {data.previousYear.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="previousYear"
                  name={`${year - 1}`}
                  stroke={trendSeriesColors.recuperadasAnterior}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: trendSeriesColors.recuperadasAnterior, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-outline-variant">
          <div className="text-center">
            <p className="text-label-medium text-on-surface-variant">Total Año Actual</p>
            <p className="text-title-medium text-on-surface font-semibold">
              {formatCurrency(currentYearTotal)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-label-medium text-on-surface-variant">Promedio Mensual</p>
            <p className="text-title-medium text-on-surface font-semibold">
              {formatCurrency(currentYearTotal / Math.max(data.currentYear.length, 1))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-label-medium text-on-surface-variant">Mejor Mes</p>
            <p className="text-title-medium text-on-surface font-semibold">
              {bestMonth.monthName}
            </p>
            <p className="text-body-small text-on-surface-variant">
              {formatCurrency(bestMonth.amount)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-label-medium text-on-surface-variant">Total Año Anterior</p>
            <p className="text-title-medium text-on-surface font-semibold">
              {formatCurrency(previousYearTotal)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
