/**
 * usePronosticos — Lee los pronósticos de la tabla `pronosticos` en Supabase.
 * - Caché localStorage de 1 hora (los pronósticos cambian raramente en el día).
 * - SIN suscripción Realtime (innecesario para datos que cambian poco).
 * - Si hay caché válida, no llama a Supabase → 0 egress en visitas repetidas.
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export interface Pronostico {
  id: number;
  hora: string;
  loteria: string;
  animal: string;
  numero: number;
  emoji?: string;
}

interface UsePronosticosResult {
  pronosticos: Pronostico[];
  loading: boolean;
  error: string | null;
}

export function usePronosticos(): UsePronosticosResult {
  // Inicializar desde caché inmediatamente (sin spinner visible)
  const [pronosticos, setPronosticos] = useState<Pronostico[]>(() => {
    return getCached<Pronostico[]>(CACHE_KEYS.PRONOSTICOS, CACHE_TTL.PRONOSTICOS_MS) ?? [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPronosticos = useCallback(async () => {
    // Si hay caché válida (< 1 hora), usarla directamente
    const cached = getCached<Pronostico[]>(CACHE_KEYS.PRONOSTICOS, CACHE_TTL.PRONOSTICOS_MS);
    if (cached && cached.length > 0) {
      setPronosticos(cached);
      setLoading(false);
      return;
    }

    // Caché expirada o vacía → fetch a Supabase
    setLoading(true);
    setError(null);

    const { data, error: sbErr } = await supabase
      .from("pronosticos")
      .select("id, hora, loteria, animal, numero")
      .order("hora", { ascending: true });

    if (sbErr) {
      setError(sbErr.message);
      setLoading(false);
      return;
    }

    // Adjuntar emoji desde el catálogo local
    const { ANIMALS } = await import("@/data/mockData");
    const mapped: Pronostico[] = (data ?? []).map((row: any) => ({
      id: row.id,
      hora: row.hora,
      loteria: row.loteria,
      animal: row.animal,
      numero: row.numero,
      emoji: ANIMALS.find((a) => a.name === row.animal)?.emoji ?? "🐾",
    }));

    // Guardar en caché por 1 hora
    setCached(CACHE_KEYS.PRONOSTICOS, mapped);
    setPronosticos(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPronosticos();
  }, [fetchPronosticos]);

  // NOTA: Suscripción Realtime ELIMINADA intencionalmente.
  // Los pronósticos los publica el admin esporádicamente durante el día.
  // Los usuarios ven la versión cacheada por hasta 1h sin consumir egress.
  // Si se requiere actualización inmediata en el futuro, se puede re-activar.

  return { pronosticos, loading, error };
}
