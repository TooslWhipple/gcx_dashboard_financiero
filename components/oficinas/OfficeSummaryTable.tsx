// components/oficinas/OfficeSummaryTable.tsx
// US-006: Resumen Corporativo por Oficina — tabla con métricas por oficina

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, ArrowUpDown, DollarSign, Users, AlertTriangle, TrendingDown } from 'lucide-react';
import { OfficeSummaryData, OfficeSummary } from '@/types/dashboard';
import { formatCurrency } from '@/lib/utils/formatters';

interface OfficeSummaryTableProps {
  data: OfficeSummaryData;
  className?: string;
}

type SortKey = keyof OfficeSummary;
type SortDir = 'asc' | 'desc';

export function OfficeSummaryTable({ data, className }: OfficeSummaryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...data.offices].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const t = data.totals;
  const overduePercent = t.total > 0 ? ((t.overdue / t.total) * 100).toFixed(1) : '0';

  const columns: { key: SortKey; label: string; align?: string; isCurrency?: boolean; isNegative?: boolean }[] = [
    { key: 'name', label: 'Oficina' },
    { key: 'invoiceCount', label: 'Facturas', align: 'center' },
    { key: 'range01to30', label: '01-30', align: 'right', isCurrency: true },
    { key: 'range31to45', label: '31-45', align: 'right', isCurrency: true },
    { key: 'range46to60', label: '46-60', align: 'right', isCurrency: true },
    { key: 'range61to90', label: '61-90', align: 'right', isCurrency: true },
    { key: 'range91to120', label: '91-120', align: 'right', isCurrency: true },
    { key: 'range121plus', label: '121+', align: 'right', isCurrency: true },
    { key: 'total', label: 'Total', align: 'right', isCurrency: true },
    { key: 'dacBalance', label: 'Saldo DAC', align: 'right', isCurrency: true },
    { key: 'clientBalance', label: 'Saldos Clientes', align: 'right', isCurrency: true, isNegative: true },
    { key: 'collected', label: 'Cobrado', align: 'right', isCurrency: true },
    { key: 'overdue', label: 'Vencido', align: 'right', isCurrency: true },
  ];

  const fmtCell = (val: any, isCurrency: boolean) => {
    if (isCurrency) return val !== 0 ? formatCurrency(val) : '—';
    return val;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-base sm:text-title-large text-on-surface">
            Resumen Corporativo por Oficina
          </CardTitle>
        </div>
        <p className="text-xs text-on-surface-variant ml-7">
          Antigüedad de cartera y métricas por unidad operativa
        </p>
      </CardHeader>
      <CardContent className="p-0 pb-4">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-3 sm:px-6 mb-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Cartera Total</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-blue-900">{formatCurrency(t.total)}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-600 font-medium">Vencido ({overduePercent}%)</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-red-900">{formatCurrency(t.overdue)}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">Cobrado</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-green-900">{formatCurrency(t.collected)}</p>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto mx-2 sm:mx-4 rounded-lg border border-outline-variant">
          <table className="w-full text-[11px] sm:text-xs">
            <thead>
              <tr className="bg-blue-700 text-white">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-2 py-2 sm:px-3 sm:py-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600 transition-colors select-none ${
                      col.key === 'name' ? 'text-left sticky left-0 bg-blue-700 z-10' : col.align === 'center' ? 'text-center' : 'text-right'
                    }`}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        <ArrowUpDown className="w-3 h-3 opacity-80" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {sorted.map((office) => {
                const isHighOverdue = office.total > 0 && (office.overdue / office.total) > 0.3;
                return (
                  <tr key={office.id} className={`hover:bg-gray-50 transition-colors ${isHighOverdue ? 'bg-red-50/40' : ''}`}>
                    {columns.map((col) => {
                      const val = office[col.key];
                      const isName = col.key === 'name';
                      const isOverdue = col.key === 'overdue' && (val as number) > 0;
                      const is91plus = (col.key === 'range91to120' || col.key === 'range121plus') && (val as number) > 0;
                      const isNegative = col.isNegative && (val as number) < 0;
                      return (
                        <td
                          key={col.key}
                          className={`px-2 py-1.5 sm:px-3 sm:py-2 font-mono whitespace-nowrap ${
                            isName ? 'font-sans font-medium text-blue-700 sticky left-0 bg-white z-10' :
                            col.align === 'center' ? 'text-center font-sans' : 'text-right'
                          } ${isOverdue ? 'text-red-600 font-semibold' : ''} ${is91plus ? 'text-red-700 font-semibold' : ''} ${isNegative ? 'text-green-600' : ''}`}
                        >
                          {fmtCell(val, !!col.isCurrency)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Fila totales */}
              <tr className="bg-blue-50 font-bold border-t-2 border-blue-300">
                {columns.map((col) => {
                  const val = t[col.key];
                  const isName = col.key === 'name';
                  return (
                    <td
                      key={col.key}
                      className={`px-2 py-2 sm:px-3 font-mono whitespace-nowrap ${
                        isName ? 'font-sans sticky left-0 bg-blue-50 z-10' :
                        col.align === 'center' ? 'text-center font-sans' : 'text-right'
                      } ${col.key === 'overdue' ? 'text-red-700' : ''}`}
                    >
                      {fmtCell(val, !!col.isCurrency)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-on-surface-variant px-4 mt-2">
          {data.offices.length} oficinas · Rangos en días de antigüedad · Ordenar por columna
        </p>
      </CardContent>
    </Card>
  );
}
