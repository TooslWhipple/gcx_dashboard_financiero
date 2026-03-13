'use client';

// components/charts/PortfolioTrendChart.tsx
// US-003: Tendencia Cartera CXC (Vencido vs Corriente)
// Material Design 3 Stacked Bar Chart implementation

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PortfolioTrendData, MonthPortfolioData } from '@/types/dashboard';
import { formatCurrency, formatPercentage, formatMonthNameShort } from '@/lib/utils/formatters';
import { trendSeriesColors, chartAxisColors } from '@/lib/utils/colors';
import { DataTable } from '@/components/tables/DataTable';

interface PortfolioTrendChartProps {
  data: PortfolioTrendData;
  title?: string;
  className?: string;
}

interface ChartDataPoint {
  month: number;
  monthName: string;
  overdue: number;
  onTime: number;
  total: number;
  overduePercentage: number;
}

export function PortfolioTrendChart({
  data,
  title = 'Tendencia de la Cartera CXC',
  className,
}: PortfolioTrendChartProps) {
  const [showTable, setShowTable] = useState(false);

  // Transform data for Recharts
  const chartData: ChartDataPoint[] = data.months.map((month) => ({
    month: month.month,
    monthName: formatMonthNameShort(month.month),
    overdue: month.overdue,
    onTime: month.onTime,
    total: month.total,
    overduePercentage: month.overduePercentage,
  }));

  // Calculate summary metrics
  const latestMonth = data.months[data.months.length - 1];
  const totalPortfolio = data.months.reduce((sum, m) => sum + m.total, 0);
  const totalOverdue = data.months.reduce((sum, m) => sum + m.overdue, 0);
  const avgOverduePercentage = totalPortfolio > 0 ? (totalOverdue / totalPortfolio) * 100 : 0;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const overdue = payload.find(p => p.dataKey === 'overdue');
      const onTime = payload.find(p => p.dataKey === 'onTime');
      const monthIndex = chartData.findIndex(d => d.monthName === label) + 1;
      const monthData = data.months.find(m => m.month === monthIndex);

      return (
        <div className="bg-surface-container-highest border border-outline-variant rounded-lg p-3 shadow-elevation-2 min-w-[200px]">
          <p className="text-title-small text-on-surface mb-2">
            {formatMonthNameShort(monthIndex)}
          </p>
          {onTime && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: trendSeriesColors.corriente }} />
              <span className="text-body-medium text-on-surface-variant">Corriente:</span>
              <span className="text-body-medium text-on-surface font-medium">
                {formatCurrency(Number(onTime.value))}
              </span>
            </div>
          )}
          {overdue && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: trendSeriesColors.vencido }} />
              <span className="text-body-medium text-on-surface-variant">Vencido:</span>
              <span className="text-body-medium text-on-surface font-medium">
                {formatCurrency(Number(overdue.value))}
              </span>
            </div>
          )}
          <div className="border-t border-outline-variant mt-2 pt-2">
            <div className="flex justify-between">
              <span className="text-body-medium text-on-surface-variant">Total:</span>
              <span className="text-body-medium text-on-surface font-semibold">
                {formatCurrency(monthData?.total || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-medium text-on-surface-variant">% Vencido:</span>
              <span className={`text-body-medium font-semibold ${
                (monthData?.overduePercentage || 0) > 20 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatPercentage(monthData?.overduePercentage || 0)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Table columns
  const columns = [
    { key: 'clientName', label: 'Cliente', sortable: true, width: '35%' },
    { key: 'rfc', label: 'RFC', sortable: true, width: '20%' },
    { key: 'onTime', label: 'Corriente', sortable: true, align: 'right' as const, format: 'currency' as const, width: '15%' },
    { key: 'overdue', label: 'Vencido', sortable: true, align: 'right' as const, format: 'currency' as const, width: '15%' },
    { key: 'total', label: 'Total', sortable: true, align: 'right' as const, format: 'currency' as const, width: '15%' },
  ];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <CardTitle className="text-title-large text-on-surface">
            {title}
          </CardTitle>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-label-medium text-on-surface-variant">Cartera Total (Promedio)</p>
            <p className="text-headline-small text-on-surface font-semibold">
              {formatCurrency(totalPortfolio / 12)}
            </p>
          </div>
          <div className="relative group">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full cursor-help ${
              avgOverduePercentage > 20 ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {avgOverduePercentage > 20 ? (
                <AlertCircle className="w-4 h-4 text-red-700" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-700" />
              )}
              <span className={`text-label-medium font-medium ${
                avgOverduePercentage > 20 ? 'text-red-700' : 'text-green-700'
              }`}>
                {avgOverduePercentage.toFixed(1)}% Vencido
              </span>
            </div>
            <div className="absolute right-0 top-full mt-2 w-72 bg-surface-container-highest border border-outline-variant rounded-lg p-3 shadow-elevation-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <p className="text-body-small text-on-surface font-medium mb-1">
                {avgOverduePercentage > 20 ? '⚠️ Cartera en riesgo' : '✅ Cartera saludable'}
              </p>
              <p className="text-body-small text-on-surface-variant">
                Del total de la cartera, el{' '}
                <span className={`font-semibold ${avgOverduePercentage > 20 ? 'text-red-700' : 'text-green-700'}`}>
                  {avgOverduePercentage.toFixed(1)}%
                </span>{' '}
                corresponde a saldo vencido ({formatCurrency(totalOverdue)}) de un total de {formatCurrency(totalPortfolio)}.
                {avgOverduePercentage > 20
                  ? ' Se recomienda revisar las cuentas con mayor antigüedad.'
                  : ' La cartera se encuentra dentro de parámetros aceptables.'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {/* Leyenda de colores */}
        <div className="flex flex-wrap gap-3 px-3 sm:px-6 pt-2 mb-2 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: trendSeriesColors.corriente }} />
            Azul: Corriente (parte inferior)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: trendSeriesColors.vencido }} />
            Amarillo: Vencido (parte superior)
          </span>
          <span className="text-muted-foreground">Periodicidad: Mensual</span>
        </div>

        {/* Layout: Tabla mensual + Gráfica apilada lado a lado */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-2 sm:px-4">

          {/* Tabla mensual */}
          <div className="overflow-x-auto rounded-lg border border-outline-variant min-w-0">
            <table className="w-full min-w-[380px] text-xs sm:text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-semibold sticky left-0 bg-blue-700 z-10">Mes</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold whitespace-nowrap">Corriente</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold whitespace-nowrap">Vencido</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold whitespace-nowrap">Total</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {data.months.map((m) => (
                  <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-blue-700 sticky left-0 bg-white z-10 whitespace-nowrap">
                      {m.monthName}
                    </td>
                    <td className="px-3 py-1.5 sm:px-4 sm:py-2 text-right font-mono whitespace-nowrap text-blue-700">
                      {m.onTime > 0 ? formatCurrency(m.onTime) : '—'}
                    </td>
                    <td className="px-3 py-1.5 sm:px-4 sm:py-2 text-right font-mono whitespace-nowrap text-red-600">
                      {m.overdue > 0 ? formatCurrency(m.overdue) : '—'}
                    </td>
                    <td className="px-3 py-1.5 sm:px-4 sm:py-2 text-right font-mono font-semibold whitespace-nowrap">
                      {m.total > 0 ? formatCurrency(m.total) : '—'}
                    </td>
                    <td className={`px-3 py-1.5 sm:px-4 sm:py-2 text-right font-bold ${
                      m.overduePercentage > 20 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {m.total > 0 ? `${m.overduePercentage.toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                ))}
                {/* Fila totales */}
                <tr className="bg-blue-50 font-bold border-t-2 border-blue-300">
                  <td className="px-3 py-2 sm:px-4 sticky left-0 bg-blue-50 z-10">Total</td>
                  <td className="px-3 py-2 sm:px-4 text-right font-mono text-blue-700 whitespace-nowrap">{formatCurrency(totalPortfolio - totalOverdue)}</td>
                  <td className="px-3 py-2 sm:px-4 text-right font-mono text-red-600 whitespace-nowrap">{formatCurrency(totalOverdue)}</td>
                  <td className="px-3 py-2 sm:px-4 text-right font-mono whitespace-nowrap">{formatCurrency(totalPortfolio)}</td>
                  <td className={`px-3 py-2 sm:px-4 text-right font-bold ${
                    avgOverduePercentage > 20 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {avgOverduePercentage.toFixed(0)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Gráfica apilada */}
          <div className="h-[260px] sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 8, left: 0, bottom: 20 }}
              >
                <CartesianGrid 
                  strokeDasharray="4 4" 
                  stroke={chartAxisColors.grid}
                  vertical={false}
                />
                <XAxis 
                  dataKey="monthName"
                  axisLine={{ stroke: chartAxisColors.axis }}
                  tickLine={false}
                  tick={{ fill: chartAxisColors.tick, fontSize: 10 }}
                />
                <YAxis 
                  axisLine={{ stroke: chartAxisColors.axis }}
                  tickLine={false}
                  tick={{ fill: chartAxisColors.tick, fontSize: 10 }}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                  width={38}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top"
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: '11px', paddingBottom: 6 }}
                />
                <Bar
                  dataKey="onTime"
                  name="Corriente"
                  stackId="portfolio"
                  fill={trendSeriesColors.corriente}
                  radius={[0, 0, 3, 3]}
                />
                <Bar
                  dataKey="overdue"
                  name="Vencido"
                  stackId="portfolio"
                  fill={trendSeriesColors.vencido}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Toggle Table Button - Detalle por cliente */}
        <div className="mt-4 pt-4 border-t border-outline-variant mx-2 sm:mx-4">
          <button
            onClick={() => setShowTable(!showTable)}
            className="px-4 py-2 bg-primary-container text-on-primary-container rounded-full text-xs sm:text-sm font-medium hover:bg-primary-container/80 transition-colors"
          >
            {showTable ? 'Ocultar Detalle' : 'Ver Detalle por Cliente'}
          </button>

          {/* Detail Table */}
          {showTable && (
            <div className="mt-4">
              <DataTable
                data={data.tableData.slice(0, 100)}
                columns={columns}
                title="Detalle de Cartera por Cliente"
                sortable
                defaultSortColumn="total"
                defaultSortDirection="desc"
                maxHeight="400px"
              />
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-outline-variant mx-2 sm:mx-4">
          <div className="text-center p-3 rounded-lg bg-blue-50">
            <p className="text-xs sm:text-label-medium text-blue-700">Total Corriente</p>
            <p className="text-sm sm:text-title-medium text-blue-900 font-semibold">
              {formatCurrency(totalPortfolio - totalOverdue)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50">
            <p className="text-xs sm:text-label-medium text-red-700">Total Vencido</p>
            <p className="text-sm sm:text-title-medium text-red-900 font-semibold">
              {formatCurrency(totalOverdue)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <p className="text-xs sm:text-label-medium text-gray-600">Cartera Último Mes</p>
            <p className="text-sm sm:text-title-medium text-gray-900 font-semibold">
              {formatCurrency(latestMonth?.total || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
