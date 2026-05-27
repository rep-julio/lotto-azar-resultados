import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { LotteryResult } from "@/data/mockData";
import { Search, CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatAnimalNumber } from "@/lib/utils";

interface HistorySectionProps {
  results: LotteryResult[];
  loadingHistory?: boolean;
}

// Colour ring per animal initial (decorative, mimics the red circle style)
const RING_COLORS = [
  "#e53e3e", "#dd6b20", "#d69e2e", "#38a169",
  "#3182ce", "#805ad5", "#d53f8c", "#319795",
  "#e53e3e", "#c53030",
];

function getAnimalColor(animal: string): string {
  let hash = 0;
  for (let i = 0; i < animal.length; i++) hash += animal.charCodeAt(i);
  return RING_COLORS[hash % RING_COLORS.length];
}

function formatDateHeader(dateStr: string) {
  // "2026-03-10" → "03-10"
  const parts = dateStr.split("-");
  return `${parts[1]}-${parts[2]}`;
}

function formatDateFull(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WORKING_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getDayName(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return DAY_NAMES[d.getDay()];
}

// Helper to get week bounds (Monday to Saturday) based on a given date string
function getWeekBounds(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  // If Sunday (0), shift to previous Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    weekDates.push(current.toISOString().split("T")[0]);
  }
  return weekDates;
}

const HOURS_ORDER = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM",
];

const HistorySection = ({ results, loadingHistory = false }: HistorySectionProps) => {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const COLS_PER_PAGE = isMobile ? 3 : 7;

  // Build a lookup map: [date][hour] → result
  const resultMap = useMemo(() => {
    const map: Record<string, Record<string, LotteryResult>> = {};
    for (const r of results) {
      if (!map[r.date]) map[r.date] = {};
      map[r.date][r.hour] = r;
    }
    return map;
  }, [results]);

  // Group dates by week (Monday-Saturday chunks)
  const weeks = useMemo(() => {
    const allUniqueDates = Array.from(new Set(results.map((r) => r.date))).sort(
      (a, b) => (a < b ? 1 : -1) // most recent first
    );
    
    // Convert flat dates into unique weeks
    const weekMap = new Map<string, string[]>();
    
    allUniqueDates.forEach(date => {
      const d = new Date(date + "T12:00:00");
      // Ya no saltamos los domingos (día 0)
      
      const bounds = getWeekBounds(date);
      const weekKey = bounds[0]; // Monday is the key
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, bounds);
      }
    });

    // Array of weeks (each week is an array of 7 date strings Mon-Sun)
    let sortedWeeks = Array.from(weekMap.values()).sort((a, b) => (a[0] < b[0] ? 1 : -1));

    // Simple date filtering: if a week has no dates bounding the filter, we can drop it.
    // However, to keep it simple and ensure we don't break the weekly view, 
    // we just check if the week's Sunday >= dateFrom and Monday <= dateTo.
    if (dateFrom) {
      sortedWeeks = sortedWeeks.filter(week => week[6] >= dateFrom);
    }
    if (dateTo) {
      sortedWeeks = sortedWeeks.filter(week => week[0] <= dateTo);
    }

    return sortedWeeks;
  }, [results, dateFrom, dateTo]);

  const totalPages = weeks.length;
  // If mobile, we could slice the 6 days into 2 pages of 3.
  // For simplicity based on user request ("organiza por los respectivos dias"), 
  // we will just horizontal-scroll the 6 columns on mobile, matching standard calendars,
  // or we can slice the week down if mobile. Let's keep the full week but let it scroll on mobile
  // by forcing COLS_PER_PAGE=6 and letting CSS handle overflow.
  
  const currentWeekDates = weeks[page] || [];

  // Filter rows by search (highlight matching animal name)
  const searchLower = search.trim().toLowerCase();
  const searchMatches = (animal: string) =>
    !searchLower || animal.toLowerCase().includes(searchLower);

  return (
    <section className="w-full py-6 sm:py-12 px-2 sm:px-4" aria-label="Historial de sorteos">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <CalendarDays className="h-6 w-6 text-primary" />
          <h2 className="text-display-sm text-foreground">Historial de Sorteos</h2>
        </div>
        <p className="text-sm text-muted-foreground">Últimos resultados de Lotto Azar</p>
        <div className="section-divider mt-4" />
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="max-w-4xl mx-auto mb-4 sm:mb-6 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end"
      >
        {/* Search */}
        <div className="relative w-full sm:flex-1 sm:min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar animal..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="history-filter-input pl-9"
            aria-label="Buscar animal"
          />
        </div>
        {/* Date range row */}
        <div className="flex gap-3 w-full sm:w-auto sm:contents">
          {/* From */}
          <div className="flex flex-col gap-1 flex-1 sm:flex-none">
            <label className="text-xs font-medium text-muted-foreground">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              className="history-filter-input"
              aria-label="Fecha desde"
            />
          </div>
          {/* To */}
          <div className="flex flex-col gap-1 flex-1 sm:flex-none">
            <label className="text-xs font-medium text-muted-foreground">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              className="history-filter-input"
              aria-label="Fecha hasta"
            />
          </div>
        </div>
      </motion.div>

      {/* Banner de carga del histórico en background */}
      {loadingHistory && (
        <div className="flex items-center justify-center gap-2 mb-3 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Cargando historial completo en segundo plano…</span>
        </div>
      )}

      {/* Table wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="max-w-5xl mx-auto"
      >
        {weeks.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No se encontraron resultados.
          </p>
        ) : (
          <>
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 mb-3">
                <span className="text-xs text-muted-foreground">
                  Semana: {formatDateFull(currentWeekDates[0])} –{" "}
                  {formatDateFull(currentWeekDates[6])}
                </span>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="history-page-btn"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium text-foreground">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="history-page-btn"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Responsive scroll container */}
            <div className="history-table-scroll">
              <table className="history-table">
                <thead>
                  <tr>
                    <th className="history-th history-th-hour">Horario</th>
                    {currentWeekDates.map((date) => (
                      <th key={date} className="history-th history-th-date">
                        <span className="block text-[10px] font-normal opacity-80 uppercase tracking-wider">
                          {getDayName(date)}
                        </span>
                        <span className="block text-xs font-bold">
                          {date.substring(0, 7)}
                        </span>
                        <span className="block text-sm font-extrabold tracking-tight">
                          {formatDateHeader(date)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS_ORDER.map((hour, rowIdx) => (
                    <tr
                      key={hour}
                      className={rowIdx % 2 === 0 ? "history-row-even" : "history-row-odd"}
                    >
                      <td className="history-td history-td-hour">{hour}</td>
                      {currentWeekDates.map((date) => {
                        const r = resultMap[date]?.[hour];
                        const highlight = r && searchMatches(r.animal);
                        const dimmed = searchLower && r && !searchMatches(r.animal);
                        return (
                          <td key={date} className="history-td history-td-cell">
                            {r ? (
                              <div
                                className={`animal-cell ${dimmed ? "animal-cell-dim" : ""} ${highlight && searchLower ? "animal-cell-highlight" : ""}`}
                                title={`${r.animal} · #${formatAnimalNumber(r.animal, r.number)}`}
                              >
                                <div
                                  className="animal-circle"
                                  style={{ borderColor: getAnimalColor(r.animal) }}
                                >
                                  <span className="animal-emoji" role="img" aria-label={r.animal}>
                                    {r.emoji}
                                  </span>
                                </div>
                                <span className="animal-name">{r.animal}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>
    </section>
  );
};

export default HistorySection;
