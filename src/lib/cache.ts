/**
 * cache.ts — Módulo central de caché localStorage para reducir egress en Supabase.
 *
 * Estrategia:
 *  - Guarda datos con timestamp para validar expiración (TTL).
 *  - Sorteos históricos NUNCA expiran (los resultados pasados son inmutables).
 *  - Probabilidades: TTL 24h. Pronósticos: TTL 1h.
 *  - Si localStorage está lleno o falla, se ignora silenciosamente y se usa Supabase normal.
 */

const CACHE_PREFIX = "lotto_cache_";

interface CacheEntry<T> {
  data: T;
  timestamp: number; // Date.now()
}

/** Lee un valor cacheado. Retorna null si no existe o si expiró. */
export function getCached<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;
    if (age > maxAgeMs) return null; // expirado
    return entry.data;
  } catch {
    return null;
  }
}

/** Guarda un valor en caché con timestamp actual. */
export function setCached<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage lleno o deshabilitado: ignorar silenciosamente
  }
}

/**
 * Lee datos cacheados ignorando el TTL (útil para datos inmutables como historial).
 * Retorna null solo si la clave no existe.
 */
export function getCachedForever<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch {
    return null;
  }
}

/** Invalida una clave de caché específica (o todas si no se pasa ninguna). */
export function clearCache(key?: string): void {
  try {
    if (key) {
      localStorage.removeItem(CACHE_PREFIX + key);
    } else {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(CACHE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    // ignorar
  }
}

// ── Claves de caché compartidas ────────────────────────────────
export const CACHE_KEYS = {
  SORTEOS: "sorteos",
  PROBABILIDADES: "probabilidades",
  PRONOSTICOS: "pronosticos",
} as const;

// ── TTLs recomendados ──────────────────────────────────────────
export const CACHE_TTL = {
  /** Probabilidades: cambian solo cuando el admin edita */
  PROBABILIDADES_MS: 24 * 60 * 60 * 1000, // 24 horas
  /** Pronósticos: cambian raramente durante el día */
  PRONOSTICOS_MS: 60 * 60 * 1000, // 1 hora
} as const;
