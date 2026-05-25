import { useState, useEffect, useRef, useCallback } from "react";
import { ANIMALS, HOURS_LIST } from "@/data/mockData";

/* ─── Constantes ─────────────────────────────────────────────────── */

// Genera un índice de animal consistente para cada hora usando la posición en HOURS_LIST
function animalForHour(hourStr: string): (typeof ANIMALS)[0] {
  const idx = HOURS_LIST.indexOf(hourStr);
  if (idx === -1) return ANIMALS[0];
  // Semilla fija basada en el índice para que sea siempre el mismo animal
  const seed = (idx * 7 + 3) % ANIMALS.length;
  return ANIMALS[seed];
}

// Convierte un string "08:00 AM" → hora real (0-23) para comparar con Date()
function hourStrToNum(hourStr: string): number {
  const [timePart, period] = hourStr.split(" ");
  let [h] = timePart.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h;
}

// Retorna el índice de HOURS_LIST que corresponde a la hora actual (o previa cubierta)
function getCurrentHourIndex(): number {
  const now = new Date();
  const currentH = now.getHours();

  // Buscar la hora más reciente que ya haya pasado
  let best = -1;
  for (let i = 0; i < HOURS_LIST.length; i++) {
    const h = hourStrToNum(HOURS_LIST[i]);
    if (h <= currentH) best = i;
  }
  // Si ninguna hora pasó aún, mostrar la primera
  return best === -1 ? 0 : best;
}

// Retorna segundos restantes hasta la próxima hora del schedule
function secondsToNext(currentIdx: number): number {
  const now = new Date();
  if (currentIdx + 1 >= HOURS_LIST.length) return 0;
  const nextH = hourStrToNum(HOURS_LIST[currentIdx + 1]);
  const target = new Date(now);
  target.setHours(nextH, 0, 0, 0);
  const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  return diff;
}

/* ─── Componente principal ───────────────────────────────────────── */
export default function ResultTicker() {
  const [activeIdx, setActiveIdx] = useState(getCurrentHourIndex);
  const [displayIdx, setDisplayIdx] = useState(getCurrentHourIndex); // el que está renderizado
  const [animState, setAnimState] = useState<"idle" | "exit" | "enter">("idle");
  const [countdown, setCountdown] = useState(() => secondsToNext(getCurrentHourIndex()));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directionRef = useRef<"forward" | "back">("forward");

  // ── Transición suave entre dos índices ──────────────────────────
  const transitionTo = useCallback((nextIdx: number, dir: "forward" | "back" = "forward") => {
    if (animState !== "idle") return;
    directionRef.current = dir;
    setAnimState("exit");
    timeoutRef.current = setTimeout(() => {
      setDisplayIdx(nextIdx);
      setAnimState("enter");
      timeoutRef.current = setTimeout(() => {
        setAnimState("idle");
      }, 600);
    }, 500);
  }, [animState]);

  // ── Cambio automático basado en hora real ───────────────────────
  useEffect(() => {
    // Verificar cada segundo si la hora cambió
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

  // ── Click manual en chip de hora ────────────────────────────────
  const handleChipClick = (idx: number) => {
    if (idx === displayIdx || animState !== "idle") return;
    const dir = idx > displayIdx ? "forward" : "back";
    transitionTo(idx, dir);
    // Nota: activeIdx permanece igual (la hora real no cambia)
  };

  // ── Limpiar timeouts ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const currentAnimal = animalForHour(HOURS_LIST[displayIdx]);
  const currentHour = HOURS_LIST[displayIdx];
  const isLive = displayIdx === activeIdx;

  // Clases de animación según dirección y estado
  const direction = directionRef.current;
  const animClass =
    animState === "exit"
      ? direction === "forward"
        ? "animate-exit-left"
        : "animate-exit-right"
      : animState === "enter"
      ? direction === "forward"
        ? "animate-enter-right"
        : "animate-enter-left"
      : "";

  // Formato del countdown
  const hrs = Math.floor(countdown / 3600);
  const mins = Math.floor((countdown % 3600) / 60);
  const secs = countdown % 60;
  const countdownStr = hrs > 0 
    ? `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <>
      {/* Keyframes inyectados inline para no editar CSS global */}
      <style>{`
        @keyframes exitLeft {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(-60px) scale(0.9); }
        }
        @keyframes exitRight {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(60px) scale(0.9); }
        }
        @keyframes enterRight {
          from { opacity: 0; transform: translateX(60px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes enterLeft {
          from { opacity: 0; transform: translateX(-60px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        .animate-exit-left  { animation: exitLeft  0.45s cubic-bezier(.4,0,.2,1) forwards; }
        .animate-exit-right { animation: exitRight 0.45s cubic-bezier(.4,0,.2,1) forwards; }
        .animate-enter-right{ animation: enterRight 0.55s cubic-bezier(.34,1.56,.64,1) forwards; }
        .animate-enter-left { animation: enterLeft  0.55s cubic-bezier(.34,1.56,.64,1) forwards; }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
          50%       { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
        }
        .live-badge { animation: pulse-glow 2s infinite; }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        .emoji-float { animation: float 3s ease-in-out infinite; }

        .chip-active {
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          color: white;
          transform: scale(1.08);
          box-shadow: 0 4px 14px rgba(59,130,246,0.4);
        }
        .chip-covered {
          background: #f0fdf4;
          color: #15803d;
          border-color: #86efac;
        }
        .chip-future {
          background: #f8fafc;
          color: #94a3b8;
          border-color: #e2e8f0;
        }
        .chip-preview {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
          box-shadow: 0 4px 12px rgba(124,58,237,0.35);
        }
      `}</style>

      <div className="w-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white select-none">

        {/* ── Cabecera ─────────────────────────────────────────── */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest text-blue-300 uppercase">Lotto Azar</p>
              <h2 className="text-lg font-bold text-white leading-tight">Resultados en Vivo</h2>
            </div>
            {isLive ? (
              <span className="live-badge flex items-center gap-1.5 px-3 py-1 bg-blue-600 rounded-full text-xs font-bold uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                En vivo
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-violet-700 rounded-full text-xs font-bold uppercase tracking-wide">
                👁 Vista previa
              </span>
            )}
          </div>
        </div>

        {/* ── Panel principal del animal ───────────────────────── */}
        <div className="px-6 py-8 flex flex-col items-center text-center">
          {/* Hora del resultado */}
          <p className="text-sm font-semibold text-blue-300 mb-4 tracking-wide">
            Resultado de las {currentHour}
          </p>

          {/* Emoji animado */}
          <div
            key={displayIdx}
            className={`relative flex items-center justify-center mb-5 ${animClass}`}
          >
            {/* Halo de fondo */}
            <div className="absolute inset-0 rounded-full bg-white/5 blur-2xl scale-150" />
            <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-blue-800/60 to-slate-800/80 border border-white/10 flex items-center justify-center shadow-2xl">
              <span className="emoji-float text-7xl leading-none" role="img" aria-label={currentAnimal.name}>
                {currentAnimal.emoji}
              </span>
            </div>
          </div>

          {/* Nombre y número */}
          <div className={animClass} key={`info-${displayIdx}`}>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">{currentAnimal.name}</h3>
            <p className="mt-1 text-blue-300 text-sm font-medium">
              Número:{" "}
              <span className="text-white font-bold text-lg">
                {currentAnimal.number}
              </span>
            </p>
          </div>

          {/* Countdown al próximo resultado */}
          {isLive && activeIdx < HOURS_LIST.length - 1 && (
            <div className="mt-5 flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-medium">Próximo en</span>
              <span className="text-base font-bold text-amber-300 font-mono">{countdownStr}</span>
            </div>
          )}
        </div>

        {/* ── Chips de horarios ────────────────────────────────── */}
        <div className="px-4 pb-6">
          <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest text-center mb-3">
            Horarios del día
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {HOURS_LIST.map((h, i) => {
              const isSelected = i === displayIdx;
              const isCovered = i <= activeIdx;
              const isPreview = isSelected && !isLive;

              let chipClass = "chip-future";
              if (isPreview) chipClass = "chip-preview";
              else if (isSelected) chipClass = "chip-active";
              else if (isCovered) chipClass = "chip-covered";

              return (
                <button
                  key={h}
                  onClick={() => handleChipClick(i)}
                  disabled={animState !== "idle"}
                  className={`
                    ${chipClass}
                    px-3 py-1.5 rounded-full text-xs font-semibold border
                    transition-all duration-200 cursor-pointer
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `}
                >
                  {h.replace(":00", "")}
                </button>
              );
            })}
          </div>
          <p className="text-center text-[10px] text-slate-500 mt-3">
            Toca cualquier hora para previsualizar su resultado
          </p>
        </div>
      </div>
    </>
  );
}
