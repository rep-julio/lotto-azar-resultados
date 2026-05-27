import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LotteryResult, ANIMALS } from "@/data/mockData";
import { getCachedForever, setCached, CACHE_KEYS } from "@/lib/cache";

interface SorteoRow {
  id: number;
  animal: string;
  numero: number;
  hora: string;
  fecha: string;
  emoji: string;
}

interface UseSorteosResult {
  results: LotteryResult[];
  loading: boolean;
  /** true mientras se cargan lotes antiguos en background */
  loadingHistory: boolean;
  error: string | null;
}

/** Hora actual en Venezuela (UTC-4) */
function nowInVenezuela(): { h: number; m: number; s: number } {
  const now = new Date();
  const offsetMs = -4 * 60 * 60 * 1000;
  const ve = new Date(now.getTime() + offsetMs + now.getTimezoneOffset() * 60 * 1000);
  return { h: ve.getHours(), m: ve.getMinutes(), s: ve.getSeconds() };
}

/** Obtenemos string YYYY-MM-DD en hora VE */
function getTodayStrVE(): string {
  const now = new Date();
  const offsetMs = -4 * 60 * 60 * 1000;
  const ve = new Date(now.getTime() + offsetMs + now.getTimezoneOffset() * 60 * 1000);
  return ve.toISOString().split("T")[0];
}

/** Pasa '08:00 AM' a 8, '01:00 PM' a 13 */
function hourStrToNum(hourStr: string): number {
  const [timePart, period] = hourStr.split(" ");
  let [h] = timePart.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h;
}

/** Convierte una fila de Supabase al formato LotteryResult */
function rowToResult(row: SorteoRow): LotteryResult {
  const catalogEmoji = ANIMALS.find((a) => a.name === row.animal)?.emoji ?? row.emoji;
  return {
    id: row.id,
    animal: row.animal,
    number: row.numero,
    hour: row.hora,
    date: row.fecha,
    emoji: catalogEmoji,
  };
}

/**
 * Fusiona resultados nuevos con los cacheados.
 * Usa el id como clave única para evitar duplicados.
 * Ordena: fecha desc, hora asc.
 */
function mergeResults(cached: LotteryResult[], incoming: LotteryResult[]): LotteryResult[] {
  const map = new Map<number, LotteryResult>();
  for (const r of cached) map.set(r.id, r);
  for (const r of incoming) map.set(r.id, r); // incoming sobreescribe
  return Array.from(map.values()).sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return a.hour.localeCompare(b.hour);
  });
}

/** Hash ligero para detectar cambios sin deep-compare. */
function hashIds(rows: LotteryResult[]): string {
  return rows.map((r) => r.id).sort((a, b) => a - b).join(",");
}

/** Suma/resta días a una fecha string YYYY-MM-DD */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Polling Inteligente — calcula el intervalo óptimo en ms:
 *
 * - Minutos :58 y :59 de cada hora → "Modo Cacería" cada 10s
 *   (el admin publica entre 12:55 y 12:58 → la app baja el dato
 *   y lo mantiene OCULTO hasta que el reloj marque la hora exacta)
 *
 * - Minuto :00 de cada hora → cada 20s (ventana de gracia por si
 *   el admin publicó justo en el minuto :00)
 *
 * - Resto del tiempo → cada 5 minutos (modo ahorro)
 */
function getPollingInterval(): number {
  const { m } = nowInVenezuela();
  if (m === 58 || m === 59) return 10_000;   // Modo Cacería: cada 10s
  if (m === 0)               return 20_000;   // Ventana de gracia: cada 20s
  return 5 * 60 * 1000;                       // Modo Ahorro: cada 5 min
}

/** Descarga un lote de datos entre dos fechas (inclusivo). Devuelve los resultados o null si hubo error. */
async function fetchBatch(fromDate: string, toDate: string): Promise<LotteryResult[] | null> {
  const { data, error } = await supabase
    .from("sorteos")
    .select("id, animal, numero, hora, fecha, emoji")
    .gte("fecha", fromDate)
    .lte("fecha", toDate)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: true })
    .limit(2000); // 60 días × ~12 sorteos/día = ~720 max

  if (error) {
    console.error("[useSorteos] Error en lote:", fromDate, "→", toDate, error.message);
    return null;
  }
  return (data as SorteoRow[]).map(rowToResult);
}

/** Genera los rangos de lotes desde `oldestDate` hasta `newestDate`, en bloques de `chunkDays` días (más reciente primero). */
function buildChunks(newestDate: string, oldestDate: string, chunkDays = 60): Array<{ from: string; to: string }> {
  const chunks: Array<{ from: string; to: string }> = [];
  let to = newestDate;
  while (to > oldestDate) {
    const from = addDays(to, -chunkDays + 1);
    chunks.push({ from: from < oldestDate ? oldestDate : from, to });
    to = addDays(from, -1);
  }
  return chunks;
}

/** Límite máximo del historial: 2 años atrás desde hoy */
function getHistoryStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 730);
  return d.toISOString().split("T")[0];
}

export function useSorteos(): UseSorteosResult {
  // Inicializar desde caché inmediatamente (0ms de espera visible)
  const [results, setResults] = useState<LotteryResult[]>(() => {
    return getCachedForever<LotteryResult[]>(CACHE_KEYS.SORTEOS) ?? [];
  });
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastHashRef = useRef<string>("");
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reloj reactivo para revelar el sorteo puntualmente al iniciar su hora
  const [currentH, setCurrentH] = useState(() => nowInVenezuela().h);

  useEffect(() => {
    const clock = setInterval(() => {
      const { h } = nowInVenezuela();
      setCurrentH(prev => (prev !== h ? h : prev));
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    let cancelled = false;

    /**
     * Actualiza el estado y la caché con los resultados fusionados.
     * Devuelve el array ya truncado a 2 años.
     */
    function applyAndCache(current: LotteryResult[], incoming: LotteryResult[]): LotteryResult[] {
      const merged = mergeResults(current, incoming);
      const cutoffStr = getHistoryStartDate();
      const trimmed = merged.filter((r) => r.date >= cutoffStr);
      setCached(CACHE_KEYS.SORTEOS, trimmed);
      return trimmed;
    }

    // ── FASE 1: datos recientes (últimos 30 días) → UI visible rápido ──
    async function fetchRecent() {
      setLoading(true);
      setError(null);

      const today = getTodayStrVE();
      const from30 = addDays(today, -30);

      const recent = await fetchBatch(from30, today);
      if (cancelled) return;

      if (recent === null) {
        // Intentar mostrar datos cacheados si los hay
        const cached = getCachedForever<LotteryResult[]>(CACHE_KEYS.SORTEOS) ?? [];
        setResults(cached);
        setError("Error al cargar datos recientes");
        setLoading(false);
        return;
      }

      // Fusionar con caché existente y mostrar
      const cached = getCachedForever<LotteryResult[]>(CACHE_KEYS.SORTEOS) ?? [];
      const trimmed = applyAndCache(cached, recent);
      const newHash = hashIds(trimmed);
      lastHashRef.current = newHash;
      setResults(trimmed);
      setLoading(false);

      // ── FASE 2: histórico antiguo en background (lotes de 60 días) ──
      fetchHistoryInBackground(from30);
    }

    // ── FASE 2: carga progresiva del historial en segundo plano ──
    async function fetchHistoryInBackground(newestAlreadyLoaded: string) {
      const historyStart = getHistoryStartDate();
      // Si ya tenemos todo el historial en caché, no hace falta volver a bajarlo
      const cached = getCachedForever<LotteryResult[]>(CACHE_KEYS.SORTEOS) ?? [];
      const oldestCached = cached.length > 0
        ? cached.reduce((min, r) => r.date < min ? r.date : min, cached[0].date)
        : newestAlreadyLoaded;

      // Si la caché ya llega al inicio del historial, saltamos la descarga
      if (oldestCached <= historyStart) {
        scheduleNextPoll(true);
        return;
      }

      setLoadingHistory(true);

      // El día anterior al más antiguo cacheado es donde empezamos a bajar
      const downloadUntil = addDays(oldestCached, -1);
      const chunks = buildChunks(downloadUntil, historyStart, 60);

      for (const chunk of chunks) {
        if (cancelled) break;

        const batch = await fetchBatch(chunk.from, chunk.to);
        if (cancelled) break;
        if (batch === null) continue; // Si falla un lote, seguir con el siguiente

        // Fusionar con los datos actuales del estado
        setResults(prev => {
          const trimmed = applyAndCache(prev, batch);
          lastHashRef.current = hashIds(trimmed);
          return trimmed;
        });

        // Pequeña pausa entre lotes para no saturar Supabase
        await new Promise(res => setTimeout(res, 300));
      }

      if (!cancelled) {
        setLoadingHistory(false);
        scheduleNextPoll(true);
      }
    }

    // ── Fetch silencioso para el polling periódico (solo datos recientes) ──
    async function fetchSilent() {
      setError(null);
      const today = getTodayStrVE();
      const from = addDays(today, -1); // desde ayer basta para el polling

      const incoming = await fetchBatch(from, today);
      if (cancelled || incoming === null) return;

      const cached = getCachedForever<LotteryResult[]>(CACHE_KEYS.SORTEOS) ?? [];
      const trimmed = applyAndCache(cached, incoming);
      const newHash = hashIds(trimmed);

      if (newHash !== lastHashRef.current) {
        lastHashRef.current = newHash;
        setResults(trimmed);
      }

      scheduleNextPoll(true);
    }

    /**
     * Programa el próximo fetch con el intervalo inteligente.
     * Usamos setTimeout recursivo en lugar de setInterval para que
     * el intervalo se recalcule dinámicamente en cada ciclo.
     */
    function scheduleNextPoll(silent: boolean) {
      if (cancelled) return;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      const delay = getPollingInterval();
      pollTimerRef.current = setTimeout(() => {
        if (!cancelled) {
          if (silent) fetchSilent();
          else fetchRecent();
        }
      }, delay);
    }

    fetchRecent();

    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Filtro de gating temporal: jamás revelar resultados antes de la hora exacta
  const visibleResults = results.filter((r) => {
    const today = getTodayStrVE();
    if (r.date > today) return false;
    if (r.date === today) {
      const rh = hourStrToNum(r.hour);
      if (rh > currentH) return false;
    }
    return true;
  });

  return { results: visibleResults, loading, loadingHistory, error };
}
