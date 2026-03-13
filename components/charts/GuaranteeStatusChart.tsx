'use client';

// components/charts/GuaranteeStatusChart.tsx
// US-005: Estatus de Garantías
// Sección 1: Tabla resumen (Estatus | Monto | %)
// Sección 2: Tabla por semana (filas = estatus, columnas = semanas)
// Sección 3: Gráfica de barras apiladas por semana

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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { GuaranteeStatusData, WeekGuaranteeData } from '@/types/dashboard';
import { formatCurrency } from '@/lib/utils/formatters';

interface GuaranteeStatusChartProps {
  data: GuaranteeStatusData;
  year: number;
}

const STATUS_COLORS = {
  programadas: '#2196F3',  // Azul - Programadas
  naviera:    '#FF9800',  // Naranja - Naviera
  operacion:  '#4CAF50',  // Verde - Operación
  recuperadas: '#9C27B0',  // Morado - Recuperadas
};

const STATUS_LABELS = {
  programadas: 'Programadas',
  naviera:    'Naviera',
  operacion:  'Operación',
  recuperadas: 'Recuperadas',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-mono font-medium">{formatCurrency(p.value)}</span>
          </div>
        ))}
        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between gap-4 font-semibold">
          <span>Total</span>
          <span className="font-mono">{formatCurrency(total)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function GuaranteeStatusChart({ data, year }: GuaranteeStatusChartProps) {
  const [showAllWeeks, setShowAllWeeks] = useState(false);

  const hasData = data.summary.some(s => s.amount > 0) || data.weeks.length > 0;

  // Limitar semanas visibles en la tabla para no saturar
  const visibleWeeks = showAllWeeks ? data.weeks : data.weeks.slice(0, 15);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Shield className="w-5 h-5 text-green-700" />
            </div>
            <CardTitle className="text-title-large">Estatus de Garantías — {year}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Sin datos de garantías para {year}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Sección 1: Tabla resumen ESTATUS DE GARANTÍAS ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Shield className="w-5 h-5 text-green-700" />
            </div>
            <CardTitle className="text-base sm:text-title-large">Estatus de Garantías — {year}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-xs sm:text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-bold" colSpan={3}>
                    ESTATUS DE GARANTIAS
                  </th>
                </tr>
                <tr className="bg-blue-600 text-white border-b border-blue-500">
                  <th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-semibold w-1/2">Estatus</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold">MONTO</th>
                  <th className="text-right px-3 py-2 sm:px-4 sm:py-3 font-semibold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {data.summary.map((item) => (
                  <tr key={item.status} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 sm:px-4 sm:py-3 font-medium text-on-surface">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                          style={{
                            backgroundColor:
                              item.status === 'Programadas' ? STATUS_COLORS.programadas :
                              item.status === 'Naviera'     ? STATUS_COLORS.naviera :
                              item.status === 'Recuperadas' ? STATUS_COLORS.recuperadas :
                                                              STATUS_COLORS.operacion,
                          }}
                        />
                        {item.status === 'Operación' ? 'Operación' : item.status}
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-mono font-medium text-on-surface">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-bold"
                      style={{
                        color:
                          item.status === 'Programadas' ? STATUS_COLORS.programadas :
                          item.status === 'Naviera'     ? STATUS_COLORS.naviera :
                          item.status === 'Recuperadas' ? STATUS_COLORS.recuperadas :
                                                          STATUS_COLORS.operacion,
                      }}
                    >
                      {item.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/60 border-t-2 border-outline-variant font-semibold">
                  <td className="px-3 py-2 sm:px-4 sm:py-3 font-bold text-on-surface">Total General</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-mono font-bold text-on-surface">
                    {formatCurrency(data.summary.reduce((s, i) => s + i.amount, 0))}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-bold text-on-surface">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-4">Periodicidad: Semanal</p>
        </CardContent>
      </Card>

      {/* ── Sección 2: Tabla por semana (filas = estatus, columnas = semanas) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-title-medium">Tenencia de Garantías por Semana — {year}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <div className="overflow-x-auto w-full">
            <table className="text-xs sm:text-sm border-collapse" style={{ minWidth: `${110 + visibleWeeks.length * 90}px` }}>
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="text-left px-2 py-2 sm:px-3 font-bold border border-blue-600 min-w-[90px] sm:min-w-[110px] sticky left-0 bg-blue-700 z-10">Estatus</th>
                  {visibleWeeks.map((w) => (
                    <th key={w.weekNumber} className="text-right px-2 py-2 sm:px-3 font-bold border border-blue-600 min-w-[80px] sm:min-w-[95px]">
                      {w.weekLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-2 py-2 sm:px-3 font-semibold text-blue-700 border border-gray-200 bg-blue-50 sticky left-0 z-10">
                    Programadas
                  </td>
                  {visibleWeeks.map((w) => (
                    <td key={w.weekNumber} className="px-2 py-2 sm:px-3 text-right font-mono border border-gray-200 whitespace-nowrap">
                      {w.scheduled > 0 ? formatCurrency(w.scheduled) : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-orange-50 transition-colors">
                  <td className="px-2 py-2 sm:px-3 font-semibold text-orange-700 border border-gray-200 bg-orange-50 sticky left-0 z-10">
                    Naviera
                  </td>
                  {visibleWeeks.map((w) => (
                    <td key={w.weekNumber} className="px-2 py-2 sm:px-3 text-right font-mono border border-gray-200 whitespace-nowrap">
                      {w.naviera > 0 ? formatCurrency(w.naviera) : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-green-50 transition-colors">
                  <td className="px-2 py-2 sm:px-3 font-semibold text-green-700 border border-gray-200 bg-green-50 sticky left-0 z-10">
                    Operación
                  </td>
                  {visibleWeeks.map((w) => (
                    <td key={w.weekNumber} className="px-2 py-2 sm:px-3 text-right font-mono border border-gray-200 whitespace-nowrap">
                      {w.operation > 0 ? formatCurrency(w.operation) : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-purple-50 transition-colors">
                  <td className="px-2 py-2 sm:px-3 font-semibold text-purple-700 border border-gray-200 bg-purple-50 sticky left-0 z-10">
                    Recuperadas
                  </td>
                  {visibleWeeks.map((w) => (
                    <td key={w.weekNumber} className="px-2 py-2 sm:px-3 text-right font-mono border border-gray-200 whitespace-nowrap">
                      {w.recovered > 0 ? formatCurrency(w.recovered) : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-yellow-50 font-semibold border-t-2 border-yellow-400">
                  <td className="px-2 py-2 sm:px-3 font-bold border border-gray-200 sticky left-0 bg-yellow-50 z-10">Total</td>
                  {visibleWeeks.map((w) => (
                    <td key={w.weekNumber} className="px-2 py-2 sm:px-3 text-right font-mono font-bold border border-gray-200 whitespace-nowrap">
                      {formatCurrency(w.total)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {data.weeks.length > 15 && (
            <button
              onClick={() => setShowAllWeeks(!showAllWeeks)}
              className="mt-3 mx-4 text-xs sm:text-sm text-primary underline hover:no-underline"
            >
              {showAllWeeks ? 'Ver menos semanas' : `Ver todas (${data.weeks.length} semanas)`}
            </button>
          )}
        </CardContent>
      </Card>

      {/* ── Sección 3: Gráfica de barras apiladas ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-title-medium">Tenencia de Garantías {year}</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 pb-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data.chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                interval={1}
                height={55}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                tick={{ fontSize: 10 }}
                width={38}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="square"
                iconSize={10}
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                formatter={(value) =>
                  value === 'scheduled' ? 'Programadas' :
                  value === 'naviera'     ? 'Naviera' :
                  value === 'recovered' ? 'Recuperadas' : 'Operación'
                }
              />
              <Bar dataKey="scheduled" name="programadas" stackId="a" fill={STATUS_COLORS.programadas} />
              <Bar dataKey="naviera"     name="naviera"     stackId="a" fill={STATUS_COLORS.naviera} />
              <Bar dataKey="operation"   name="operacion"   stackId="a" fill={STATUS_COLORS.operacion} />
              <Bar dataKey="recovered" name="recuperadas" stackId="a" fill={STATUS_COLORS.recuperadas} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  );
}
