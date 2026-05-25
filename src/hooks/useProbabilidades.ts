/**
 * useProbabilidades — Lee las probabilidades de la tabla `probabilidades` en Supabase.
 * - Si la tabla no existe o está vacía, hace fallback a ANIMAL_WEIGHTS del mockData.
 * - Expone `weights` como Record<string, number> compatible con useProyeccion.
 * - Caché localStorage de 24 horas (las probabilidades solo cambia el admin).
 * - SIN suscripción Realtime en la página pública (innecesario + genera egress).
 *   El admin invalida la caché cuando guarda cambios vía PROB_UPDATED_EVENT.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ANIMAL_WEIGHTS } from "@/data/mockData";
import { LS_WEIGHTS_KEY } from "@/hooks/useProyeccion";
import { getCached, setCached, clearCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export interface ProbabilidadRow {
  id: number;
  animal: string;
  emoji: string;
  numero: string;
  peso: number;
  activo: boolean;
  created_at?: string;
  updated_at: string;
}

export interface UseProbabilidadesResult {
  rows: ProbabilidadRow[];
  weights: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Event name para notificar cambios internos
export const PROB_UPDATED_EVENT = "lotto-probabilidades-updated";

/** Convierte filas de Supabase en Record<name, peso> */
function rowsToWeights(rows: ProbabilidadRow[]): Record<string, number> {
  return Object.fromEntries(
    rows.filter((r) => r.activo).map((r) => [r.animal, r.peso])
  );
}

export function useProbabilidades(): UseProbabilidadesResult {
  // Inicializar desde caché inmediatamente
  const [rows, setRows] = useState<ProbabilidadRow[]>(() => {
    return getCached<ProbabilidadRow[]>(CACHE_KEYS.PROBABILIDADES, CACHE_TTL.PROBABILIDADES_MS) ?? [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    // Si hay caché válida (< 24h), usarla directamente sin llamar a Supabase
    const cached = getCached<ProbabilidadRow[]>(CACHE_KEYS.PROBABILIDADES, CACHE_TTL.PROBABILIDADES_MS);
    if (cached && cached.length > 0) {
      setRows(cached);
      setIsLoading(false);
      // Sincronizar weights con localStorage para useProyeccion
      try {
        const weightsMap = rowsToWeights(cached);
        localStorage.setItem(LS_WEIGHTS_KEY, JSON.stringify(weightsMap));
        window.dispatchEvent(new Event("lotto-weights-updated"));
      } catch { /* ignorar */ }
      return;
    }

    // Caché expirada o vacía → fetch a Supabase
    try {
      setIsLoading(true);
      const { data, error: fetchErr } = await supabase
        .from("probabilidades")
        .select("id, animal, emoji, numero, peso, activo, updated_at")
        .order("peso", { ascending: false });

      if (fetchErr) throw fetchErr;

      const fetched = (data ?? []) as ProbabilidadRow[];
      setRows(fetched);
      setError(null);

      if (fetched.length > 0) {
        // Guardar en caché por 24 horas
        setCached(CACHE_KEYS.PROBABILIDADES, fetched);

        // Sincronizar con localStorage para useProyeccion
        const weightsMap = rowsToWeights(fetched);
        try {
          localStorage.setItem(LS_WEIGHTS_KEY, JSON.stringify(weightsMap));
          window.dispatchEvent(new Event("lotto-weights-updated"));
        } catch { /* ignorar */ }
      }
    } catch (err: any) {
      console.warn("useProbabilidades: error fetching from Supabase:", err);
      setError(err?.message ?? "Error desconocido");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Escuchar evento local del admin: invalida caché y hace refetch fresco
  useEffect(() => {
    const onAdminUpdate = () => {
      // Admin guardó cambios → invalidar caché y refrescar
      clearCache(CACHE_KEYS.PROBABILIDADES);
      fetchRows();
    };
    window.addEventListener(PROB_UPDATED_EVENT, onAdminUpdate);
    return () => window.removeEventListener(PROB_UPDATED_EVENT, onAdminUpdate);
  }, [fetchRows]);

  // NOTA: Suscripción Realtime ELIMINADA intencionalmente.
  // Las probabilidades las gestiona solo el admin → no necesita push en tiempo real
  // para los usuarios públicos. Esto elimina una conexión WebSocket extra por visitante.
  // El admin usa refetch() manual después de guardar, que también dispara PROB_UPDATED_EVENT.

  // Calcular weights (activos solamente)
  const weights: Record<string, number> =
    rows.length > 0 ? rowsToWeights(rows) : ANIMAL_WEIGHTS;

  return { rows, weights, isLoading, error, refetch: fetchRows };
}
