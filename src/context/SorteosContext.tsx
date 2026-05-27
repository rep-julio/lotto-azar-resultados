/**
 * SorteosContext — Ejecuta useSorteos() UNA SOLA VEZ para toda la app.
 *
 * Problema que resuelve:
 *   Antes: Index.tsx, HeroSection.tsx y ForecastTicker.tsx instanciaban useSorteos()
 *   por separado → 3 WebSockets a Realtime + 3 pollings cada 30 s por visitante.
 *
 *   Ahora: SorteosProvider ejecuta el hook una vez y expone los datos vía Context.
 *   Todos los componentes hijos consumen `useSorteosContext()` sin abrir conexiones extra.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useSorteos } from "@/hooks/useSorteos";
import type { LotteryResult } from "@/data/mockData";

/* ─── Tipos ────────────────────────────────────────────────────── */
interface SorteosContextValue {
  results: LotteryResult[];
  loading: boolean;
  /** true mientras se cargan lotes históricos antiguos en background */
  loadingHistory: boolean;
  error: string | null;
}

/* ─── Context ──────────────────────────────────────────────────── */
const SorteosContext = createContext<SorteosContextValue | null>(null);

/* ─── Provider ─────────────────────────────────────────────────── */
export function SorteosProvider({ children }: { children: ReactNode }) {
  // Una sola instancia del hook → un solo WebSocket + un solo polling
  const sorteosData = useSorteos();

  return (
    <SorteosContext.Provider value={sorteosData}>
      {children}
    </SorteosContext.Provider>
  );
}

/* ─── Hook consumidor ──────────────────────────────────────────── */
export function useSorteosContext(): SorteosContextValue {
  const ctx = useContext(SorteosContext);
  if (!ctx) {
    throw new Error("useSorteosContext debe usarse dentro de <SorteosProvider>");
  }
  return ctx;
}
