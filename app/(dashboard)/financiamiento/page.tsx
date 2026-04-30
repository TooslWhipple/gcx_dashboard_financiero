import { FinanciamientoOverview } from '@/components/financiamiento/financiamiento-overview';

export const dynamic = 'force-dynamic';

export default function FinanciamientoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">Financiamiento</h1>
        <p className="text-muted-foreground text-pretty">Tendencia de financiamiento CxC DAC — Por facturar vs Facturado</p>
      </div>
      <FinanciamientoOverview />
    </div>
  );
}
