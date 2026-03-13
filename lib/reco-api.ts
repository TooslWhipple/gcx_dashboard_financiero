// lib/reco-api.ts
// Cliente para API RECO - SQL Query Service
// http://rws.grucas.com:19287/api/reco/encoded

const RECO_API_URL = process.env.RECO_API_URL || 'http://rws.grucas.com:19287/api/reco/encoded';
const RECO_TIMEOUT_MS = 25000; // 25s para caber dentro del límite de 30s de Netlify Functions

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
 * Codifica credenciales en Base64 (username:password)
 */
function getAuthToken(): string {
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
  const upperQuery = query.toUpperCase();
  const forbiddenWords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'EXEC', 'MERGE', 'CALL', 'CREATE'];
  
  // Debe comenzar con SELECT o WITH
  const hasSelect = upperQuery.trim().startsWith('SELECT') || upperQuery.trim().startsWith('WITH');
  if (!hasSelect) return false;
  
  // No debe contener palabras prohibidas
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
        error: 'Query no permitida. Solo se permiten consultas SELECT o WITH SELECT.'
      };
    }

    const token = getAuthToken();
    const encodedQuery = encodeQuery(query);

    // AbortController para respetar timeout de Netlify Functions (10s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RECO_TIMEOUT_MS);

    try {
      const response = await fetch(RECO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${token}`,
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
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[RECO API] Exception:', msg);
    return {
      success: false,
      error: msg.includes('abort') ? 'Timeout: la consulta tardó más de 9 segundos' : msg
    };
  }
}

/**
 * Ejecuta query con retry automático y backoff exponencial
 */
export async function executeQueryWithRetry(
  query: string,
  options: { useCache?: boolean; retries?: number } = {}
): Promise<RecoQueryResult> {
  const MAX_RETRIES = 3;
  const { useCache = false, retries = MAX_RETRIES } = options;
  
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
