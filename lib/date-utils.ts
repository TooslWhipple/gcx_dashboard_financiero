// lib/date-utils.ts
// Helpers para manejar fechas consistentes en zona horaria de México (CDT/CST)
// Evita problemas de UTC vs local cuando el servidor o cliente están en otras zonas

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD según la zona horaria local del navegador (cliente).
 * Usar en componentes 'use client'.
 */
export function getLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD según la zona horaria de México.
 * Usar en API routes (servidor) como fallback cuando no se recibe fecha del cliente.
 */
export function getMexicoDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}
