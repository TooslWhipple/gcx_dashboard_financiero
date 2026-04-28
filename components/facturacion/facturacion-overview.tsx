'use client';

// components/facturacion/facturacion-overview.tsx
// US-007: Facturación DAC — Honorarios vs Complementarios

import { useState } from 'react';
import { BillingChart } from '@/components/charts/BillingChart';
import { useBilling } from '@/hooks';

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      {message}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-red-500 text-sm">
      {message}
    </div>
  );
}

export function FacturacionOverview() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [view, setView] = useState<'semanal' | 'mensual'>('mensual');

  const { data, isLoading, isError } = useBilling({
    year: selectedYear,
    aduanaId: 'all',
    view,
  });

  return (
    <div className="space-y-6">
      {/* Controles: año + vista */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Año:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm w-full sm:w-auto"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Vista:</label>
          <div className="inline-flex rounded-lg border border-outline-variant bg-surface-container overflow-hidden">
            <button
              onClick={() => setView('mensual')}
              className={`px-3 py-2 text-sm transition-colors ${
                view === 'mensual' ? 'bg-blue-700 text-white' : 'text-on-surface hover:bg-gray-100'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setView('semanal')}
              className={`px-3 py-2 text-sm transition-colors ${
                view === 'semanal' ? 'bg-blue-700 text-white' : 'text-on-surface hover:bg-gray-100'
              }`}
            >
              Semanal
            </button>
          </div>
        </div>
      </div>

      {/* Gráfica de facturación */}
      {isLoading ? (
        <LoadingState message="Cargando datos de facturación..." />
      ) : isError ? (
        <ErrorState message="Error al cargar datos de facturación." />
      ) : data ? (
        <BillingChart data={data} view={view} />
      ) : (
        <LoadingState message="Sin datos de facturación disponibles." />
      )}
    </div>
  );
}
