'use client';

// components/charts/CollectionTrendChart.tsx
// US-001: Tendencia Cobrado con comparativo año pasado
// Material Design 3 Line Chart implementation

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
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { CollectionTrendData, MonthlyCollectionData } from '@/types/dashboard';
import { formatCurrency, formatNumber, formatMonthNameShort } from '@/lib/utils/formatters';
import { trendSeriesColors, chartAxisColors } from '@/lib/utils/colors';

interface CollectionTrendChartProps {
  data: CollectionTrendData;
  title?: string;
  className?: string;
}

interface ChartDataPoint {
  month: number;
  monthName: string;
  currentYear: number;
  previousYear: number;
}

export function CollectionTrendChart({
  data,
  title = 'Tendencia de Cobrado',
  className,
}: CollectionTrendChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Guard: arrays vacíos → fallback
  const currentYear = data.currentYear ?? [];
  const previousYear = data.previousYear ?? [];

  // Transform data for Recharts
  const chartData: ChartDataPoint[] = currentYear.map((current, index) => {
    const previous = previousYear[index];
    return {
      month: current.month,
      monthName: formatMonthNameShort(current.month),
      currentYear: current.totalCollected,
      previousYear: previous?.totalCollected || 0,
    };
  });

  // Calculate totals and trends
  const currentYearTotal = currentYear.reduce((sum, m) => sum + m.totalCollected, 0);
  const previousYearTotal = previousYear.reduce((sum, m) => sum + m.totalCollected, 0);
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
            {formatMonthNameShort(monthIndex)} {data.currentYear[0]?.year}
          </p>
          {current && (
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: trendSeriesColors.currentYear }}
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
                style={{ backgroundColor: trendSeriesColors.previousYear }}
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

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <CardTitle className="text-title-large text-on-surface">
            {title}
          </CardTitle>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-label-medium text-on-surface-variant">
              Total Año Actual
            </p>
            <p className="text-headline-small text-on-surface font-semibold">
              {formatCurrency(currentYearTotal)}
            </p>
          </div>
          <div className="relative group">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full cursor-help ${
              isPositiveTrend ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {isPositiveTrend ? (
                <TrendingUp className="w-4 h-4 text-green-700" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-700" />
              )}
              <span className={`text-label-medium font-medium ${
                isPositiveTrend ? 'text-green-700' : 'text-red-700'
              }`}>
                {Math.abs(percentageChange).toFixed(1)}%
              </span>
            </div>
            <div className="absolute right-0 top-full mt-2 w-64 bg-surface-container-highest border border-outline-variant rounded-lg p-3 shadow-elevation-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <p className="text-body-small text-on-surface font-medium mb-1">
                {isPositiveTrend ? '📈 Incremento' : '📉 Disminución'} vs Año Anterior
              </p>
              <p className="text-body-small text-on-surface-variant">
                El cobrado del año actual ({formatCurrency(currentYearTotal)}) es{' '}
                <span className={`font-semibold ${isPositiveTrend ? 'text-green-700' : 'text-red-700'}`}>
                  {Math.abs(percentageChange).toFixed(1)}% {isPositiveTrend ? 'mayor' : 'menor'}
                </span>{' '}
                que el año anterior ({formatCurrency(previousYearTotal)}).
              </p>
            </div>
          </div>
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
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px' }}
              />
              <Line
                type="monotone"
                dataKey="currentYear"
                name="Año Actual"
                stroke={trendSeriesColors.currentYear}
                strokeWidth={3}
                dot={{ fill: trendSeriesColors.currentYear, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="previousYear"
                name="Año Anterior"
                stroke={trendSeriesColors.previousYear}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: trendSeriesColors.previousYear, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-outline-variant">
          <div className="text-center">
            <p className="text-label-medium text-on-surface-variant">Facturas Año Actual</p>
            <p className="text-title-medium text-on-surface font-semibold">
              {formatNumber(currentYear.reduce((sum, m) => sum + m.invoiceCount, 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-label-medium text-on-surface-variant">Promedio Mensual</p>
            <p className="text-title-medium text-on-surface font-semibold">
              {formatCurrency(currentYearTotal / 12)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-label-medium text-on-surface-variant">Mejor Mes</p>
            <p className="text-title-medium text-on-surface font-semibold">
              {currentYear.length > 0
                ? formatMonthNameShort(
                    currentYear.reduce((max, m) => m.totalCollected > max.totalCollected ? m : max, currentYear[0]).month
                  )
                : '—'
              }
            </p>
          </div>
          <div className="text-center">
            <p className="text-label-medium text-on-surface-variant">Facturas Año Ant.</p>
            <p className="text-title-medium text-on-surface font-semibold">
              {formatNumber(previousYear.reduce((sum, m) => sum + m.invoiceCount, 0))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
