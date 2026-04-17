import redis from './redis';

export const CACHE_TTL_SECONDS = 18000; // 5 hours

/**
 * Función genérica para obtener datos de caché o de la función de origen (DB/API)
 * 
 * @param cacheKey La clave única en Redis para estos datos
 * @param fetchFunction La función que extrae los datos si no están en caché
 * @param ttl Tiempo de vida en segundos (default 5 horas)
 * @returns Los datos (ya sea de caché o frescos)
 */
export async function getCachedData<T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>,
  ttl: number = CACHE_TTL_SECONDS
): Promise<T> {
  try {
    const cachedResult = await redis.get(cacheKey);
    
    if (cachedResult) {
      console.log(`[Cache] HIT para la clave: ${cacheKey}`);
      return JSON.parse(cachedResult) as T;
    }

    console.log(`[Cache] MISS para la clave: ${cacheKey}, consultando origen...`);
    
    // Obtener los datos frescos de la función de origen (RECO API, etc)
    const freshData = await fetchFunction();
    
    // Almacenamos en caché sólo si la función retorna algo válido que no sea un error flagrante
    // (Ajustar según cómo formatee las respuestas el fetchFunction)
    if (freshData !== undefined && freshData !== null) {
      await redis.set(cacheKey, JSON.stringify(freshData), 'EX', ttl);
      console.log(`[Cache] Datos guardados en caché para la clave: ${cacheKey} (TTL: ${ttl}s)`);
    }

    return freshData;
  } catch (error) {
    console.error(`[Cache] Error al acceder a Redis para clave ${cacheKey}. Fallback a consulta directa...`, error);
    // Si Redis falla, fallback silencioso llamando al origen directamente
    return fetchFunction();
  }
}

/**
 * Fija un valor en el caché de manera manual (Útil para procesos cron / pre-warm)
 */
export async function setCachedData<T>(cacheKey: string, data: T, ttl: number = CACHE_TTL_SECONDS): Promise<void> {
  try {
    await redis.set(cacheKey, JSON.stringify(data), 'EX', ttl);
    console.log(`[Cache Manual] Datos guardados en caché para la clave: ${cacheKey} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error(`[Cache Manual] Error al guardar datos en Redis para clave ${cacheKey}...`, error);
  }
}
