'use client';

// components/charts/AgingAnalysis.tsx
// US-002: Antigüedad de Cartera con PieChart + DataTable
// Material Design 3 implementation

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertTriangle } from 'lucide-react';
import { AgingData, AgingBucket, AgingDetail, AgingRange } from '@/types/dashboard';
import { formatCurrency, formatPercentage } from '@/lib/utils/formatters';
import { agingRiskColors, getAgingColor, chartColors } from '@/lib/utils/colors';
import { DataTable } from '@/components/tables/DataTable';

interface AgingAnalysisProps {
  data: AgingData;
  title?: string;
  className?: string;
}

export function AgingAnalysis({
  data,
  title = 'Antigüedad de Cartera',
  className,
}: AgingAnalysisProps) {
  const [selectedRange, setSelectedRange] = useState<AgingRange | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Filter table data by selected range
  const filteredTableData = selectedRange
    ? data.tableData.filter((row) => {
        switch (selectedRange) {
          case '1-30':
            return row.range1to30 > 0;
          case '31-60':
            return row.range31to60 > 0;
          case '61-90':
            return row.range61to90 > 0;
          case '91-120':
            return row.range91to120 > 0;
          case '121-5000':
            return row.range121plus > 0;
          default:
            return true;
        }
      })
    : data.tableData;

  // Custom Tooltip for Pie Chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const bucket: AgingBucket = payload[0].payload;
      return (
        <div className="bg-surface-container-highest border border-outline-variant rounded-lg p-3 shadow-elevation-2">
          <p className="text-title-small text-on-surface mb-1">
            {agingRiskColors[bucket.range].label}
          </p>
          <p className="text-headline-small text-on-surface font-semibold">
            {formatCurrency(bucket.amount)}
          </p>
          <p className="text-body-medium text-on-surface-variant">
            {formatPercentage(bucket.percentage)} del total
          </p>
          <p className="text-label-small mt-1" style={{ color: bucket.color }}>
            Riesgo: {bucket.riskLevel === 'low' ? 'Bajo' : 
                    bucket.riskLevel === 'medium' ? 'Medio' : 
                    bucket.riskLevel === 'high' ? 'Alto' : 'Crítico'}
          </p>
        </div>
      );
    }
    return null;
  };

  // Columns for detail table (by client)
  const detailColumns = [
    { key: 'clientName', label: 'Cliente', sortable: true, width: '25%' },
    { key: 'rfc', label: 'RFC', sortable: true, width: '15%' },
    { key: 'range1to30', label: '1-30 días', sortable: true, align: 'right' as const, format: 'currency' as const, width: '12%' },
    { key: 'range31to60', label: '31-60 días', sortable: true, align: 'right' as const, format: 'currency' as const, width: '12%' },
    { key: 'range61to90', label: '61-90 días', sortable: true, align: 'right' as const, format: 'currency' as const, width: '12%' },
    { key: 'range91to120', label: '91-120 días', sortable: true, align: 'right' as const, format: 'currency' as const, width: '12%' },
    { key: 'range121plus', label: '121+ días', sortable: true, align: 'right' as const, format: 'currency' as const, width: '12%', cellClassName: 'bg-red-50 text-red-700 font-medium' },
    { key: 'total', label: 'Total', sortable: true, align: 'right' as const, format: 'currency' as const, width: '15%' },
  ];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary flex-shrink-0" />
          <CardTitle className="text-base sm:text-title-large text-on-surface">
            {title}
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="sm:text-right">
            <p className="text-label-medium text-on-surface-variant">Cartera Total</p>
            <p className="text-lg sm:text-headline-small text-on-surface font-semibold">
              {formatCurrency(data.summary.totalAmount)}
            </p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100">
            <AlertTriangle className="w-4 h-4 text-orange-700" />
            <span className="text-xs sm:text-label-medium font-medium text-orange-700">
              {data.summary.totalClients} clientes
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {/* Layout principal: Tabla de rangos + Pie Chart lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-3 sm:px-6 pt-2">

          {/* Tabla de rangos */}
          <div className="overflow-x-auto rounded-lg border border-outline-variant min-w-0">
            <table className="w-full min-w-[280px] text-xs sm:text-sm">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-semibold">Rango</th>
                    <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold">Monto</th>
                    <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {data.chartData.map((bucket) => (
                    <tr
                      key={bucket.range}
                      className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                        selectedRange === bucket.range ? 'bg-muted/40' : ''
                      }`}
                      onClick={() => setSelectedRange(selectedRange === bucket.range ? null : bucket.range)}
                    >
                      <td className="px-3 py-2 sm:px-4 sm:py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded flex-shrink-0"
                            style={{ backgroundColor: bucket.color }}
                          />
                          <span className="font-medium text-on-surface leading-tight">
                            {agingRiskColors[bucket.range].label}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-mono font-medium text-on-surface whitespace-nowrap">
                        {formatCurrency(bucket.amount)}
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                        <span className="font-bold" style={{ color: bucket.color }}>
                          {bucket.percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/60 font-semibold border-t-2 border-outline-variant">
                    <td className="px-3 py-2 sm:px-4 sm:py-3 font-bold text-on-surface">Total General</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-mono font-bold text-on-surface whitespace-nowrap">
                      {formatCurrency(data.summary.totalAmount)}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-bold text-on-surface">100%</td>
                  </tr>
                </tbody>
              </table>
          </div>

          {/* Pie Chart */}
          <div className="h-[400px] sm:h-[480px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.chartData}
                  cx="50%"
                  cy="45%"
                  outerRadius="70%"
                  dataKey="amount"
                  nameKey="range"
                  onClick={(entry) => setSelectedRange(selectedRange === entry.range ? null : entry.range as AgingRange)}
                  label={({ percentage }) => `${percentage.toFixed(0)}%`}
                  labelLine={true}
                >
                  {data.chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={selectedRange === entry.range ? chartColors.black : 'transparent'}
                      strokeWidth={selectedRange === entry.range ? 3 : 0}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value: string) => agingRiskColors[value as AgingRange]?.label || value}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Botón para ver detalle por cliente */}
        <div className="mt-4 pt-4 border-t border-outline-variant mx-3 sm:mx-6">
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="px-4 py-2 bg-primary-container text-on-primary-container rounded-full text-xs sm:text-sm font-medium hover:bg-primary-container/80 transition-colors"
          >
            {showDetail ? 'Ocultar detalle por cliente' : 'Ver detalle por cliente'}
          </button>

          {showDetail && (
            <div className="mt-4">
              <DataTable
                data={filteredTableData.slice(0, 100)}
                columns={detailColumns}
                title={selectedRange ? `Clientes — ${agingRiskColors[selectedRange].label}` : 'Todos los clientes'}
                sortable
                defaultSortColumn="total"
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
