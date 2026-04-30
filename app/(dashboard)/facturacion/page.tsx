import { FacturacionOverview } from '@/components/facturacion/facturacion-overview';

export const dynamic = 'force-dynamic';

export default function FacturacionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-balance">Facturación</h1>
        <p className="text-muted-foreground text-pretty text-sm sm:text-base">
          Facturación mensual por aduanas DAC — honorarios vs complementarios
        </p>
      </div>
      <FacturacionOverview />
    </div>
  );
}
