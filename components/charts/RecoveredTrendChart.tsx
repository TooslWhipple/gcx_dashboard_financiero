// components/charts/RecoveredTrendChart.tsx
// Nueva tabla de tendencia de Recuperado en Garantías
// Muestra el monto histórico de las garantías marcadas como "Recuperadas" (similar a Tendencia de Cobrado)

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';

interface RecoveredTrendChartProps {
  data: {
    month: number;
    monthName: string;
    amount: number;
  }[];
  year: number;
  className?: string;
}

export function RecoveredTrendChart({ data, year, className }: RecoveredTrendChartProps) {
  const totalRecovered = data.reduce((sum, item) => sum + item.amount, 0);

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
      </CardHeader>
      <CardContent className="p-0 pb-4 mt-4">
        <div className="overflow-x-auto rounded-lg border border-outline-variant mx-2 sm:mx-4">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-purple-700 text-white">
                <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-purple-700 z-10 w-1/2">
                  Mes
                </th>
                <th className="text-right px-4 py-3 font-semibold w-1/2">
                  Monto Recuperado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {data.map((m) => (
                <tr key={m.month} className="hover:bg-purple-50 transition-colors">
                  <td className="px-4 py-2 font-medium text-purple-800 sticky left-0 bg-white z-10">
                    {m.monthName}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-medium">
                    {m.amount > 0 ? formatCurrency(m.amount) : '—'}
                  </td>
                </tr>
              ))}
              <tr className="bg-purple-50 font-bold border-t-2 border-purple-300">
                <td className="px-4 py-3 sticky left-0 bg-purple-50 z-10 text-purple-900">Total {year}</td>
                <td className="px-4 py-3 text-right font-mono text-purple-900">
                  {formatCurrency(totalRecovered)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-4 px-4">
          Muestra el acumulado de garantías cuyo estatus es "Recuperadas" por mes.
        </p>
      </CardContent>
    </Card>
  );
}
