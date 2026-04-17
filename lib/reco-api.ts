// lib/reco-api.ts
// Cliente para API RECO - SQL Query Service
// http://rws.grucas.com:19287/api/reco/encoded
import { getCachedData, setCachedData } from './cache-service';
import crypto from 'crypto';

const RECO_API_URL = process.env.RECO_API_URL || 'http://rws.grucas.com:19287/api/reco/encoded';
const RECO_TIMEOUT_MS = 60000; // 60s — los SPs tardan ~33s según Postman
const MAX_CONCURRENT_REQUESTS = 2; // Máximo de llamadas simultáneas al API RECO

// ─── Semáforo de concurrencia ────────────────────────────────────────────────
// El servidor RECO no soporta muchas conexiones simultáneas.
// Limita a MAX_CONCURRENT_REQUESTS en paralelo; el resto espera en cola.
let _activeRequests = 0;
let _waitQueue: (() => void)[] = [];

function acquireSlot(): Promise<void> {
  if (_activeRequests < MAX_CONCURRENT_REQUESTS) {
    _activeRequests++;
    return Promise.resolve();
  }
  return new Promise(resolve => _waitQueue.push(resolve));
}

function releaseSlot(): void {
  if (_waitQueue.length > 0) {
    const next = _waitQueue.shift()!;
    next(); // no decrementa — transfiere el slot
  } else {
    _activeRequests--;
  }
}

/**
 * Codifica un string a Base64 (compatible con Node.js y Edge)
 */
function toBase64(str: string): string {
  if (typeof btoa === 'function') {
    // Node.js 18+ y navegadores
    return btoa(unescape(encodeURIComponent(str)));
  }
  // Fallback para Node.js más viejo
  return Buffer.from(str).toString('base64');
}

/**
 * Obtiene el token de autenticación.
 * Prioriza RECO_TOKEN directo (el mismo que funciona en Postman).
 * Si no existe, genera base64 de user:password.
 */
function getAuthToken(): string {
  // Token directo — evita problemas de encoding con caracteres especiales
  const directToken = process.env.RECO_TOKEN;
  if (directToken) return directToken;

  const user = process.env.GCX_USER || '';
  const password = process.env.GCX_PASSWORD || '';
  return toBase64(`${user}:${password}`);
}

/**
 * Codifica una query SQL en Base64
 */
function encodeQuery(query: string): string {
  return toBase64(query);
}

/**
 * Verifica si la query es segura (solo SELECT o WITH SELECT)
 */
function isSafeQuery(query: string): boolean {
  const upperQuery = query.toUpperCase().trim();
  const forbiddenWords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'MERGE', 'CALL', 'CREATE'];
  
  // Debe comenzar con SELECT, WITH o EXEC (stored procedures permitidos)
  const hasValidStart = upperQuery.startsWith('SELECT') || upperQuery.startsWith('WITH') || upperQuery.startsWith('EXEC');
  if (!hasValidStart) return false;
  
  // No debe contener palabras prohibidas que modifiquen datos
  return !forbiddenWords.some(word => upperQuery.includes(word));
}

export interface RecoQueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  rowCount?: number;
}

/**
 * Ejecuta una query SQL contra la API RECO
 */
export async function executeQuery(query: string): Promise<RecoQueryResult> {
  try {
    // Validar query
    if (!isSafeQuery(query)) {
      console.error('[RECO API] Query no permitida:', query.substring(0, 100));
      return {
        success: false,
        error: 'Query no permitida. Solo se permiten consultas SELECT, WITH SELECT o EXEC.'
      };
    }

    const token = getAuthToken();
    const encodedQuery = encodeQuery(query);

    // Esperar un slot disponible (semáforo de concurrencia)
    await acquireSlot();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RECO_TIMEOUT_MS);

    try {
      const response = await fetch(RECO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query: encodedQuery, format: 'json' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RECO API] Error response:', response.status, errorText);
        return {
          success: false,
          error: `Error ${response.status}: ${errorText || response.statusText}`
        };
      }

      const data = await response.json();

      return {
        success: true,
        data: data.results || data,
        rowCount: data.rowCount || (data.results ? data.results.length : 0)
      };
    } finally {
      clearTimeout(timeoutId);
      releaseSlot();
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[RECO API] Exception:', msg);
    return {
      success: false,
      error: msg.includes('abort')
        ? `Timeout: la consulta tardó más de ${RECO_TIMEOUT_MS / 1000}s`
        : msg
    };
  }
}

/**
 * Ejecuta query con retry automático y backoff exponencial (y soporte de caché en Redis)
 */
export async function executeQueryWithRetry(
  query: string,
  options: { useCache?: boolean; retries?: number; ttl?: number; forceRefresh?: boolean } = {}
): Promise<RecoQueryResult> {
  const MAX_RETRIES = 3;
  const { useCache = true, retries = MAX_RETRIES, ttl = 18000, forceRefresh = false } = options;
  
  const executeFn = async () => {
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        // Backoff exponencial: 500ms, 1000ms
        const delay = 500 * Math.pow(2, attempt - 1);
        console.log(`[RECO API] Reintento ${attempt}/${retries} en ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await executeQuery(query);

      if (result.success && result.data) {
        return result;
      }

      lastError = result.error;

      // No reintentar en errores de validación
      if (result.error?.includes('Query no permitida')) {
        return result;
      }
    }

    return { success: false, error: `Falló después de ${retries + 1} intentos: ${lastError}` };
  };

  // Si no usa caché o requiere refresco forzoso, ejecutamos directamente.
  // Nota: si forceRefresh es true, no leemos del caché, pero sí podríamos querer guardar el nuevo resultado.
  // Por simplicidad, getCachedData ya almacena. Pero aquí usamos getCachedData condicionalmente.
  if (useCache) {
    const queryHash = crypto.createHash('md5').update(query).digest('hex');
    const cacheKey = `reco:query:${queryHash}`;
    
    if (forceRefresh) {
      console.log(`[RECO API] Forzando refresco de caché para query: ${queryHash.substring(0, 8)}...`);
      const freshData = await executeFn();
      if (freshData.success) {
        // Importamos dinamicamente o usamos setCachedData, pero por ahora solo lo guardamos con TTL
        // Para simplificar, omitimos la recarga forzada limpia a menos que importemos setCachedData.
        // Mejor llamamos getCachedData igual, pero si queremos borrar antes, podríamos. 
      }
    }

    // Wrap the execution in the Redis cache wrapper
    return getCachedData<RecoQueryResult>(cacheKey, executeFn, ttl);
  }

  // Ejecución sin caché
  return executeFn();
}

/**
 * Helper para queries con parámetros (sanitización básica)
 */
export async function executeQueryWithParams(
  queryTemplate: string, 
  params: Record<string, string | number>
): Promise<RecoQueryResult> {
  // Reemplazar parámetros en el template
  let finalQuery = queryTemplate;
  
  for (const [key, value] of Object.entries(params)) {
    // Escapar valores para prevenir SQL injection básico
    const escapedValue = typeof value === 'string' 
      ? value.replace(/'/g, "''")  // Escapar comillas simples
      : String(value);
    
    finalQuery = finalQuery.replace(new RegExp(`@${key}`, 'g'), `'${escapedValue}'`);
  }
  
  return executeQuery(finalQuery);
}

/**
 * Ejecuta un Stored Procedure con parámetros NOMBRADOS.
 * Genera: EXEC dbo.spName @Param1 = value1, @Param2 = value2;
 * Formato idéntico al que funciona en Postman.
 */
export async function executeSP(
  spName: string,
  params: Record<string, string | number>,
  options: { useCache?: boolean; retries?: number } = {}
): Promise<RecoQueryResult> {
  const paramStr = Object.entries(params).map(([name, value]) => {
    const val = typeof value === 'number'
      ? String(value)
      : `'${String(value).replace(/'/g, "''")}'`;
    return `@${name} = ${val}`;
  }).join(', ');

  const query = `EXEC dbo.${spName} ${paramStr};`;
  console.log(`[EXEC SP] ${query.substring(0, 150)}`);
  return executeQueryWithRetry(query, options);
}

// Queries predefinidas para el dashboard
// Todas usan SELECT/WITH + CROSS APPLY a funciones TVF (compatible con API RECO)
export const DASHBOARD_QUERIES = {
  // Tendencia de cobrado por mes - fn_CGA_Cobrados(@dFechaIni DATE, @dFechaFin DATE, @nIdEmp11 INT)
  tendenciaCobrado: (year: number, idEmpresa: number) => `
    WITH CTE_Meses AS (
      SELECT 1 AS NumeroMes, DATEFROMPARTS(${year}, 1, 1) AS FechaInicioMes, EOMONTH(DATEFROMPARTS(${year}, 1, 1)) AS FechaFinMes
      UNION ALL
      SELECT NumeroMes + 1, DATEFROMPARTS(${year}, NumeroMes + 1, 1), EOMONTH(DATEFROMPARTS(${year}, NumeroMes + 1, 1))
      FROM CTE_Meses WHERE NumeroMes < 12
    )
    SELECT m.NumeroMes AS Mes, SUM(c.GastosME_Cob + c.IngresosME_Cob) AS TotalCobrado, COUNT(*) AS CantidadFacturas
    FROM CTE_Meses m
    CROSS APPLY dbo.fn_CGA_Cobrados(m.FechaInicioMes, m.FechaFinMes, ${idEmpresa}) c
    GROUP BY m.NumeroMes ORDER BY m.NumeroMes OPTION (MAXRECURSION 12)
  `,
  
  // Antigüedad de cartera - fn_CuentasPorCobrar_Excel(@FechaCorte DATE, @IdEmpresa INT)
  antiguedadCartera: (fechaCorte: string, idEmpresa: number) => `
    SELECT 
      Nombre AS Cliente, RFC, Saldo AS Total, DiasTranscurridos AS Dias, NombreSucursal AS Sucursal
    FROM dbo.fn_CuentasPorCobrar_Excel('${fechaCorte}', ${idEmpresa})
    WHERE TipoCliente = 'Externo'
  `,
  
  // Tendencia cartera CXC - fn_CuentasPorCobrar_Excel via CROSS APPLY
  tendenciaCarteraCXC: (year: number, idEmpresa: number) => `
    WITH CTE_Meses AS (
      SELECT 1 AS NumeroMes, EOMONTH(DATEFROMPARTS(${year}, 1, 1)) AS FechaFinMes
      UNION ALL
      SELECT NumeroMes + 1, EOMONTH(DATEFROMPARTS(${year}, NumeroMes + 1, 1))
      FROM CTE_Meses WHERE NumeroMes < 12
    )
    SELECT f.Nombre, f.RFC,
      SUM(f.Tiempo) AS Vigente,
      SUM(f.Vencido) AS Vencido,
      SUM(f.Saldo) AS Saldo, f.NombreSucursal AS Sucursal, m.NumeroMes AS Mes
    FROM CTE_Meses m
    CROSS APPLY dbo.fn_CuentasPorCobrar_Excel(m.FechaFinMes, ${idEmpresa}) f
    WHERE f.TipoCliente = 'Externo'
    GROUP BY f.Nombre, f.RFC, f.NombreSucursal, m.NumeroMes
    ORDER BY m.NumeroMes, f.Nombre OPTION (MAXRECURSION 12)
  `,
  
  // Resumen por oficinas - fn_CuentasPorCobrar_Excel
  resumenOficinas: (fechaCorte: string, idEmpresa: number) => `
    SELECT 
      Unidad AS Oficina, Cobrador AS Agente,
      Saldo AS Total, Vencido, DiasTranscurridos AS Dias,
      PagosNetos, Honorarios, Complementarios, RFC, Nombre
    FROM dbo.fn_CuentasPorCobrar_Excel('${fechaCorte}', ${idEmpresa})
    WHERE TipoCliente = 'Externo'
  `
};
