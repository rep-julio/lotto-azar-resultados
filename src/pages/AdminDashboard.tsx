import { useNavigate } from "react-router-dom";
import { formatAnimalNumber } from "@/lib/utils";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { animate, stagger } from "animejs";
import { sileo } from "sileo";

// Backwards compatibility layer for AnimeJS v3 usage pattern
const anime = Object.assign((options: any) => {
  const { targets, ...rest } = options;
  return animate(targets, rest);
}, { stagger });
import {
  LayoutDashboard,
  Radio,
  Trophy,
  History,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Users,
  Activity,
  Bell,
  Clock,
  CircleCheckBig,
  Menu,
  Map,
  Settings,
  Sliders,
  Cpu,
  Hand,
  RefreshCw,
  Zap,
  ImagePlay,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  Search,
  Sun,
  Moon,
} from "lucide-react";
import {
  ANIMALS,
  ANIMAL_WEIGHTS,
  HOURS_LIST,
  generateResults,
  type LotteryResult,
} from "@/data/mockData";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { LS_WEIGHTS_KEY, type SorteoMode } from "@/hooks/useProyeccion";
import { SectionCarrusel as SectionCarruselAdmin } from "@/components/SectionCarrusel";
import { useProbabilidades, type ProbabilidadRow, PROB_UPDATED_EVENT } from "@/hooks/useProbabilidades";
import { useTheme } from "@/hooks/useTheme";
import { clearCache, CACHE_KEYS } from "@/lib/cache";

/* ── helpers ────────────────────────────────────────────────────── */
const ALL_ANIMALS = ANIMALS.map((a) => a.name);

const LOTTERY_NAMES = ["Ardilla", "León", "Camello", "Vaca"];

type Section = "dashboard" | "configuracion" | "pronosticos" | "sorteos" | "historial" | "carrusel" | "probabilidades";

interface Forecast {
  id: number;
  hora: string;
  loteria: string;
  animal: string;
  numero: number;
}

/* ── nav ────────────────────────────────────────────────────────── */
const navItems: { id: Section; icon: React.ElementType; label: string }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "pronosticos", icon: Radio, label: "Control de Pronósticos" },
  { id: "sorteos", icon: Trophy, label: "Sorteos" },
  { id: "historial", icon: History, label: "Historial" },
  { id: "carrusel", icon: ImagePlay, label: "Carrusel" },
  { id: "probabilidades", icon: BarChart3, label: "Probabilidades" },
  { id: "configuracion", icon: Settings, label: "Configuración" },
];

/* ════════════════════════════════════════════════════════════════
   Sección 0 – Dashboard general
════════════════════════════════════════════════════════════ */
const activityLog = [
  { time: "08:00 AM", text: "Sorteo Ardilla publicado correctamente", dot: "bg-emerald-500" },
  { time: "09:30 AM", text: "Nuevo usuario registrado en el sistema", dot: "bg-blue-500" },
  { time: "10:05 AM", text: "Error en sincronización de datos — resuelto", dot: "bg-rose-500" },
  { time: "12:00 PM", text: "Sorteo León — en transmisión en vivo", dot: "bg-yellow-500" },
  { time: "01:15 PM", text: "Backup automático completado", dot: "bg-emerald-500" },
];

const SectionDashboard = () => {
  const [stats, setStats] = useState({
    totalResults: 0,
    todayResults: 0,
    latest: [] as any[],
    isLoading: true
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { count: totalCount } = await supabase
          .from("sorteos")
          .select("*", { count: "exact", head: true });

        const { data: latestData } = await supabase
          .from("sorteos")
          .select("id, fecha, hora, animal, emoji, numero")
          .order("fecha", { ascending: false })
          .order("hora", { ascending: false })
          .limit(6);

        const mDate = new Date();
        const year = mDate.getFullYear();
        const month = String(mDate.getMonth() + 1).padStart(2, "0");
        const day = String(mDate.getDate()).padStart(2, "0");
        const todayStr = `${year}-${month}-${day}`;

        const { count: todayCount } = await supabase
          .from("sorteos")
          .select("*", { count: "exact", head: true })
          .eq("fecha", todayStr);

        setStats({
          totalResults: totalCount || 0,
          todayResults: todayCount || 0,
          latest: latestData || [],
          isLoading: false
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!containerRef.current || stats.isLoading) return;

    anime({
      targets: '.stat-card',
      translateY: [20, 0],
      opacity: [0, 1],
      delay: anime.stagger(50),
      duration: 400,
      easing: 'easeOutQuad'
    });

    anime({
      targets: '.dashboard-list-item',
      translateX: [-15, 0],
      opacity: [0, 1],
      delay: anime.stagger(40, { start: 200 }),
      duration: 400,
      easing: 'easeOutSine'
    });
  }, [stats.isLoading]);

  const vals = [
    { label: "Resultados Registrados", value: stats.totalResults.toString(), sub: `${stats.todayResults} hoy` },
    { label: "Animales en Sistema", value: ANIMALS.length.toString(), sub: "catálogo completo" },
    { label: "Franjas Horarias", value: HOURS_LIST.length.toString(), sub: "sorteos por día" },
    { label: "Pronósticos Hoy", value: "—", sub: "ver módulo pronósticos" },
  ];

  return (
    <div ref={containerRef}>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Resumen General</h2>
        <p className="text-sm text-gray-500">Información general del panel de Lotto Azar</p>
      </div>

      {/* Stat cards — hardcoded so Tailwind JIT detects border-l colors */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {/* Card 1 */}
        <div className="stat-card opacity-0 bg-white rounded-xl shadow-sm border border-blue-600 overflow-hidden flex flex-col">
          <div className="p-5 flex-1 relative flex flex-col justify-center">
            <h3 className="stat-value text-3xl font-extrabold text-blue-600 z-10 tracking-tight" data-value={vals[0].value}>
              {vals[0].value}
            </h3>
            <p className="mt-1 text-sm text-gray-500 font-medium z-10">{vals[0].label}</p>
            <div className="absolute top-5 right-5 text-blue-600 opacity-20 z-0">
              <Trophy className="h-10 w-10" strokeWidth={1.5} />
            </div>
          </div>
          <div className="bg-blue-600 px-5 py-2.5 flex justify-between items-center text-white">
            <span className="text-xs font-medium">{vals[0].sub}</span>
            <div className="flex items-end gap-0.5 h-3 opacity-90">
              <div className="w-1 h-1.5 bg-white rounded-t-sm"></div>
              <div className="w-1 h-3 bg-white rounded-t-sm"></div>
              <div className="w-1 h-2.5 bg-white rounded-t-sm"></div>
              <div className="w-1 h-2 bg-white rounded-t-sm"></div>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="stat-card opacity-0 bg-white rounded-xl shadow-sm border border-orange-600 overflow-hidden flex flex-col">
          <div className="p-5 flex-1 relative flex flex-col justify-center">
            <h3 className="stat-value text-3xl font-extrabold text-orange-600 z-10 tracking-tight" data-value={vals[1].value}>
              {vals[1].value}
            </h3>
            <p className="mt-1 text-sm text-gray-500 font-medium z-10">{vals[1].label}</p>
            <div className="absolute top-5 right-5 text-orange-600 opacity-20 z-0">
              <Users className="h-10 w-10" strokeWidth={1.5} />
            </div>
          </div>
          <div className="bg-orange-600 px-5 py-2.5 flex justify-between items-center text-white">
            <span className="text-xs font-medium">{vals[1].sub}</span>
            <div className="flex items-end gap-0.5 h-3 opacity-90">
              <div className="w-1 h-2 bg-white rounded-t-sm"></div>
              <div className="w-1 h-1 bg-white rounded-t-sm"></div>
              <div className="w-1 h-3 bg-white rounded-t-sm"></div>
              <div className="w-1 h-2.5 bg-white rounded-t-sm"></div>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="stat-card opacity-0 bg-white rounded-xl shadow-sm border border-[#47a84e] overflow-hidden flex flex-col">
          <div className="p-5 flex-1 relative flex flex-col justify-center">
            <h3 className="stat-value text-3xl font-extrabold text-[#47a84e] z-10 tracking-tight" data-value={vals[2].value}>
              {vals[2].value}
            </h3>
            <p className="mt-1 text-sm text-gray-500 font-medium z-10">{vals[2].label}</p>
            <div className="absolute top-5 right-5 text-[#47a84e] opacity-20 z-0">
              <Activity className="h-10 w-10" strokeWidth={1.5} />
            </div>
          </div>
          <div className="bg-[#47a84e] px-5 py-2.5 flex justify-between items-center text-white">
            <span className="text-xs font-medium">{vals[2].sub}</span>
            <div className="flex items-end gap-0.5 h-3 opacity-90">
              <div className="w-1 h-2.5 bg-white rounded-t-sm"></div>
              <div className="w-1 h-1.5 bg-white rounded-t-sm"></div>
              <div className="w-1 h-2.5 bg-white rounded-t-sm"></div>
              <div className="w-1 h-2 bg-white rounded-t-sm"></div>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="stat-card opacity-0 bg-white rounded-xl shadow-sm border border-[#f39c12] overflow-hidden flex flex-col">
          <div className="p-5 flex-1 relative flex flex-col justify-center">
            <h3 className="stat-value text-3xl font-extrabold text-[#f39c12] z-10 tracking-tight" data-value={vals[3].value}>
              {vals[3].value}
            </h3>
            <p className="mt-1 text-sm text-gray-500 font-medium z-10">{vals[3].label}</p>
            <div className="absolute top-5 right-5 text-[#f39c12] opacity-20 z-0">
              <Bell className="h-10 w-10" strokeWidth={1.5} />
            </div>
          </div>
          <div className="bg-[#f39c12] px-5 py-2.5 flex justify-between items-center text-white">
            <span className="text-xs font-medium">{vals[3].sub}</span>
            <div className="flex items-end gap-0.5 h-3 opacity-90">
              <div className="w-1 h-3 bg-white rounded-t-sm"></div>
              <div className="w-1 h-2 bg-white rounded-t-sm"></div>
              <div className="w-1 h-1.5 bg-white rounded-t-sm"></div>
              <div className="w-1 h-2.5 bg-white rounded-t-sm"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Últimos resultados */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-blue-600 rounded-t-2xl">
            <h3 className="font-semibold text-white text-sm">ÚLtimos Resultados</h3>
            <span className="text-xs text-blue-100 font-medium">{stats.latest.length} registros</span>
          </div>
          <div className="overflow-x-auto relative min-h-[160px]">
            {stats.isLoading && (
              <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-sm rounded-b-xl">
                <l-squircle
                  size="35"
                  stroke="4.5"
                  stroke-length="0.15"
                  bg-opacity="0.1"
                  speed="0.8"
                  color="#2563eb"
                ></l-squircle>
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1f5650] text-xs text-white uppercase tracking-wider border-b border-[#1f5650]">
                  <th className="text-left px-5 py-3 font-semibold">Fecha</th>
                  <th className="text-left px-5 py-3 font-semibold">Hora</th>
                  <th className="text-left px-5 py-3 font-semibold">Animal</th>
                  <th className="text-left px-5 py-3 font-semibold">Número</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.latest.map((r) => (
                  <tr key={r.id} className="dashboard-list-item opacity-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-gray-400">{r.fecha}</td>
                    <td className="px-5 py-3 text-xs font-mono text-gray-400">{r.hora}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{r.emoji} {r.animal}</td>
                    <td className="px-5 py-3 font-bold text-blue-600">{formatAnimalNumber(r.animal, r.numero)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-blue-600 rounded-t-2xl">
            <h3 className="font-semibold text-white text-sm">Actividad Reciente</h3>
            <Clock className="h-4 w-4 text-blue-100" />
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {activityLog.map((item, i) => (
                <div key={i} className="dashboard-list-item opacity-0 flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${item.dot}`} />
                    {i < activityLog.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">{item.time}</p>
                    <p className="text-xs text-gray-700 leading-snug">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Sección: Configuración de Apuestas
══════════════════════════════════════════════════════════════════ */
interface BetConfig {
  id: number;
  monto_minimo: number;
  monto_maximo: number;
  multiplicador_normal: number;
  multiplicador_comodin: number;
}

const DEFAULT_CONFIG: BetConfig = {
  id: 1,
  monto_minimo: 1,
  monto_maximo: 10000,
  multiplicador_normal: 70,
  multiplicador_comodin: 140,
};

/* ════════════════════════════════════════════════════════════════
   Tarjeta: Tema del sitio público (claro / nocturno)
════════════════════════════════════════════════════════════════ */
const ThemeToggleCard = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 bg-slate-700 rounded-t-2xl">
        <span className="text-sm font-bold text-white">🎨 Tema del sitio público</span>
        <span className="ml-auto text-[11px] text-slate-300 font-medium">Claro · Nocturno</span>
      </div>
      <div className="p-5">
        <p className="text-xs text-gray-500 mb-4">
          Selecciona el tema visual que verán los visitantes del sitio. El cambio se aplica de inmediato y se guarda en el navegador.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Claro */}
          <button
            id="theme-card-light"
            onClick={() => setTheme("light")}
            className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
              theme === "light"
                ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
                : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40"
            }`}
          >
            {/* Preview */}
            <div className="w-full h-16 rounded-lg bg-white border border-gray-200 overflow-hidden flex flex-col shadow-sm">
              <div className="h-4 bg-gray-100 flex items-center px-2 gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                <div className="w-8 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="flex-1 p-1.5 flex gap-1">
                <div className="w-6 h-full rounded bg-blue-100" />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="h-1.5 rounded-full bg-gray-100 w-3/4" />
                  <div className="h-1.5 rounded-full bg-gray-100 w-1/2" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold text-gray-700">Claro</span>
            </div>
            {theme === "light" && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </button>

          {/* Nocturno */}
          <button
            id="theme-card-dark"
            onClick={() => setTheme("dark")}
            className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
              theme === "dark"
                ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100"
                : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40"
            }`}
          >
            {/* Preview */}
            <div className="w-full h-16 rounded-lg bg-gray-900 border border-gray-700 overflow-hidden flex flex-col shadow-sm">
              <div className="h-4 bg-gray-800 flex items-center px-2 gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                <div className="w-8 h-1 rounded-full bg-gray-700" />
              </div>
              <div className="flex-1 p-1.5 flex gap-1">
                <div className="w-6 h-full rounded bg-indigo-900/60" />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="h-1.5 rounded-full bg-gray-700 w-3/4" />
                  <div className="h-1.5 rounded-full bg-gray-700 w-1/2" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-400" />
              <span className="text-sm font-semibold text-gray-700">Nocturno</span>
            </div>
            {theme === "dark" && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionConfiguracion = () => {
  const [config, setConfig] = useState<BetConfig>(DEFAULT_CONFIG);
  const [form, setForm] = useState<BetConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("bet_config")
          .select("id, monto_minimo, monto_maximo, multiplicador_normal, multiplicador_comodin")
          .eq("id", 1)
          .single();

        if (!error && data) {
          setConfig(data);
          setForm(data);
        }
      } catch (err) {
        console.warn("bet_config table not found, using defaults:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (field: keyof BetConfig, value: string) => {
    if (value === "") {
      setForm((prev) => ({ ...prev, [field]: "" as unknown as number }));
      setIsDirty(true);
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setForm(prev => ({ ...prev, [field]: num }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    // Validar campos vacíos
    if (Object.values(form).some(v => v === "")) {
      sileo.error({ title: "Error de validación", description: "Ningún campo puede estar vacío.", duration: 2000 });
      return;
    }

    if (form.monto_minimo >= form.monto_maximo) {
      sileo.error({ title: "Error de validación", description: "El monto mínimo debe ser menor al máximo.", duration: 2000 });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("bet_config")
        .upsert({
          id: 1,
          monto_minimo: form.monto_minimo,
          monto_maximo: form.monto_maximo,
          multiplicador_normal: form.multiplicador_normal,
          multiplicador_comodin: form.multiplicador_comodin,
        }, { onConflict: "id" });

      if (error) throw error;

      setConfig(form);
      setIsDirty(false);
      sileo.success({ title: "Configuración Guardada", description: "Los cambios se aplican en tiempo real al sitio público.", duration: 2000 });
    } catch (err) {
      console.error("Error saving bet_config:", err);
      sileo.error({ title: "Error", description: "No se pudo guardar la configuración.", duration: 2000 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setForm(config);
    setIsDirty(false);
  };

  /* Inline editable number cell */
  const EditCell = ({
    value,
    onChange,
    color = "text-blue-600",
    prefix = "",
    suffix = " Bs",
    min = 1,
  }: {
    value: number | string;
    onChange: (v: string) => void;
    color?: string;
    prefix?: string;
    suffix?: string;
    min?: number;
  }) => (
    <div className="flex items-center justify-end gap-2">
      {prefix && <span className={`text-sm font-bold ${color}`}>{prefix}</span>}
      <Input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-32 h-11 text-right text-base font-black border-2 border-slate-200 focus-visible:ring-blue-500 focus-visible:border-blue-500 shadow-sm transition-colors ${color}`}
      />
      <span className={`text-sm font-bold ${color}`}>{suffix}</span>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Configuración de Apuestas</h2>
          <p className="text-sm text-gray-500">Edita los valores directamente en la tabla — haz clic en cualquier número para modificarlo</p>
        </div>
        {isDirty && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Cambios sin guardar
          </span>
        )}
      </div>

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl min-h-[300px]">
            <l-squircle
              size="50"
              stroke="6"
              stroke-length="0.15"
              bg-opacity="0.1"
              speed="0.8"
              color="#2563eb"
            ></l-squircle>
          </div>
        )}
        <div className={`space-y-5 w-full max-w-6xl transition-all duration-300 ${isLoading ? "blur-sm pointer-events-none select-none" : ""}`}>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            {/* Tabla de pagos — Jugada Normal */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
            <div className="flex items-center gap-2 px-5 py-3.5 bg-blue-600 rounded-t-2xl">
              <span className="text-sm font-bold text-white">🎯 Jugada Normal</span>
              <span className="ml-auto text-[11px] text-blue-200 font-medium">Edita el valor en Bs</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo de apuesta</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pago por Bs apostado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* ×1 — editable base */}
                <tr className="hover:bg-blue-50/40 transition-colors group">
                  <td className="px-5 py-4 font-medium text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">×1</span>
                      Exacta individual
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <EditCell
                      value={form.multiplicador_normal}
                      onChange={(v) => handleChange("multiplicador_normal", v)}
                      color="text-blue-600"
                    />
                  </td>
                </tr>
                {/* ×10 — calculado */}
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">×10</span>
                      Por 10 unidades
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-black text-blue-600">
                      {(form.multiplicador_normal * 10).toLocaleString("es")} Bs
                    </span>
                    <span className="text-[10px] text-gray-400 block">calculado automático</span>
                  </td>
                </tr>
                {/* ×100 — calculado */}
                <tr className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">×100</span>
                      Por 100 unidades
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-black text-blue-600">
                      {(form.multiplicador_normal * 100).toLocaleString("es")} Bs
                    </span>
                    <span className="text-[10px] text-gray-400 block">calculado automático</span>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>

            {/* Tabla de pagos — Comodín */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
            <div className="flex items-center gap-2 px-5 py-3.5 bg-purple-600 rounded-t-2xl">
              <span className="text-sm font-bold text-white">🌟 Jugada Comodín</span>
              <span className="ml-auto text-[11px] text-purple-200 font-medium">Edita el valor en Bs</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo de apuesta</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pago por Bs apostado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* ×1 — editable */}
                <tr className="hover:bg-purple-50/40 transition-colors group">
                  <td className="px-5 py-4 font-medium text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">×1</span>
                      Exacta comodín
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <EditCell
                      value={form.multiplicador_comodin}
                      onChange={(v) => handleChange("multiplicador_comodin", v)}
                      color="text-purple-600"
                    />
                  </td>
                </tr>
                {/* ×10 — calculado */}
                <tr className="hover:bg-purple-50/40 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">×10</span>
                      Por 10 unidades
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-black text-purple-600">
                      {(form.multiplicador_comodin * 10).toLocaleString("es")} Bs
                    </span>
                    <span className="text-[10px] text-gray-400 block">calculado automático</span>
                  </td>
                </tr>
                {/* ×100 — calculado */}
                <tr className="hover:bg-purple-50/40 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">×100</span>
                      Por 100 unidades
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-black text-purple-600">
                      {(form.multiplicador_comodin * 100).toLocaleString("es")} Bs
                    </span>
                    <span className="text-[10px] text-gray-400 block">calculado automático</span>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>

          {/* Rango de apuesta */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 bg-[#1f5650] rounded-t-2xl">
              <span className="text-sm font-bold text-white">💰 Rango de Apuesta</span>
              <span className="ml-auto text-[11px] text-emerald-200 font-medium">Mínimo y máximo permitidos</span>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto Mínimo</label>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-gray-400">Bs</span>
                  <Input
                    type="number"
                    min={1}
                    value={form.monto_minimo}
                    onChange={(e) => handleChange("monto_minimo", e.target.value)}
                    className="flex-1 h-12 text-base font-black text-gray-800 border-2 border-slate-200 shadow-sm focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto Máximo</label>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-gray-400">Bs</span>
                  <Input
                    type="number"
                    min={form.monto_minimo + 1}
                    value={form.monto_maximo}
                    onChange={(e) => handleChange("monto_maximo", e.target.value)}
                    className="flex-1 h-12 text-base font-black text-gray-800 border-2 border-slate-200 shadow-sm focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botones apuestas */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleReset}
              disabled={!isDirty || isSaving}
              className="flex-1 py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Descartar cambios
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-blue-200"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                  </svg>
                  Guardando...
                </>
              ) : (
                <><Save className="h-4 w-4" /> Guardar configuración</>
              )}
            </button>
          </div>

          {/* ── Tema del sitio público ────── */}
          <ThemeToggleCard />
        </div>
      </div>
    </div>
  );
};


/* ════════════════════════════════════════════════════════════════
   Sección: Probabilidades (CRUD completo)
══════════════════════════════════════════════════════════════════ */
const PROB_COLOR = (peso: number) => {
  if (peso >= 28) return { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (peso >= 18) return { bar: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200" };
  if (peso >= 10) return { bar: "bg-violet-500",  badge: "bg-violet-50 text-violet-700 border-violet-200" };
  return             { bar: "bg-slate-400",       badge: "bg-slate-50 text-slate-600 border-slate-200" };
};

const blankProbForm = () => ({
  animal: "",
  emoji: "🐾",
  numero: "",
  peso: 10,
  activo: true,
});

const SectionProbabilidades = () => {
  const { rows, isLoading, error, refetch } = useProbabilidades();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<ProbabilidadRow | null>(null);
  const [form, setForm] = useState(blankProbForm());
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtrado por búsqueda
  const filtered = rows.filter((r) =>
    r.animal.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  
  // Update current page if it goes out of bounds after filtering/deleting
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openAdd = () => {
    setEditRow(null);
    setForm(blankProbForm());
    setModalOpen(true);
  };

  const openEdit = (row: ProbabilidadRow) => {
    setEditRow(row);
    setForm({ animal: row.animal, emoji: row.emoji, numero: row.numero, peso: row.peso, activo: row.activo });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditRow(null); };

  const handleSave = async () => {
    if (!form.animal.trim()) {
      sileo.error({ title: "Campo requerido", description: "El nombre del animal es obligatorio.", duration: 2000 });
      return;
    }
    if (form.peso < 0 || form.peso > 100) {
      sileo.error({ title: "Peso inválido", description: "El peso debe estar entre 0 y 100.", duration: 2000 });
      return;
    }
    setIsSaving(true);
    try {
      const { error: rpcErr } = await supabase.rpc("upsert_probabilidad", {
        p_animal: form.animal.trim(),
        p_emoji: form.emoji.trim() || "🐾",
        p_numero: form.numero.trim(),
        p_peso: form.peso,
        p_activo: form.activo,
      });
      if (rpcErr) throw rpcErr;
      window.dispatchEvent(new Event(PROB_UPDATED_EVENT));
      await refetch();
      sileo.success({
        title: editRow ? "Probabilidad actualizada" : "Probabilidad creada",
        description: `${form.animal} — peso ${form.peso}`,
        duration: 2000,
      });
      closeModal();
    } catch (err: any) {
      sileo.error({ title: "Error al guardar", description: err?.message ?? "Error desconocido", duration: 3000 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const { error: rpcErr } = await supabase.rpc("delete_probabilidad", { p_id: id });
      if (rpcErr) throw rpcErr;
      window.dispatchEvent(new Event(PROB_UPDATED_EVENT));
      await refetch();
      setDeleteId(null);
      sileo.success({ title: "Eliminado", description: "La probabilidad fue removida.", duration: 2000 });
    } catch (err: any) {
      sileo.error({ title: "Error al eliminar", description: err?.message ?? "Error desconocido", duration: 3000 });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActivo = async (row: ProbabilidadRow) => {
    try {
      const { error: rpcErr } = await supabase.rpc("upsert_probabilidad", {
        p_animal: row.animal,
        p_emoji: row.emoji,
        p_numero: row.numero,
        p_peso: row.peso,
        p_activo: !row.activo,
      });
      if (rpcErr) throw rpcErr;
      window.dispatchEvent(new Event(PROB_UPDATED_EVENT));
      await refetch();
    } catch (err: any) {
      sileo.error({ title: "Error", description: err?.message ?? "No se pudo cambiar el estado.", duration: 2000 });
    }
  };

  // Reset pagination on search
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const maxPeso = rows.length > 0 ? Math.max(...rows.map((r) => r.peso)) : 100;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Probabilidades</h2>
          <p className="text-sm text-gray-500">Gestiona el peso de probabilidad de cada animal — los cambios se reflejan en tiempo real en el sitio público</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shadow-md shadow-violet-200 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nueva probabilidad
        </button>
      </div>

      {/* Search + stats bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar animal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-white"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-2.5 font-medium shrink-0">
          <BarChart3 className="h-4 w-4 text-violet-500" />
          <span><strong className="text-gray-800">{rows.filter(r => r.activo).length}</strong> activos</span>
          <span className="text-gray-300">|</span>
          <span><strong className="text-gray-800">{rows.length}</strong> total</span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
          <span className="font-semibold">⚠️ Aviso:</span> La tabla aún no existe en Supabase. Ejecuta el SQL <code className="bg-amber-100 px-1 rounded">08_probabilidades.sql</code> para habilitarla.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-5 py-3.5 bg-violet-600 rounded-t-2xl shrink-0">
          <BarChart3 className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">Tabla de Probabilidades</span>
          {!isLoading && (
            <span className="ml-auto text-[11px] text-violet-200 font-medium">{filtered.length} animales</span>
          )}
        </div>

        <div className="overflow-x-auto relative flex-1 min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-sm">
              <l-squircle
                size="40"
                stroke="5"
                stroke-length="0.15"
                bg-opacity="0.1"
                speed="0.8"
                color="#7c3aed"
              ></l-squircle>
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Animal</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Número</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Peso</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Barra</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                    {search ? "No se encontraron animales con ese nombre." : "Sin registros. Agrega la primera probabilidad."}
                  </td>
                </tr>
              )}
              {currentItems.map((row, idx) => {
                const colors = PROB_COLOR(row.peso);
                const barPct = maxPeso > 0 ? (row.peso / maxPeso) * 100 : 0;
                const index = (currentPage - 1) * itemsPerPage + idx + 1;
                return (
                  <tr key={row.id} className={`hover:bg-violet-50/30 transition-colors ${!row.activo ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-400">{index}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl leading-none">{row.emoji}</span>
                        <span className="font-semibold text-gray-800 text-sm">{row.animal}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{row.numero}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${colors.badge}`}>
                        {row.peso}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell w-40">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleActivo(row)}
                        title={row.activo ? "Desactivar" : "Activar"}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                          row.activo
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {row.activo ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        {row.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(row)}
                          className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(row.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Mostrando <span className="font-medium text-gray-700">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium text-gray-700">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> de <span className="font-medium text-gray-700">{filtered.length}</span> resultados
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  // Muestra solo algunas páginas para evitar que se desborde
                  const page = i + 1;
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                          currentPage === page
                            ? "bg-violet-600 text-white"
                            : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="text-gray-400 text-xs">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Crear / Editar ────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {editRow ? "Editar Probabilidad" : "Nueva Probabilidad"}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {editRow ? "Modifica los datos de la probabilidad." : "Agrega un animal con su peso de probabilidad."}
            </p>

            <div className="space-y-4">
              {/* Selector de Animal */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Animal *
                </label>
                {editRow ? (
                  /* En edición: muestra el animal fijo con su emoji y número */
                  <div className="flex items-center gap-3 h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-xl leading-none">{form.emoji}</span>
                    <span className="font-semibold text-gray-700 text-sm">{form.animal}</span>
                    <span className="ml-auto text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{form.numero}</span>
                  </div>
                ) : (
                  /* En creación: selector con todos los animales del catálogo */
                  <select
                    value={form.animal}
                    onChange={(e) => {
                      const selected = ANIMALS.find((a) => a.name === e.target.value);
                      if (selected) {
                        setForm((f) => ({
                          ...f,
                          animal: selected.name,
                          emoji: selected.emoji,
                          numero: selected.number,
                        }));
                      } else {
                        setForm((f) => ({ ...f, animal: "", emoji: "🐾", numero: "" }));
                      }
                    }}
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white text-gray-800"
                  >
                    <option value="">— Selecciona un animal —</option>
                    {ANIMALS.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.emoji}  {a.name} (#{a.number})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Preview: Emoji + Número (auto-rellenados al seleccionar) */}
              {form.animal && (
                <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-100 rounded-xl">
                  <span className="text-3xl leading-none">{form.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-violet-800">{form.animal}</p>
                    <p className="text-xs text-violet-500">Número: <strong>{form.numero}</strong></p>
                  </div>
                </div>
              )}


              {/* Peso */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Peso de probabilidad — <span className="text-violet-600 font-bold">{form.peso}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={form.peso}
                    onChange={(e) => setForm((f) => ({ ...f, peso: parseInt(e.target.value, 10) }))}
                    className="flex-1 h-2 accent-violet-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.peso}
                    onChange={(e) => setForm((f) => ({ ...f, peso: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) }))}
                    className="w-16 h-9 text-center text-sm border border-gray-200 rounded-lg font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
                  <span>Baja</span><span>Media</span><span>Alta</span>
                </div>
              </div>

              {/* Activo */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Estado activo</p>
                  <p className="text-xs text-gray-400">Los inactivos no aparecen en la proyección del cliente</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, activo: !f.activo }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 ${
                    form.activo ? "bg-violet-600" : "bg-gray-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.activo ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-violet-200"
              >
                {isSaving ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" /></svg>Guardando...</>
                ) : (
                  <><Save className="h-4 w-4" />{editRow ? "Guardar cambios" : "Crear probabilidad"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ──────────────────────────────────────── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 z-10 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-rose-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">¿Eliminar probabilidad?</h3>
            <p className="text-sm text-gray-500 mb-6">Esta acción no se puede deshacer. El animal perderá su peso de probabilidad configurado.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" /></svg>Eliminando...</>
                ) : (
                  <><Trash2 className="h-3.5 w-3.5" />Sí, eliminar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Sección: Control de Pronósticos
══════════════════════════════════════════════════════════════════ */



const seedForecasts = (): Forecast[] =>
  HOURS_LIST.map((hora, i) => ({
    id: i + 1,
    hora,
    loteria: LOTTERY_NAMES[i % LOTTERY_NAMES.length],
    animal: ANIMALS[i % ANIMALS.length].name,
    numero: parseInt(ANIMALS[i % ANIMALS.length].number ?? "0", 10),
  }));

const blankForecastForm = () => ({
  hora: HOURS_LIST[0],
  loteria: LOTTERY_NAMES[0],
  animal: ANIMALS[0].name,
  numero: parseInt(ANIMALS[0].number ?? "0", 10),
});

const SectionPronosticos = () => {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(blankForecastForm());

  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Fetch from Supabase ───────────────────────────────────────
  useEffect(() => {
    const fetchForecasts = async () => {
      try {
        const { data, error } = await supabase
          .from("pronosticos")
          .select("id, hora, loteria, animal, numero")
          .order("created_at", { ascending: true });

        if (error) throw error;

        const mapped: Forecast[] = (data ?? []).map((row: any) => ({
          id: row.id,
          hora: row.hora,
          loteria: row.loteria,
          animal: row.animal,
          numero: row.numero,
        }));

        mapped.sort((a, b) => HOURS_LIST.indexOf(a.hora) - HOURS_LIST.indexOf(b.hora));
        setForecasts(mapped);
      } catch (err) {
        console.error("Error fetching pronosticos:", err);
        setForecasts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForecasts();
  }, []);

  useEffect(() => {
    if (!containerRef.current || forecasts.length === 0) return;

    anime({
      targets: '.pronostico-item',
      translateX: [-20, 0],
      opacity: [0, 1],
      delay: anime.stagger(40, { start: 50 }),
      duration: 400,
      easing: 'easeOutQuart'
    });

    anime({
      targets: '.horario-item',
      translateX: [20, 0],
      opacity: [0, 1],
      delay: anime.stagger(30, { start: 100 }),
      duration: 350,
      easing: 'easeOutQuart'
    });
  }, [forecasts]);

  const coveredHours = new Set(forecasts.map((f) => f.hora));
  const missingHours = HOURS_LIST.filter((h) => !coveredHours.has(h));

  const openAddModal = (preHora?: string) => {
    setEditId(null);
    setForm({ ...blankForecastForm(), hora: preHora ?? HOURS_LIST[0] });
    setModalOpen(true);
  };

  const openEditModal = (f: Forecast) => {
    setEditId(f.id);
    setForm({ hora: f.hora, loteria: f.loteria, animal: f.animal, numero: f.numero });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
  };

  // ─── Upsert via RPC ────────────────────────────────────────────
  const saveModal = async () => {
    setIsSaving(true);
    try {
      const { data: result, error } = await supabase.rpc("upsert_pronostico", {
        p_hora: form.hora,
        p_loteria: form.loteria,
        p_animal: form.animal,
        p_numero: form.numero,
      });

      if (error) throw error;

      // Refresh list from server
      const { data: fresh, error: fetchErr } = await supabase
        .from("pronosticos")
        .select("id")
        .order("created_at", { ascending: true });

      if (fetchErr) throw fetchErr;

      const mapped: Forecast[] = (fresh ?? []).map((row: any) => ({
        id: row.id,
        hora: row.hora,
        loteria: row.loteria,
        animal: row.animal,
        numero: row.numero,
      }));
      mapped.sort((a, b) => HOURS_LIST.indexOf(a.hora) - HOURS_LIST.indexOf(b.hora));
      setForecasts(mapped);

      const isEdit = editId !== null || forecasts.some(f => f.hora === form.hora);
      sileo.success({
        title: isEdit ? "Pronóstico Actualizado" : "Pronóstico Creado",
        description: isEdit ? "Se ha modificado correctamente." : "Se ha añadido el nuevo pronóstico exitosamente.",
        duration: 2000
      });
      closeModal();
    } catch (err) {
      console.error("Error saving pronostico:", err);
      sileo.error({ title: "Error", description: "No se pudo guardar el pronóstico.", duration: 2000 });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete via RPC ─────────────────────────────────────────────
  const deleteForecast = async (id: number) => {
    try {
      const { error } = await supabase.rpc("delete_pronostico", { p_id: id });
      if (error) throw error;
      setForecasts((prev) => prev.filter((f) => f.id !== id));
      sileo.success({ title: "Pronóstico Eliminado", description: "El registro ha sido removido del sistema.", duration: 2000 });
    } catch (err) {
      console.error("Error deleting pronostico:", err);
      sileo.error({ title: "Error", description: "No se pudo eliminar el pronóstico.", duration: 2000 });
    }
  };

  const getEmoji = (animalName: string) =>
    ANIMALS.find((a) => a.name === animalName)?.emoji ?? "🐾";

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Control de Pronósticos</h2>
          <p className="text-sm text-gray-500">Administra los pronósticos y horas pendientes</p>
        </div>
        <button
          onClick={() => openAddModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar Pronóstico
        </button>
      </div>

      {/* ── Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {editId !== null ? "Editar Pronóstico" : "Nuevo Pronóstico"}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {editId !== null
                ? "Modifica los datos del pronóstico seleccionado."
                : "Selecciona el horario y el animal para el nuevo pronóstico."}
            </p>

            <div className="space-y-4">
              {/* Horario */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Horario
                </label>
                <select
                  value={form.hora}
                  disabled={editId !== null}
                  onChange={(e) => setForm((d) => ({ ...d, hora: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  {HOURS_LIST.map((h) => {
                    const isCovered = coveredHours.has(h);
                    return (
                      <option
                        key={h}
                        value={h}
                        className={isCovered ? "text-gray-400 font-medium bg-gray-50" : "text-gray-900"}
                      >
                        {h} {isCovered ? "(Ocupado)" : ""}
                      </option>
                    );
                  })}
                </select>
                {editId === null && coveredHours.has(form.hora) && (
                  <p className="text-xs text-amber-500 mt-1">
                    ⚠ Este horario ya tiene un pronóstico — se sobreescribirá.
                  </p>
                )}
              </div>

              {/* Animal */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Animal
                </label>
                <select
                  value={form.animal}
                  onChange={(e) => {
                    const selAnimal = ANIMALS.find(a => a.name === e.target.value);
                    setForm((d) => ({
                      ...d,
                      animal: e.target.value,
                      numero: parseInt(selAnimal?.number ?? "0", 10)
                    }));
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {ANIMALS.map((a) => (
                    <option key={a.name} value={a.name}>{a.emoji} {a.name}</option>
                  ))}
                </select>
                {/* Preview */}
                <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-10 h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center text-xl shadow-sm">
                    {getEmoji(form.animal)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{form.animal}</p>
                    <p className="text-xs text-gray-400">Vista previa del animal</p>
                  </div>
                </div>
              </div>

              {/* Número Automático (Solo Vista) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Número
                </label>
                <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-500 font-mono font-bold">
                  {formatAnimalNumber(form.animal, form.numero)}
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                disabled={isSaving}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveModal}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  editId !== null ? "Guardar cambios" : "Agregar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Lista de pronósticos */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#1f5650] rounded-t-2xl">
            <h3 className="font-semibold text-white text-sm">Pronósticos Asignados</h3>
            <div className="flex items-center gap-1.5 text-xs text-emerald-100 font-medium">
              <span>{forecasts.length} registrados</span>
              <CircleCheckBig className="h-3.5 w-3.5" />
            </div>
          </div>

          {forecasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Radio className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">No hay pronósticos</p>
              <p className="text-xs text-gray-400 mt-1">Agrega pronósticos usando el botón de arriba.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {forecasts.map((f) => (
                <div
                  key={f.id}
                  className="pronostico-item opacity-0 flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors group"
                >
                  {/* Emoji avatar */}
                  <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-full flex items-center justify-center text-2xl border border-gray-200 shadow-sm">
                    {getEmoji(f.animal)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{f.animal}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <span className="font-mono">{f.hora}</span>
                      <span className="mx-1.5 text-gray-200">·</span>
                      <span className="text-gray-500">{f.loteria}</span>
                    </p>
                    <p className="text-xs mt-1">
                      <span className="text-gray-400">Nro:</span>{" "}
                      <span className="font-bold text-blue-600">
                        {formatAnimalNumber(f.animal, f.numero)}
                      </span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(f)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => deleteForecast(f.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card derecha (Horas sin cubrir) */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
            <div className="flex items-center justify-between px-5 py-3.5 bg-rose-500 rounded-t-2xl">
              <h3 className="font-semibold text-white text-sm">Horarios Vacíos</h3>
              <Clock className="h-4 w-4 text-rose-100" />
            </div>
            <div className="p-5 overflow-y-auto max-h-[500px]">
              {missingHours.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 mb-4">
                    Faltan pronósticos para las siguientes tandas horarias:
                  </p>
                  {missingHours.map((h, i) => (
                    <div
                      key={i}
                      className="horario-item opacity-0 flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 group hover:border-rose-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-400 group-hover:bg-rose-500 transition-colors" />
                        <span className="text-sm font-mono text-gray-700 font-medium">{h}</span>
                      </div>
                      <button
                        onClick={() => openAddModal(h)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 transition-colors"
                      >
                        Añadir
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                    <Save className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">¡Todo cubierto!</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                    Todas las horas del día tienen su pronóstico asignado.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


/* ════════════════════════════════════════════════════════════════
   Sección 3 – Sorteos CRUD
══════════════════════════════════════════════════════════════════ */
const blankSorteoForm = () => ({
  animal: ANIMALS[0].name,
  number: parseInt(ANIMALS[0].number ?? "0", 10),
  hour: HOURS_LIST[0],
  date: new Date().toISOString().split("T")[0],
  emoji: ANIMALS[0].emoji,
});

const SectionSorteos = () => {
  const ITEMS_PER_PAGE = 7;
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(blankSorteoForm());
  const [search, setSearch] = useState("");
  const [scannerInput, setScannerInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Fast Entry Scanner ──────────────────────────────────────────
  const handleScannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerInput.trim()) return;

    // Buscar el animal por número (soportando "0" o "00", "01" etc)
    const animalMatch = ANIMALS.find(
      (a) => String(a.number).padStart(2, "0") === scannerInput.trim().padStart(2, "0")
          || String(a.number) === scannerInput.trim()
    );

    if (!animalMatch) {
      sileo.error({ title: "No encontrado", description: "El número no corresponde a ningún animal.", duration: 2000 });
      setScannerInput("");
      return;
    }

    setIsSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const hoursCoveredToday = new Set(results.filter(r => r.date === today).map(r => r.hour));
      
      let targetHour = HOURS_LIST[0];
      for (const h of HOURS_LIST) {
        if (!hoursCoveredToday.has(h)) {
          targetHour = h;
          break;
        }
      }

      const { error } = await supabase.rpc("upsert_sorteo", {
        p_animal: animalMatch.name,
        p_numero: parseInt(animalMatch.number || "0", 10),
        p_hora: targetHour,
        p_fecha: today,
        p_emoji: animalMatch.emoji,
      });

      if (error) throw error;
      
      sileo.success({ title: "¡Ganador Registrado!", description: `${animalMatch.emoji} ${animalMatch.name} (${targetHour})`, duration: 3000 });
      setScannerInput("");
      
      // Refresh
      const fresh = await refreshSorteos();
      setResults(fresh);
      
    } catch (err) {
      console.error("Error al registrar por escáner:", err);
      sileo.error({ title: "Error", description: "No se pudo registrar el resultado.", duration: 2000 });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────
  const mapRow = (row: any): LotteryResult => ({
    id: row.id,
    animal: row.animal,
    number: row.numero,
    hour: row.hora,
    date: row.fecha,
    emoji: row.emoji,
  });

  const refreshSorteos = async () => {
    const { data, error } = await supabase
      .from("sorteos")
      .select("id, animal, numero, hora, fecha, emoji")
      .order("fecha", { ascending: false })
      .order("hora", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  };

  // ─── Fetch on mount ──────────────────────────────────────────────
  useEffect(() => {
    const fetchSorteos = async () => {
      try {
        const data = await refreshSorteos();
        setResults(data);
      } catch (err) {
        console.error("Error fetching sorteos:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSorteos();
  }, []);

  useEffect(() => {
    if (!containerRef.current || results.length === 0) return;

    anime({
      targets: '.sorteo-item',
      translateX: [-20, 0],
      opacity: [0, 1],
      delay: anime.stagger(40, { start: 50 }),
      duration: 400,
      easing: 'easeOutQuart'
    });

    anime({
      targets: '.panel-item',
      translateX: [20, 0],
      opacity: [0, 1],
      delay: anime.stagger(30, { start: 100 }),
      duration: 350,
      easing: 'easeOutQuart'
    });
  }, [results, search, currentPage]);

  // Date panel
  const availableDates = Array.from(new Set(results.map((r) => r.date))).sort(
    (a, b) => b.localeCompare(a)
  );
  const [panelDate, setPanelDate] = useState(() =>
    availableDates[0] ?? new Date().toISOString().split("T")[0]
  );

  const filtered = results.filter(
    (r) =>
      r.animal.toLowerCase().includes(search.toLowerCase()) ||
      r.date.includes(search) ||
      String(r.number).includes(search)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedResults = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const hoursCoveredForDate = new Set(
    results.filter((r) => r.date === panelDate).map((r) => r.hour)
  );

  const openAddModal = (preHour?: string) => {
    setEditId(null);
    setForm({ ...blankSorteoForm(), hour: preHour ?? HOURS_LIST[0] });
    setModalOpen(true);
  };

  const openEditModal = (r: LotteryResult) => {
    setEditId(r.id);
    setForm({
      animal: r.animal,
      number: r.number,
      hour: r.hour,
      date: r.date,
      emoji: r.emoji,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
  };

  // ─── Save (create or update) via RPC ────────────────────────────
  const saveModal = async () => {
    setIsSaving(true);
    try {
      if (editId !== null) {
        // UPDATE existing
        const { error } = await supabase.rpc("update_sorteo", {
          p_id: editId,
          p_animal: form.animal,
          p_numero: form.number,
          p_hora: form.hour,
          p_fecha: form.date,
          p_emoji: form.emoji,
        });
        if (error) throw error;
        sileo.success({ title: "Sorteo Actualizado", description: "El resultado del sorteo ha sido modificado.", duration: 2000 });
      } else {
        // INSERT (upsert by fecha+hora)
        const { error } = await supabase.rpc("upsert_sorteo", {
          p_animal: form.animal,
          p_numero: form.number,
          p_hora: form.hour,
          p_fecha: form.date,
          p_emoji: form.emoji,
        });
        if (error) throw error;
        if (!availableDates.includes(form.date)) setPanelDate(form.date);
        sileo.success({ title: "Sorteo Registrado", description: "El nuevo resultado del sorteo ha sido guardado.", duration: 2000 });
      }

      // Invalidar caché local para que la página pública reciba los datos frescos
      clearCache(CACHE_KEYS.SORTEOS);

      // Refresh from DB
      const fresh = await refreshSorteos();
      setResults(fresh);
      closeModal();
    } catch (err) {
      console.error("Error saving sorteo:", err);
      sileo.error({ title: "Error", description: "No se pudo guardar el sorteo.", duration: 2000 });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete via RPC ──────────────────────────────────────────────
  const deleteRow = async (id: number) => {
    try {
      const { error } = await supabase.rpc("delete_sorteo", { p_id: id });
      if (error) throw error;
      setResults((prev) => prev.filter((r) => r.id !== id));
      sileo.success({ title: "Sorteo Eliminado", description: "El registro del sorteo ha sido removido.", duration: 2000 });
    } catch (err) {
      console.error("Error deleting sorteo:", err);
      sileo.error({ title: "Error", description: "No se pudo eliminar el sorteo.", duration: 2000 });
    }
  };

  const updateFormAnimal = (name: string) => {
    const a = ANIMALS.find((x) => x.name === name);
    setForm((d) => ({
      ...d,
      animal: name,
      emoji: a?.emoji ?? "🐾",
      number: parseInt(a?.number ?? "0", 10),
    }));
  };

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Gestión de Sorteos</h2>
          <p className="text-sm text-gray-500">Crea, edita y elimina resultados de sorteos</p>
        </div>
        <button
          onClick={() => openAddModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo sorteo
        </button>
      </div>

      {/* ── Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {editId !== null ? "Editar Sorteo" : "Nuevo Sorteo"}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {editId !== null ? "Modifica los datos del sorteo." : "Registra un nuevo resultado de sorteo."}
            </p>

            <div className="space-y-4">
              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((d) => ({ ...d, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Hora */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Horario</label>
                <select
                  value={form.hour}
                  onChange={(e) => setForm((d) => ({ ...d, hour: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {HOURS_LIST.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Animal */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Animal</label>
                <select
                  value={form.animal}
                  onChange={(e) => updateFormAnimal(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {ANIMALS.map((a) => (
                    <option key={a.name} value={a.name}>{a.emoji} {a.name}</option>
                  ))}
                </select>
                {/* Preview */}
                <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-10 h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center text-xl shadow-sm">
                    {form.emoji}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{form.animal}</p>
                    <p className="text-xs text-gray-400">Nro: <span className="font-bold text-blue-600">{formatAnimalNumber(form.animal, form.number)}</span></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={saveModal} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                {editId !== null ? "Guardar cambios" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Acciones Superiores (Buscar / Escanear) ────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        {/* Búsqueda normal */}
        <input
          type="text"
          placeholder="Buscar por animal, fecha o número..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />

        {/* Módulo Escáner (Ingreso Rápido) */}
        <form onSubmit={handleScannerSubmit} className="flex-1 max-w-sm flex">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <input
              type="text"
              placeholder="Escáner/Número + Enter"
              title="Ingresa el número para lanzar el animal automáticamente a la ronda más cercana"
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              disabled={isSaving}
              autoFocus
              className="w-full pl-9 pr-3 py-2 border-2 border-amber-300 rounded-lg text-sm font-bold text-amber-900 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 transition-colors placeholder:text-amber-600/50"
            />
          </div>
        </form>
      </div>

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Lista de sorteos */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#1f5650] rounded-t-2xl">
            <h3 className="font-semibold text-white text-sm">Sorteos Registrados</h3>
            <div className="flex items-center gap-1.5 text-xs text-emerald-100 font-medium">
              <span>{filtered.length} registrados</span>
              <CircleCheckBig className="h-3.5 w-3.5" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Radio className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Sin resultados</p>
              <p className="text-xs text-gray-400 mt-1">No hay sorteos que coincidan con tu búsqueda.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {paginatedResults.map((r) => (
                <div
                  key={r.id}
                  className="sorteo-item opacity-0 flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors group"
                >
                  {/* Emoji avatar */}
                  <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-full flex items-center justify-center text-2xl border border-gray-200 shadow-sm">
                    {r.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.animal}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <span className="font-mono">{r.date}</span>
                      <span className="mx-1.5 text-gray-200">·</span>
                      <span className="font-mono">{r.hour}</span>
                    </p>
                    <p className="text-xs mt-1">
                      <span className="text-gray-400">Nro:</span>{" "}
                      <span className="font-bold text-blue-600">
                        {formatAnimalNumber(r.animal, r.number)}
                      </span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => deleteRow(r.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filtered.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60">
              <p className="text-xs text-gray-500">
                Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-xs font-semibold text-gray-500 min-w-[58px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panel derecho – Horarios por fecha */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1f5650] rounded-t-2xl">
              <h3 className="font-semibold text-white text-sm">Horarios del Día</h3>
              <Clock className="h-4 w-4 text-emerald-200" />
            </div>

            {/* Date selector */}
            <div className="px-4 pt-4 pb-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Fecha</label>
              <input
                type="date"
                value={panelDate}
                onChange={(e) => setPanelDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="p-4 space-y-2 overflow-y-auto max-h-[420px]">
              {HOURS_LIST.map((h) => {
                const covered = hoursCoveredForDate.has(h);
                const entry = results.find((r) => r.date === panelDate && r.hour === h);
                return (
                  <div
                    key={h}
                    className={`panel-item opacity-0 flex items-center justify-between p-3 rounded-lg border transition-colors ${covered
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-gray-100 bg-gray-50 hover:border-blue-200"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${covered ? "bg-emerald-400" : "bg-gray-300"
                          }`}
                      />
                      <div>
                        <p className="text-xs font-mono font-medium text-gray-700">{h}</p>
                        {covered && entry && (
                          <p className="text-xs text-emerald-600 font-medium truncate max-w-[120px]">
                            {entry.emoji} {entry.animal} · <span className="font-bold">{formatAnimalNumber(entry.animal, entry.number)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {covered ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                        ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => openAddModal(h)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        Añadir
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


/* ════════════════════════════════════════════════════════════════
   Sección 4 – Historial
══════════════════════════════════════════════════════════════════ */
const SectionHistorial = () => {
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSorteos = async () => {
      try {
        const { data, error } = await supabase
          .from("sorteos")
          .select("*")
          .order("fecha", { ascending: false })
          .order("hora", { ascending: true });

        if (error) throw error;

        const mapped: LotteryResult[] = (data ?? []).map((row: any) => ({
          id: row.id,
          animal: row.animal,
          number: row.numero,
          hour: row.hora,
          date: row.fecha,
          emoji: row.emoji,
        }));
        setResults(mapped);
      } catch (err) {
        console.error("Error fetching historial:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSorteos();
  }, []);

  useEffect(() => {
    if (!containerRef.current || results.length === 0) return;
    anime({
      targets: '.historial-row',
      translateY: [15, 0],
      opacity: [0, 1],
      delay: anime.stagger(30, { start: 50 }),
      duration: 350,
      easing: 'easeOutQuart'
    });
  }, [results]);

  // Obtener las últimas 5 fechas únicas, ordenadas descendentemente
  const uniqueDates = Array.from(new Set(results.map((r) => r.date))).sort(
    (a, b) => b.localeCompare(a)
  );
  const displayDates = uniqueDates.slice(0, 5);

  const getDayLabel = (dateString: string) => {
    const [y, m, d] = dateString.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    return {
      name: dias[dateObj.getDay()],
      ym: `${y}-${String(m).padStart(2, "0")}`,
      md: `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    };
  };

  const borderColors = [
    "border-blue-500",
    "border-red-500",
    "border-yellow-500",
    "border-emerald-500",
    "border-purple-500",
    "border-pink-500",
    "border-cyan-500",
    "border-orange-500",
  ];

  // Color seudo-aleatorio consistente
  const getColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
    return borderColors[hash % borderColors.length];
  };

  const bgColors = ["bg-[#22675e]", "bg-[#297b70]", "bg-[#2f8f82]", "bg-[#35a394]", "bg-[#3bb7a6]"];

  return (
    <div ref={containerRef} className="w-full max-w-full">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Historial de Sorteos</h2>
        <p className="text-sm text-gray-500">Consulta el registro completo de todos los sorteos en vista de cuadrícula</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden w-full relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
            <l-squircle
              size="50"
              stroke="6"
              stroke-length="0.15"
              bg-opacity="0.1"
              speed="0.8"
              color="#2563eb"
            ></l-squircle>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead>
              <tr>
                <th className="bg-[#1f5650] text-white px-6 py-4 font-semibold text-left border-b border-[#1f5650] whitespace-nowrap align-middle">
                  Horario
                </th>
                {displayDates.map((date, idx) => {
                  const label = getDayLabel(date);
                  const bgColor = bgColors[idx % bgColors.length];
                  return (
                    <th key={date} className={`${bgColor} text-white px-4 py-3 font-medium text-center border-l border-white/20 align-middle`}>
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="text-sm">{label.name}</span>
                        <span className="text-xs text-white/90">{label.ym}</span>
                        <span className="text-xs mt-0.5 font-bold">{label.md}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS_LIST.map((hour) => (
                <tr key={hour} className="historial-row opacity-0 hover:bg-gray-50/50 group">
                  <td className="px-6 py-4 text-xs font-semibold text-gray-600 border border-gray-100 bg-gray-50/30 whitespace-nowrap">
                    {hour}
                  </td>
                  {displayDates.map((date) => {
                    const result = results.find((r) => r.date === date && r.hour === hour);
                    return (
                      <td key={date} className="p-3 border border-gray-100 text-center bg-white group-hover:bg-gray-50/50 transition-colors">
                        {result ? (
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <div
                              className={`w-10 h-10 flex items-center justify-center rounded-full border-[2px] ${getColor(
                                result.animal
                              )} bg-white shadow-sm`}
                            >
                              <span className="text-xl leading-none">{result.emoji}</span>
                            </div>
                            <span className="text-[10px] sm:text-xs font-medium text-gray-600 capitalize">
                              {result.animal}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Shell principal
══════════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("adminAuth")) {
      navigate("/");
    }
  }, [navigate]);

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard": return <SectionDashboard />;
      case "pronosticos": return <SectionPronosticos />;
      case "sorteos": return <SectionSorteos />;
      case "historial": return <SectionHistorial />;
      case "carrusel": return <SectionCarruselAdmin />;
      case "probabilidades": return <SectionProbabilidades />;
      case "configuracion": return <SectionConfiguracion />;
    }
  };

  return (
    <>
      <div className="admin-light-theme flex flex-col md:flex-row h-screen bg-gray-50 font-sans overflow-hidden relative">
        {/* ── Mobile Header ───────────────────────────────────── */}
        <div className="md:hidden flex items-center justify-between bg-[#1a1f37] px-5 py-4 text-white z-40 relative">
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
              Lotto <span className="text-blue-400">Azar</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Dropdown Menu ────────────────────────────── */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-[68px] left-0 right-0 bg-[#1a1f37] z-50 border-t border-white/10 shadow-2xl flex flex-col h-[calc(100vh-68px)] animate-in slide-in-from-top-2 duration-200">
             <nav className="flex-1 py-4 overflow-y-auto">
                <p className="px-5 text-xs text-white/40 uppercase tracking-widest mb-3 font-semibold">Módulos</p>
                {navItems.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => { setActiveSection(id); setIsMobileMenuOpen(false); }}
                    className={`flex items-center w-full px-5 py-3.5 text-base text-left transition-colors ${
                      activeSection === id
                        ? "bg-blue-600/20 text-blue-400 font-semibold border-l-4 border-blue-500"
                        : "text-white/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent"
                    }`}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 mr-3 ${activeSection === id ? "text-blue-400" : "text-white/50"}`} />
                    <span className="flex-1 leading-tight">{label}</span>
                  </button>
                ))}
             </nav>
             <div className="p-5 border-t border-white/10 bg-[#121629]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                    A
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Administrador</p>
                    <p className="text-xs text-white/40">whpj6436@gmail.com</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sessionStorage.removeItem("adminAuth");
                    navigate("/");
                  }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
             </div>
          </div>
        )}

        {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
        <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-[#1a1f37] text-white z-30 border-r border-white/5 overflow-hidden">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/5">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Lotto <span className="text-blue-400">Azar</span>
            </span>
            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-semibold">
              Panel de Control
            </p>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <p className="px-5 text-[10px] text-white/30 uppercase tracking-widest mb-3 font-semibold">
              Módulos
            </p>
            <div className="space-y-1 px-3">
              {navItems.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left rounded-lg transition-colors ${
                    activeSection === id
                      ? "bg-blue-600/20 text-blue-400 font-medium"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${activeSection === id ? "text-blue-400" : "text-white/40"}`} />
                  <span className="flex-1 leading-tight">{label}</span>
                  {activeSection === id && (
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 ml-auto opacity-50" />
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* User + logout */}
          <div className="p-4 border-t border-white/5 bg-[#1a1f37]">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Admin</p>
                <p className="text-[10px] text-white/40 truncate">whpj6436@gmail.com</p>
              </div>
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem("adminAuth");
                navigate("/");
              }}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium text-white/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-gray-50 flex flex-col min-w-0">
          {renderSection()}
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;
