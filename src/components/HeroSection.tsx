import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HOURS_LIST } from "@/data/mockData";
import { formatAnimalNumber } from "@/lib/utils";
import { useSorteosContext } from "@/context/SorteosContext";

/* ─── Helpers de tiempo ────────────────────────────────────────── */

/** Hora y minuto actuales en zona horaria Venezuela (UTC-4), sin depender de la TZ del navegador. */
function nowInVenezuela(): { h: number; m: number; s: number } {
  const now = new Date();
  // Venezuela es UTC-4 fijo (sin horario de verano)
  const offsetMs = -4 * 60 * 60 * 1000;
  const ve = new Date(now.getTime() + offsetMs + now.getTimezoneOffset() * 60 * 1000);
  return { h: ve.getHours(), m: ve.getMinutes(), s: ve.getSeconds() };
}

function hourStrToNum(hourStr: string): number {
  const [timePart, period] = hourStr.split(" ");
  let [h] = timePart.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h;
}

/**
 * Índice del sorteo activo = el último cuya hora YA pasó.
 * Si aún no empezó ninguno (antes de las 8 AM) retorna 0.
 */
function getCurrentHourIndex(): number {
  const { h } = nowInVenezuela();
  let best = -1;
  for (let i = 0; i < HOURS_LIST.length; i++) {
    if (hourStrToNum(HOURS_LIST[i]) <= h) best = i;
  }
  return best === -1 ? 0 : best;
}

function getTodayStr(): string {
  // Fecha en Venezuela (UTC-4)
  const now = new Date();
  const offsetMs = -4 * 60 * 60 * 1000;
  const ve = new Date(now.getTime() + offsetMs + now.getTimezoneOffset() * 60 * 1000);
  return ve.toISOString().split("T")[0];
}

/**
 * Segundos exactos hasta el PRÓXIMO sorteo a partir de ahora.
 * Busca el primer sorteo cuya hora de inicio aún NO ha llegado.
 * Si ya pasaron todos, retorna 0.
 */
function secondsToNext(activeIdx: number): number {
  const { h, m, s } = nowInVenezuela();
  const nowTotalSec = h * 3600 + m * 60 + s;

  // Buscar el primer sorteo futuro (hora > hora actual)
  for (let i = 0; i < HOURS_LIST.length; i++) {
    const sorteoH = hourStrToNum(HOURS_LIST[i]);
    const sorteoSec = sorteoH * 3600;
    if (sorteoSec > nowTotalSec) {
      return sorteoSec - nowTotalSec;
    }
  }
  // Ya pasaron todos los sorteos del día
  return 0;
}

/* ─── Partículas flotantes ─────────────────────────────────────── */
const LOTTERY_ICONS = ["🎰", "🎲", "💰", "⭐", "🌟", "💫", "🍀", "🎯", "🏆", "💎", "🃏", "🎴", "✨", "🪙", "🎊"];
function seeded(n: number) { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); }
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  icon: LOTTERY_ICONS[Math.floor(seeded(i) * LOTTERY_ICONS.length)],
  x: seeded(i + 50) * 95,
  y: seeded(i + 100) * 80,
  size: `${1 + seeded(i + 150) * 1.2}rem`,
  opacity: 0.2 + seeded(i + 200) * 0.4,
  duration: 4 + seeded(i + 250) * 5,
  delay: seeded(i + 300) * 4,
  drift: 30 + seeded(i + 350) * 50,
  rotate: seeded(i + 400) * 360 - 180,
  spin: (seeded(i + 450) > 0.5 ? 1 : -1) * (20 + seeded(i + 500) * 60),
}));

/* ─── Props ────────────────────────────────────────────────────── */
interface HeroSectionProps {
  updatedAgo: number;
}

/* ════════════════════════════════════════════════════════════════
   HeroSection — muestra el resultado real del sorteo de cada hora
═══════════════════════════════════════════════════════════════════ */
const HeroSection = ({ updatedAgo }: HeroSectionProps) => {
  const [activeIdx, setActiveIdx] = useState(getCurrentHourIndex);
  const [displayIdx, setDisplayIdx] = useState(getCurrentHourIndex);
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [countdown, setCountdown] = useState(() => secondsToNext(getCurrentHourIndex()));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Datos reales de sorteos
  const { results, loading } = useSorteosContext();
  const today = getTodayStr();

  /** Busca el resultado real para la hora mostrada. Si no existe, retorna null. */
  const getResult = useCallback(
    (idx: number) => {
      const hour = HOURS_LIST[idx];
      return results.find((r) => r.date === today && r.hour === hour) ?? null;
    },
    [results, today]
  );

  const displayResult = getResult(displayIdx);
  const isLive = displayIdx === activeIdx;

  const transitionTo = useCallback(
    (nextIdx: number, dir: "forward" | "back" = "forward") => {
      if (transitioning) return;
      setDirection(dir);
      setTransitioning(true);
      timerRef.current = setTimeout(() => {
        setDisplayIdx(nextIdx);
        setTransitioning(false);
      }, 450);
    },
    [transitioning]
  );

  // Tick del reloj: auto-cambio + countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const newIdx = getCurrentHourIndex();
      setCountdown(secondsToNext(newIdx));
      setActiveIdx((prev) => {
        if (newIdx !== prev) {
          transitionTo(newIdx, "forward");
          return newIdx;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [transitionTo]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleChipClick = (idx: number) => {
    if (idx === displayIdx || transitioning) return;
    transitionTo(idx, idx > displayIdx ? "forward" : "back");
  };

  const hrs = Math.floor(countdown / 3600);
  const mins = String(Math.floor((countdown % 3600) / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");

  // Variantes de animación framer-motion
  const variants = {
    enterForward: { opacity: 0, x: 60, scale: 0.88 },
    enterBackward: { opacity: 0, x: -60, scale: 0.88 },
    center: { opacity: 1, x: 0, scale: 1 },
    exitForward: { opacity: 0, x: -60, scale: 0.88 },
    exitBackward: { opacity: 0, x: 60, scale: 0.88 },
  };

  return (
    <section
      className="w-full min-h-[46vh] sm:min-h-[54vh] flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-6 relative overflow-hidden"
      aria-label="Resultado del sorteo en vivo"
    >
      {/* ── Fondo ──────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/images/banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(6px)",
          transform: "scale(1.06)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: "rgba(6, 14, 48, 0.80)" }}
      />

      {/* ── Partículas flotantes ────────────────────────────────── */}
      {PARTICLES.map((p) => (
        <motion.span
          key={p.id}
          className="absolute pointer-events-none select-none z-[5]"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}
          initial={{ opacity: 0, y: 0, rotate: p.rotate }}
          animate={{
            opacity: [0, p.opacity, p.opacity, 0],
            y: [0, -p.drift, -p.drift * 1.6, -p.drift * 2.2],
            rotate: [p.rotate, p.rotate + p.spin],
            scale: [0.7, 1, 1, 0.7],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          {p.icon}
        </motion.span>
      ))}

      {/* ── Decorative circles ─────────────────────────────────── */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-blue-500/5 pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-blue-300/5 pointer-events-none" />

      {/* ══ Contenido principal ════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-md px-1">

        {/* Badge EN VIVO / Vista previa */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-2"
        >
          {isLive ? (
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white"
              style={{
                background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
                boxShadow: "0 0 0 0 rgba(59,130,246,0.5)",
                animation: "hpulse 2s infinite",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              En Vivo
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white"
              style={{ background: "linear-gradient(135deg,#6d28d9,#a855f7)" }}
            >
              👁 Vista previa
            </span>
          )}
        </motion.div>

        {/* Hora del resultado */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xs font-semibold tracking-widest uppercase mb-3"
          style={{ color: "#93c5fd" }}
        >
          Resultado de las {HOURS_LIST[displayIdx]}
        </motion.p>

        {/* ── Emoji animado con transición ───────────────────────── */}
        <div className="relative mb-2 sm:mb-3 w-20 h-20 sm:w-24 sm:h-24">
          {/* Halo */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)",
              filter: "blur(12px)",
              transform: "scale(1.4)",
            }}
          />
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={displayIdx}
              custom={direction}
              variants={variants}
              initial={direction === "forward" ? "enterForward" : "enterBackward"}
              animate="center"
              exit={direction === "forward" ? "exitForward" : "exitBackward"}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center"
                style={{
                  background: "#efefefe0",
                  border: "2px solid rgba(255,255,255,0.6)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.35), 0 0 0 6px rgba(255,255,255,0.1)",
                }}
              >
                {loading ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-400/50 border-t-blue-400 animate-spin" />
                ) : (
                  <motion.span
                    className="text-4xl sm:text-5xl leading-none select-none"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    role="img"
                    aria-label={displayResult?.animal ?? "Sin resultado"}
                  >
                    {displayResult?.emoji ?? "❓"}
                  </motion.span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nombre y número */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`info-${displayIdx}-${displayResult?.id ?? "none"}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-7 w-32 bg-white/10 rounded-lg animate-pulse" />
                <div className="h-9 w-16 bg-white/10 rounded-lg animate-pulse" />
              </div>
            ) : displayResult ? (
              <>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight mb-0.5">
                  {displayResult.animal}
                </h1>
                <p className="text-2xl sm:text-3xl md:text-4xl font-black tabular-nums mt-1"
                  style={{ color: "#fbbf24" }}>
                  {formatAnimalNumber(displayResult.animal, displayResult.number)}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight mb-0.5"
                  style={{ color: "rgba(255,255,255,0.35)" }}>
                  Sin resultado
                </h1>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Aún no se ha publicado
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Countdown al próximo sorteo */}
        {isLive && activeIdx < HOURS_LIST.length - 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-3 flex items-center gap-2 px-4 py-1.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-medium" style={{ color: "#cbd5e1" }}>Próximo en</span>
            <span className="text-sm font-bold font-mono" style={{ color: "#fbbf24" }}>
              {hrs > 0 ? `${String(hrs).padStart(2, "0")}:` : ""}{mins}:{secs}
            </span>
          </motion.div>
        )}

        {/* "Actualizado hace X min" */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-2 flex items-center gap-1.5 text-xs"
          style={{ color: "#64748b" }}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>En vivo · Actualizado hace {updatedAgo} min</span>
        </motion.div>

        {/* ── Chips de horarios ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-4 sm:mt-5 w-full"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "#60a5fa" }}>
            Horarios del día
          </p>
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex overflow-x-auto sm:flex-wrap sm:justify-center gap-2.5 pb-4 sm:pb-0 hero-chips-scroll snap-x snap-mandatory scroll-p-4">
            {HOURS_LIST.map((h, i) => {
              const hasResult = !!getResult(i);
              const isSelected = i === displayIdx;
              const isCovered = i <= activeIdx;
              const isPreview = isSelected && !isLive;

              let bg = "rgba(255,255,255,0.05)";
              let color = "#475569";
              let border = "1px solid rgba(255,255,255,0.08)";
              let shadow = "none";
              let scale = "scale(1)";

              if (isPreview) {
                bg = "linear-gradient(135deg,#6d28d9,#a855f7)";
                color = "#fff";
                border = "1px solid transparent";
                shadow = "0 4px 12px rgba(124,58,237,0.4)";
                scale = "scale(1.08)";
              } else if (isSelected) {
                bg = "linear-gradient(135deg,#1e40af,#3b82f6)";
                color = "#fff";
                border = "1px solid transparent";
                shadow = "0 4px 14px rgba(59,130,246,0.45)";
                scale = "scale(1.08)";
              } else if (isCovered && hasResult) {
                // Hora pasada CON resultado real → verde
                bg = "rgba(20,83,45,0.35)";
                color = "#4ade80";
                border = "1px solid rgba(74,222,128,0.25)";
              } else if (isCovered) {
                // Hora pasada SIN resultado → gris/naranja
                bg = "rgba(120,53,15,0.25)";
                color = "#fb923c";
                border = "1px solid rgba(251,146,60,0.2)";
              }

              return (
                <button
                  key={h}
                  onClick={() => handleChipClick(i)}
                  disabled={transitioning || !isCovered}
                  className="snap-center flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: bg, color, border, boxShadow: shadow, transform: scale }}
                  title={hasResult ? "Resultado publicado" : isCovered ? "Sin resultado" : "Próximamente"}
                >
                  {h.replace(":00", "")}
                </button>
              );
            })}
          </div>
          <p className="text-center text-[10px] mt-2" style={{ color: "#334155" }}>
            Toca cualquier hora para previsualizar
          </p>
        </motion.div>
      </div>

      {/* Keyframes inline */}
      <style>{`
        @keyframes hpulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.45); }
          50%      { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
