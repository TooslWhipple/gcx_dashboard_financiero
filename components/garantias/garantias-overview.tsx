'use client';

// components/garantias/garantias-overview.tsx
// US-005: Estatus de Garantías (tabla resumen + tabla semanal + gráfica)
// US-008: Tendencia Cartera de Garantías (semanal, vencido vs en proceso, umbral 45 días)
// Antigüedad de Cartera Garantías (pie chart + tabla de rangos)

import { useState } from 'react';
import { GuaranteeStatusChart } from '@/components/charts/GuaranteeStatusChart';
import { GuaranteeTrendChart } from '@/components/charts/GuaranteeTrendChart';
import { GuaranteeAgingChart } from '@/components/charts/GuaranteeAgingChart';
import { RecoveredTrendChart } from '@/components/charts/RecoveredTrendChart';
import { useGuaranteeStatus, useGuaranteeTrend, useGuaranteeAging, useRecoveredTrend } from '@/hooks';

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

export function GarantiasOverview() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // US-005: Estatus de Garantías (fn_Garantias_Estatus)
  const { data: statusData, isLoading: isLoadingStatus, isError: isErrorStatus } = useGuaranteeStatus({
    year: selectedYear,
    idEmpresa: 1,
  });

  // US-005: Tendencia Recuperadas
  const { data: recoveredData, isLoading: isLoadingRecovered, isError: isErrorRecovered } = useRecoveredTrend({
    year: selectedYear,
    idEmpresa: 1,
  });

  // Antigüedad de Cartera Garantías (sp_Antiguedad_cartera_garantias — corte hoy)
  const { data: agingData, isLoading: isLoadingAging, isError: isErrorAging } = useGuaranteeAging({
    idEmpresa: 1,
  });

  // US-008: Tendencia Cartera de Garantías (sp_Tendencia_cartera_Garantias — mensual, 45 días)
  const { data: trendData, isLoading: isLoadingTrend, isError: isErrorTrend } = useGuaranteeTrend({
    year: selectedYear,
    idEmpresa: 1,
  });

  return (
    <div className="space-y-8">

      {/* Selector de año */}
      <div className="flex flex-wrap items-center gap-2">
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

      {/* US-005: Estatus de Garantías — resumen + tabla semanal + gráfica */}
      <section>
        {isLoadingStatus ? (
          <LoadingState message="Cargando estatus de garantías..." />
        ) : isErrorStatus ? (
          <ErrorState message="Error al cargar estatus de garantías." />
        ) : statusData ? (
          <GuaranteeStatusChart data={statusData} year={selectedYear} />
        ) : (
          <LoadingState message="Sin datos de estatus de garantías disponibles." />
        )}
      </section>

      {/* Tendencia Recuperadas (Nueva Tabla) */}
      <section>
        {isLoadingRecovered ? (
          <LoadingState message="Cargando tendencia de garantías recuperadas..." />
        ) : isErrorRecovered ? (
          <ErrorState message="Error al cargar tendencia de garantías recuperadas." />
        ) : recoveredData ? (
          <RecoveredTrendChart data={recoveredData} year={selectedYear} />
        ) : (
          <LoadingState message="Sin datos de recuperación disponibles." />
        )}
      </section>

      {/* Antigüedad de Cartera Garantías — pie chart + tabla de rangos */}
      <section>
        {isLoadingAging ? (
          <LoadingState message="Cargando antigüedad de cartera de garantías..." />
        ) : isErrorAging ? (
          <ErrorState message="Error al cargar antigüedad de garantías." />
        ) : agingData ? (
          <GuaranteeAgingChart
            chartData={agingData.chartData}
            totalAmount={agingData.totalAmount}
            fechaCorte={agingData.fechaCorte}
            bucketsSum={agingData.bucketsSum}
            difference={agingData.difference}
          />
        ) : (
          <LoadingState message="Sin datos de antigüedad disponibles." />
        )}
      </section>

      {/* US-008: Tendencia Cartera de Garantías — semanal, umbral 45 días */}
      <section>
        {isLoadingTrend ? (
          <LoadingState message="Cargando tendencia de cartera de garantías..." />
        ) : isErrorTrend ? (
          <ErrorState message="Error al cargar tendencia de garantías." />
        ) : trendData ? (
          <GuaranteeTrendChart data={trendData} />
        ) : (
          <LoadingState message="Sin datos de tendencia de garantías disponibles." />
        )}
      </section>

    </div>
  );
}
