// components/charts/FinancingTrendChart.tsx
// US-004: Tendencia Financiamiento CxC DAC
// Layout: KPI Cards + Tabla mensual + Gráfica apilada lado a lado

'use client';

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
import { Wallet, Building2, TrendingUp, DollarSign, BarChart3, Percent } from 'lucide-react';
import { FinancingTrendData, MonthFinancingData, Office, Unit } from '@/types/dashboard';
import { formatCurrency, formatMonthNameShort } from '@/lib/utils/formatters';
import { trendSeriesColors, chartAxisColors } from '@/lib/utils/colors';
import { DataTable } from '@/components/tables/DataTable';

interface FinancingTrendChartProps {
  data: FinancingTrendData;
  title?: string;
  className?: string;
  onOfficeChange?: (officeId: string) => void;
}

interface ChartDataPoint {
  month: number;
  monthName: string;
  pendingInvoice: number;
  invoiced: number;
}

export function FinancingTrendChart({
  data,
  title = 'Tendencia Financiamiento en CxC DAC',
  className,
  onOfficeChange,
}: FinancingTrendChartProps) {
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [showTable, setShowTable] = useState(false);

  // Transform data for Recharts
  const chartData: ChartDataPoint[] = data.months.map((month) => ({
    month: month.month,
    monthName: formatMonthNameShort(month.month),
    pendingInvoice: month.pendingInvoice,
    invoiced: month.invoiced,
  }));

  // Calculate summary metrics
  const totalPending = data.months.reduce((sum, m) => sum + m.pendingInvoice, 0);
  const totalInvoiced = data.months.reduce((sum, m) => sum + m.invoiced, 0);
  const totalFinancing = totalPending + totalInvoiced;
  const monthsWithData = data.months.filter(m => m.total > 0).length;
  const avgMonthly = monthsWithData > 0 ? totalFinancing / monthsWithData : 0;
  const pctInvoiced = totalFinancing > 0 ? ((totalInvoiced / totalFinancing) * 100) : 0;

  // Handle office filter change
  const handleOfficeChange = (officeId: string) => {
    setSelectedOffice(officeId);
    onOfficeChange?.(officeId);
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const pending = payload.find(p => p.dataKey === 'pendingInvoice');
      const invoiced = payload.find(p => p.dataKey === 'invoiced');
      const total = (Number(pending?.value) || 0) + (Number(invoiced?.value) || 0);
      const pct = total > 0 ? ((Number(invoiced?.value) || 0) / total * 100).toFixed(0) : '0';

      return (
        <div className="bg-surface-container-highest border border-outline-variant rounded-lg p-3 shadow-elevation-2 min-w-[200px]">
          <p className="text-title-small text-on-surface mb-2">{label}</p>
          {pending && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: trendSeriesColors.porFacturar }} />
              <span className="text-body-medium text-on-surface-variant">Por Facturar:</span>
              <span className="text-body-medium text-on-surface font-medium">
                {formatCurrency(Number(pending.value))}
              </span>
            </div>
          )}
          {invoiced && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: trendSeriesColors.facturado }} />
              <span className="text-body-medium text-on-surface-variant">Facturado:</span>
              <span className="text-body-medium text-on-surface font-medium">
                {formatCurrency(Number(invoiced.value))}
              </span>
            </div>
          )}
          <div className="border-t border-outline-variant mt-2 pt-2">
            <div className="flex justify-between">
              <span className="text-body-medium text-on-surface-variant">Total:</span>
              <span className="text-body-medium text-on-surface font-semibold">
                {formatCurrency(total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-medium text-on-surface-variant">% Facturado:</span>
              <span className="text-body-medium text-on-surface font-semibold">{pct}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Table columns for detail (agrupado por Unidad+Oficina, sin mes)
  const columns = [
    { key: 'unit', label: 'Unidad', sortable: true, width: '20%' },
    { key: 'office', label: 'Oficina', sortable: true, width: '30%' },
    { key: 'pendingInvoice', label: 'Financiado PTE', sortable: true, align: 'right' as const, format: 'currency' as const, width: '25%' },
    { key: 'invoiced', label: 'Financiado FAC', sortable: true, align: 'right' as const, format: 'currency' as const, width: '25%' },
  ];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary flex-shrink-0" />
            <CardTitle className="text-base sm:text-title-large text-on-surface">
              {title}
            </CardTitle>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5 ml-7">
            Financiamiento por facturar + financiamiento facturado · Periodicidad: Mensual
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-3 sm:px-6 mb-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Por Facturar</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-blue-900">{formatCurrency(totalPending)}</p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-orange-600 font-medium">Facturado</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-orange-900">{formatCurrency(totalInvoiced)}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Promedio Mensual</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-blue-900">{formatCurrency(avgMonthly)}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">% Facturado</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-green-900">{pctInvoiced.toFixed(1)}%</p>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 px-3 sm:px-6 mb-2 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: trendSeriesColors.porFacturar }} />
            Por Facturar (parte inferior)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: trendSeriesColors.facturado }} />
            Facturado (parte superior)
          </span>
        </div>

        {/* Layout: Tabla mensual + Gráfica apilada lado a lado */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-2 sm:px-4">

          {/* Tabla mensual */}
          <div className="overflow-x-auto rounded-lg border border-outline-variant min-w-0">
            <table className="w-full min-w-[380px] text-xs sm:text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-semibold sticky left-0 bg-blue-700 z-10">Mes</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold whitespace-nowrap">Por Facturar</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold whitespace-nowrap">Facturado</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold whitespace-nowrap">Pagos Hechos</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold whitespace-nowrap">Total</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold">% Facturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {data.months.map((m) => {
                  const monthTotal = m.pendingInvoice + m.invoiced;
                  const monthPct = monthTotal > 0 ? (m.invoiced / monthTotal * 100) : 0;
                  return (
                    <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-blue-700 sticky left-0 bg-white z-10 whitespace-nowrap">
                        {m.monthName}
                      </td>
                      <td className="px-3 py-1.5 sm:px-4 sm:py-2 text-right font-mono whitespace-nowrap text-blue-700">
                        {m.pendingInvoice > 0 ? formatCurrency(m.pendingInvoice) : '—'}
                      </td>
                      <td className="px-3 py-1.5 sm:px-4 sm:py-2 text-right font-mono whitespace-nowrap text-orange-700">
                        {m.invoiced > 0 ? formatCurrency(m.invoiced) : '—'}
                      </td>
                      <td className="px-3 py-1.5 sm:px-4 sm:py-2 text-right font-mono whitespace-nowrap text-green-700">
                        {m.paymentsMade > 0 ? formatCurrency(m.paymentsMade) : '—'}
                      </td>
                      <td className="px-3 py-1.5 sm:px-4 sm:py-2 text-right font-mono font-semibold whitespace-nowrap">
                        {monthTotal > 0 ? formatCurrency(monthTotal) : '—'}
                      </td>
                      <td className={`px-3 py-1.5 sm:px-4 sm:py-2 text-right font-bold ${
                        monthPct >= 50 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {monthTotal > 0 ? `${monthPct.toFixed(0)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
                {/* Fila totales */}
                <tr className="bg-blue-50 font-bold border-t-2 border-blue-300">
                  <td className="px-3 py-2 sm:px-4 sticky left-0 bg-blue-50 z-10">Total</td>
                  <td className="px-3 py-2 sm:px-4 text-right font-mono text-blue-700 whitespace-nowrap">{formatCurrency(totalPending)}</td>
                  <td className="px-3 py-2 sm:px-4 text-right font-mono text-orange-700 whitespace-nowrap">{formatCurrency(totalInvoiced)}</td>
                  <td className="px-3 py-2 sm:px-4 text-right font-mono text-green-700 whitespace-nowrap">
                    {formatCurrency(data.months.reduce((s, m) => s + m.paymentsMade, 0))}
                  </td>
                  <td className="px-3 py-2 sm:px-4 text-right font-mono whitespace-nowrap">{formatCurrency(totalFinancing)}</td>
                  <td className={`px-3 py-2 sm:px-4 text-right font-bold ${
                    pctInvoiced >= 50 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {pctInvoiced.toFixed(0)}%
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
                  dataKey="pendingInvoice"
                  name="Por Facturar"
                  stackId="financing"
                  fill={trendSeriesColors.porFacturar}
                  radius={[0, 0, 3, 3]}
                />
                <Bar
                  dataKey="invoiced"
                  name="Facturado"
                  stackId="financing"
                  fill={trendSeriesColors.facturado}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Toggle Table Button - Detalle por oficina */}
        <div className="mt-4 pt-4 border-t border-outline-variant mx-2 sm:mx-4">
          <button
            onClick={() => setShowTable(!showTable)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Building2 className="w-4 h-4" />
            {showTable ? 'Ocultar Detalle' : 'Ver Detalle por Oficina'}
          </button>

          {/* Detail Table */}
          {showTable && (
            <div className="mt-4">
              <DataTable
                data={data.tableData.slice(0, 100)}
                columns={columns}
                title="Detalle de Financiamiento por Oficina"
                sortable
                defaultSortColumn="pendingInvoice"
                defaultSortDirection="desc"
                maxHeight="400px"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
