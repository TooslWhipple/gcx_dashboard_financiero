'use client';

// components/cartera/cartera-overview.tsx
// US-002: Antigüedad de Cartera
// US-003: Tendencia Cartera CXC (Vencido vs En tiempo)

import { useState } from 'react';
import { AgingAnalysis } from '@/components/charts/AgingAnalysis';
import { PortfolioTrendChart } from '@/components/charts/PortfolioTrendChart';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { useAgingData, usePortfolioTrend } from '@/hooks';

export function CarteraOverview() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedFechaCorte, setSelectedFechaCorte] = useState(todayStr);

  // US-002: Antigüedad de Cartera
  const { data: agingData, isLoading: isLoadingAging, isError: isErrorAging } = useAgingData({
    fechaCorte: selectedFechaCorte,
    idEmpresa: 1,
  });

  // US-003: Tendencia Cartera CXC
  const { data: portfolioData, isLoading: isLoadingPortfolio, isError: isErrorPortfolio } = usePortfolioTrend({
    year: selectedYear,
    idEmpresa: 1,
  });

  return (
    <div className="space-y-8">

      {/* Selectores de fecha y año */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Fecha de corte (Antigüedad):</label>
          <input
            type="date"
            value={selectedFechaCorte}
            onChange={(e) => setSelectedFechaCorte(e.target.value)}
            className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Año (Tendencia CXC):</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* US-002: Antigüedad de Cartera */}
      <section>
        {isLoadingAging ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Cargando antigüedad de cartera...
          </div>
        ) : isErrorAging ? (
          <div className="flex items-center justify-center h-48 text-red-500 text-sm">
            Error al cargar antigüedad de cartera.
          </div>
        ) : agingData ? (
          <AgingAnalysis data={agingData} />
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Sin datos de antigüedad disponibles.
          </div>
        )}
      </section>

      {/* US-003: Tendencia Cartera CXC */}
      <section>
        {isLoadingPortfolio ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Cargando tendencia CXC — consultando mes a mes...
          </div>
        ) : isErrorPortfolio ? (
          <div className="flex items-center justify-center h-48 text-red-500 text-sm">
            Error al cargar tendencia de cartera CXC.
          </div>
        ) : portfolioData ? (
          <PortfolioTrendChart data={portfolioData} />
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Sin datos de tendencia CXC disponibles.
          </div>
        )}
      </section>

    </div>
  );
}
