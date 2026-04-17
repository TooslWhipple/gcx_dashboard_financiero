'use client';

// components/charts/GuaranteeAgingChart.tsx
// Antigüedad de Cartera Garantías — Pie chart + tabla de rangos

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, TooltipProps } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';

export interface AgingBucketData {
  range: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

interface GuaranteeAgingChartProps {
  chartData: AgingBucketData[];
  totalAmount: number;
  fechaCorte: string;
  title?: string;
  className?: string;
}

const RANGE_LABELS: Record<string, string> = {
  '1-30':     '1 a 30 días',
  '31-60':    '31-60 días',
  '61-90':    '61-90 días',
  '91-120':   '91-120 días',
  '121-5000': '121-5000 días',
};

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload as AgingBucketData;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
        <p className="font-bold mb-1" style={{ color: d.color }}>{RANGE_LABELS[d.range] ?? d.range}</p>
        <p className="text-gray-700">Monto: <span className="font-semibold">{formatCurrency(d.amount)}</span></p>
        <p className="text-gray-700">%: <span className="font-semibold">{d.percentage.toFixed(1)}%</span></p>
        <p className="text-gray-500">Registros: {d.count}</p>
      </div>
    );
  }
  return null;
};

export function GuaranteeAgingChart({
  chartData,
  totalAmount,
  fechaCorte,
  title = 'Antigüedad de Cartera Garantías',
  className,
}: GuaranteeAgingChartProps) {
  const nonZero = chartData.filter((d) => d.amount > 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 flex-shrink-0">
              <Shield className="w-5 h-5 text-purple-700" />
            </div>
            <CardTitle className="text-base sm:text-title-large">{title}</CardTitle>
          </div>
          <div className="sm:text-right">
            <p className="text-label-medium text-on-surface-variant">Total</p>
            <p className="text-lg sm:text-headline-small font-semibold text-on-surface">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
        <p className="text-label-small text-on-surface-variant mt-1">Corte: {fechaCorte}</p>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start px-3 sm:px-6 pt-2">

          {/* Pie Chart */}
          <div className="h-[400px] sm:h-[480px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={nonZero}
                  dataKey="amount"
                  nameKey="range"
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  innerRadius="35%"
                  paddingAngle={2}
                >
                  {nonZero.map((entry) => (
                    <Cell key={entry.range} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => RANGE_LABELS[value] ?? value}
                  iconType="square"
                  iconSize={11}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla de rangos */}
          <div className="overflow-x-auto rounded-lg border border-outline-variant min-w-0">
            <table className="w-full min-w-[280px] text-xs sm:text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-semibold">Rango</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold">Montos</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {chartData.map((row) => (
                  <tr key={row.range} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 sm:px-4 sm:py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-3 h-3 sm:w-4 sm:h-4 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="leading-tight">{RANGE_LABELS[row.range] ?? row.range}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-mono text-on-surface whitespace-nowrap">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-bold whitespace-nowrap"
                      style={{ color: row.amount > 0 ? row.color : '#9CA3AF' }}
                    >
                      {row.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold border-t-2 border-outline-variant">
                  <td className="px-3 py-2 sm:px-4 sm:py-3 font-bold text-on-surface">Total</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-mono font-bold text-on-surface whitespace-nowrap">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-bold text-on-surface">100%</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
