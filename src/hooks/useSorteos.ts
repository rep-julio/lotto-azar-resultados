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

// Polling de respaldo: cada 5 minutos (antes era cada 30 segundos)
const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useSorteos(): UseSorteosResult {
  // Inicializar desde caché inmediatamente (0ms de espera visible)
  const [results, setResults] = useState<LotteryResult[]>(() => {
    return getCachedForever<LotteryResult[]>(CACHE_KEYS.SORTEOS) ?? [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastHashRef = useRef<string>("");

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

    async function fetchSorteos(silent = false) {
      if (!silent) setLoading(true);
      setError(null);

      // ── Fetch delta: solo pedir datos desde la última fecha cacheada ──
      // Los sorteos históricos son inmutables → no hace falta re-descargarlos.
      // Solo traemos desde la fecha más reciente que ya tenemos, o solo hoy si no hay caché.
      const cached = getCachedForever<LotteryResult[]>(CACHE_KEYS.SORTEOS) ?? [];
      const today = getTodayStrVE();

      // La fecha "desde" es el max entre: 7 días atrás (para tener historial mínimo visible)
      // o la fecha más reciente cacheada (para no re-descargar lo que ya tenemos).
      // Si no hay caché: bajar 90 días para la primera carga.
      let fromDate: string;
      if (cached.length === 0) {
        // Primera visita: bajar 90 días de historial
        const d = new Date();
        d.setDate(d.getDate() - 90);
        fromDate = d.toISOString().split("T")[0];
      } else {
        // Visitas siguientes: solo pedir desde ayer (para cubrir cambios del día anterior y hoy)
        const d = new Date();
        d.setDate(d.getDate() - 1);
        fromDate = d.toISOString().split("T")[0];
      }

      const { data, error: sbError } = await supabase
        .from("sorteos")
        .select("id, animal, numero, hora, fecha, emoji")
        .gte("fecha", fromDate)          // ← Fetch delta: solo desde la última fecha
        .order("fecha", { ascending: false })
        .order("hora", { ascending: true })
        .limit(200);

      if (cancelled) return;

      if (sbError) {
        console.error("[useSorteos] Error al obtener sorteos:", sbError.message);
        setError(sbError.message);
        // Si hay caché, seguir mostrándola aunque falle Supabase
        if (cached.length > 0 && !silent) setLoading(false);
        else setLoading(false);
        return;
      }

      const incoming = (data as SorteoRow[]).map(rowToResult);

      // Fusionar con caché existente
      const merged = mergeResults(cached, incoming);

      // Solo actualizar el estado si hubo cambios reales
      const newHash = hashIds(merged);
      if (silent && newHash === lastHashRef.current) return;
      lastHashRef.current = newHash;

      // Guardar en caché para las próximas visitas
      setCached(CACHE_KEYS.SORTEOS, merged);

      setResults(merged);
      setLoading(false);
    }

    fetchSorteos();

    // Suscripción en tiempo real vía WebSocket de Supabase
    const channel = supabase
      .channel("sorteos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sorteos" },
        () => {
          if (!cancelled) fetchSorteos(true);
        }
      )
      .subscribe();

    // Polling de respaldo cada 5 min (antes 30s) — solo busca delta
    const pollInterval = setInterval(() => {
      if (!cancelled) fetchSorteos(true);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
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

  return { results: visibleResults, loading, error };
}
