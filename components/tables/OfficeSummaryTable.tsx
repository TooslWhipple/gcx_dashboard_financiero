// components/tables/OfficeSummaryTable.tsx
// US-006: Resumen Corporativo por Oficina
// Material Design 3 Data Table implementation

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, ArrowUpDown, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { OfficeSummaryData, OfficeSummary } from '@/types/dashboard';
import { formatCurrencyCompact, formatNumber } from '@/lib/utils/formatters';

interface OfficeSummaryTableProps {
  data: OfficeSummaryData;
  title?: string;
  className?: string;
  onOfficeClick?: (office: OfficeSummary) => void;
}

type SortColumn = keyof OfficeSummary;
type SortDirection = 'asc' | 'desc';

export function OfficeSummaryTable({
  data,
  title = 'Resumen Corporativo por Oficina',
  className,
  onOfficeClick,
}: OfficeSummaryTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('total');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedOffices = useMemo(() => {
    return [...data.offices].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [data.offices, sortColumn, sortDirection]);

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-outline" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-primary" />
    ) : (
      <ChevronDown className="w-4 h-4 text-primary" />
    );
  };

  const columns: { key: SortColumn; label: string; align?: 'left' | 'center' | 'right'; format?: 'currency' | 'number' }[] = [
    { key: 'name', label: 'Oficina', align: 'left' },
    { key: 'invoiceCount', label: 'Facturas', align: 'center', format: 'number' },
    { key: 'range01to30', label: '01-30', align: 'right', format: 'currency' },
    { key: 'range31to45', label: '31-45', align: 'right', format: 'currency' },
    { key: 'range46to60', label: '46-60', align: 'right', format: 'currency' },
    { key: 'range61to90', label: '61-90', align: 'right', format: 'currency' },
    { key: 'range91to120', label: '91-120', align: 'right', format: 'currency' },
    { key: 'range121plus', label: '121+', align: 'right', format: 'currency' },
    { key: 'total', label: 'Total', align: 'right', format: 'currency' },
    { key: 'dacBalance', label: 'Saldo DAC', align: 'right', format: 'currency' },
    { key: 'clientBalance', label: 'Saldo Clientes', align: 'right', format: 'currency' },
    { key: 'collected', label: 'Cobrado', align: 'right', format: 'currency' },
    { key: 'overdue', label: 'Vencido', align: 'right', format: 'currency' },
  ];

  const formatValue = (value: number | string, format?: 'currency' | 'number'): string => {
    if (typeof value === 'string') return value;
    if (format === 'currency') return formatCurrencyCompact(value);
    if (format === 'number') return formatNumber(value);
    return String(value);
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-title-large text-on-surface">
            {title}
          </CardTitle>
        </div>
        <div className="text-right">
          <p className="text-label-medium text-on-surface-variant">Total Cartera</p>
          <p className="text-headline-small text-on-surface font-semibold">
            {formatCurrencyCompact(data.totals.total)}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-lg border border-outline-variant max-h-[600px]">
          <table className="w-full min-w-[1200px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-blue-700">
                <th className="px-3 py-3 text-left text-label-medium font-semibold text-white w-12">
                  No.
                </th>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`px-3 py-3 text-label-medium font-semibold text-white cursor-pointer hover:bg-blue-600 transition-colors ${
                      column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                    onClick={() => handleSort(column.key)}
                  >
                    <div className={`flex items-center gap-1 ${
                      column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start'
                    }`}>
                      {column.label}
                      {renderSortIcon(column.key)}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-label-medium font-semibold text-on-surface-variant w-16">
                  Ver
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface">
              {/* Totals Row */}
              <tr className="bg-primary-container/30 font-semibold sticky top-[52px] z-10">
                <td className="px-3 py-3 text-body-medium text-on-surface">-</td>
                {columns.map((column) => (
                  <td
                    key={`total-${String(column.key)}`}
                    className={`px-3 py-3 text-body-medium text-on-surface ${
                      column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column.key === 'name' 
                      ? 'TOTALES' 
                      : formatValue(data.totals[column.key], column.format)
                    }
                  </td>
                ))}
                <td className="px-3 py-3 text-center">-</td>
              </tr>

              {/* Data Rows */}
              {sortedOffices.map((office, index) => (
                <tr
                  key={office.id}
                  className="hover:bg-surface-container transition-colors"
                >
                  <td className="px-3 py-3 text-body-medium text-on-surface-variant">
                    {index + 1}
                  </td>
                  {columns.map((column) => (
                    <td
                      key={`${office.id}-${String(column.key)}`}
                      className={`px-3 py-3 text-body-medium text-on-surface ${
                        column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                      } ${column.key === 'overdue' && office.overdue > office.total * 0.2 ? 'bg-red-50 text-red-700 font-medium' : ''}`}
                    >
                      {formatValue(office[column.key], column.format)}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => onOfficeClick?.(office)}
                      className="p-2 rounded-full hover:bg-surface-container text-primary transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-label-small text-on-surface-variant">
          {sortedOffices.length} oficinas
        </div>
      </CardContent>
    </Card>
  );
}
