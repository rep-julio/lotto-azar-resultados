import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProyeccion } from "@/hooks/useProyeccion";
import { useSorteosContext } from "@/context/SorteosContext";
import { HOURS_LIST } from "@/data/mockData";

/**
 * Convierte "09:00 AM" / "01:00 PM" a hora numérica (0-23).
 */
function hourStrToNum(hourStr: string): number {
  const [timePart, period] = hourStr.split(" ");
  let [h] = timePart.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h;
}

/**
 * Devuelve el string de la próxima hora de sorteo.
 */
function getNextHourString(): string {
  const currentH = new Date().getHours();
  for (let i = 0; i < HOURS_LIST.length; i++) {
    if (hourStrToNum(HOURS_LIST[i]) > currentH) return HOURS_LIST[i];
  }
  return HOURS_LIST[0]; // primer sorteo del día siguiente
}

const ForecastTicker = () => {
  const { results } = useSorteosContext();
  const { proyeccion, lastUpdated } = useProyeccion(results, 6, 4 * 60 * 60 * 1000);

  const [nextHour, setNextHour] = useState(getNextHourString);
  const [visible, setVisible] = useState(true);

  // Actualizar la hora próxima cada minuto
  useEffect(() => {
    const id = setInterval(() => {
      const next = getNextHourString();
      if (next !== nextHour) {
        setVisible(false);
        setTimeout(() => {
          setNextHour(next);
          setVisible(true);
        }, 400);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [nextHour]);

  // Cuando cambie la proyección, hacer parpadear para indicar actualización
  useEffect(() => {
    setVisible(false);
    const id = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(id);
  }, [lastUpdated]);

  const [timePart, period] = nextHour.split(" ");
  const displayLabel = `${timePart} ${period}`;

  return (
    <div
      className="w-full bg-background border-b border-border px-3 py-1.5 shadow-sm"
      role="region"
      aria-label="Proyección de animales por sorteo"
    >
      <div className="flex items-center gap-3 max-w-screen-lg mx-auto">
        {/* Etiqueta izquierda */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] sm:text-[13px] md:text-sm font-black text-blue-900 dark:text-blue-400 uppercase tracking-widest leading-none">
            🔮 Proyección Sorteo
          </span>
          <span className="text-[11px] sm:text-[13px] md:text-sm text-slate-600 dark:text-slate-400 leading-none font-bold">
            {displayLabel}
          </span>
        </div>

        {/* Divisor */}
        <div className="hidden sm:block w-px h-6 bg-slate-300 dark:bg-slate-700 shrink-0 mx-1" />

        {/* Animales proyectados */}
        <AnimatePresence mode="wait">
          {visible && (
            <motion.div
              key={lastUpdated.getTime()}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex items-center gap-2 flex-1 overflow-x-auto pb-0.5 sm:pb-0"
              style={{ scrollbarWidth: "none" }}
            >
              {proyeccion.length === 0 ? (
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic font-medium">
                  Calculando proyección…
                </span>
              ) : (
                proyeccion.map((p, i) => {
                  return (
                    <motion.div
                      key={`${p.name}-${i}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.07, duration: 0.25 }}
                      className="flex shrink-0 items-center gap-1.5 bg-card border border-border rounded px-2 py-1 shadow-sm"
                      title={`Proyección activa: ${p.name} · Número: ${p.number}`}
                    >
                      <span className="text-sm sm:text-base leading-none drop-shadow-sm">{p.emoji}</span>
                      <span className="text-[11px] sm:text-xs font-bold text-foreground leading-none">
                        {p.name}
                      </span>
                      {/* Número — visible en todos los tamaños */}
                      <span className="text-[10px] font-black text-muted-foreground leading-none ml-0.5">
                        {p.number}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicador "en vivo" */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0 pl-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none hidden sm:inline">
            en vivo
          </span>
        </div>
      </div>
    </div>
  );
};

export default ForecastTicker;
