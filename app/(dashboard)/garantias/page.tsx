import { GarantiasOverview } from '@/components/garantias/garantias-overview';

export const dynamic = 'force-dynamic';

export default function GarantiasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground text-balance">Garantías</h1>
        <p className="text-muted-foreground text-pretty">Estatus de garantías y tendencia de cartera vencida vs al día</p>
      </div>
      <GarantiasOverview />
    </div>
  );
}
