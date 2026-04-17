import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Simple security check para que no cualquiera limpie la caché
    if (token !== (process.env.CRON_SECRET || 'secret123')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const idEmpresa = parseInt(searchParams.get('idEmpresa') || '1');
    const fechaCorte = searchParams.get('fechaCorte') || new Date().toISOString().split('T')[0];

    console.log('[CRON] Iniciando proceso de refresco de caché...');

    // 1. Limpiar toda la caché actual en el namespace (o flushdb si es dedicado)
    await redis.flushdb();
    console.log('[CRON] Caché limpiada.');

    // 2. URLs a pre-calentar
    // Usamos el host local interno del contenedor Next.js
    const baseUrl = `http://127.0.0.1:${process.env.PORT || 3000}`;
    
    const endpoints = [
      `/api/tendencia-cobrado?year=${year}&idEmpresa=${idEmpresa}`,
      `/api/tendencia-cxc?year=${year}&idEmpresa=${idEmpresa}`,
      `/api/antiguedad-cartera?fechaCorte=${fechaCorte}&idEmpresa=${idEmpresa}`,
      `/api/financiamiento?year=${year}&idEmpresa=${idEmpresa}`,
      `/api/resumen-oficinas?fechaCorte=${fechaCorte}&idEmpresa=${idEmpresa}`,
      `/api/garantias/estatus?year=${year}&idEmpresa=${idEmpresa}`,
      `/api/garantias/antiguedad?idEmpresa=${idEmpresa}`,
      `/api/garantias/tendencia?year=${year}&idEmpresa=${idEmpresa}`,
      `/api/garantias/tendencia-recuperado?year=${year}&idEmpresa=${idEmpresa}&previousYear=true`,
      `/api/facturacion?year=${year}&idEmpresa=${idEmpresa}&view=mensual`,
      `/api/facturacion?year=${year}&idEmpresa=${idEmpresa}&view=semanal`
    ];

    // 3. Ejecutar secuencialmente para no saturar el API RECO (que tiene límite de conexiones concurrentes)
    for (const endpoint of endpoints) {
      console.log(`[CRON] Warming up: ${endpoint}`);
      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        if (!response.ok) {
          console.error(`[CRON] Error warming ${endpoint}: ${response.status}`);
        }
      } catch (err) {
        console.error(`[CRON] Fallo de red en ${endpoint}:`, err);
      }
    }

    console.log('[CRON] Refresco de caché completado exitosamente.');

    return NextResponse.json({ 
      success: true, 
      message: 'Caché limpiada y pre-calentada',
      endpoints_warmed: endpoints.length
    });
  } catch (error) {
    console.error('[CRON] Error fatal:', error);
    return NextResponse.json({ error: 'Error procesando refresco' }, { status: 500 });
  }
}
