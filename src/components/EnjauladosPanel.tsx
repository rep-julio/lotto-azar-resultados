import React, { useState } from 'react';
import { type Enjaulado } from '@/hooks/useEnjaulados';
import { Lock, Clock, CalendarX2, ChevronLeft, ChevronRight, ArrowDownWideNarrow, ArrowUpNarrowWide, Loader2 } from 'lucide-react';
import { cn, formatAnimalNumber } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface EnjauladosPanelProps {
  enjaulados: Enjaulado[];
  loadingHistory?: boolean;
}

export const EnjauladosPanel: React.FC<EnjauladosPanelProps> = ({ enjaulados, loadingHistory = false }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [sortDesc, setSortDesc] = useState(true);

  const sortedEnjaulados = React.useMemo(() => {
    const list = [...(enjaulados || [])];
    if (!sortDesc) {
      list.reverse();
    }
    return list;
  }, [enjaulados, sortDesc]);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(sortedEnjaulados.length / itemsPerPage);
  
  const startIndex = currentPage * itemsPerPage;
  const paginatedEnjaulados = sortedEnjaulados.slice(startIndex, startIndex + itemsPerPage);

  const getBadgeColor = (days: number, isNever: boolean) => {
    if (isNever) return "bg-gray-100 text-gray-600 border-gray-200";
    if (days >= 7) return "bg-red-100 text-red-700 border-red-200";
    if (days >= 4) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  const getStatusText = (days: number, isNever: boolean) => {
    if (isNever) return "Sin registro";
    if (days === 0) return "Salió hoy";
    if (days === 1) return "1 día oculto";
    return `${days} días oculto`;
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative dark:bg-white/10 dark:border-white/15 dark:backdrop-blur-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {/* Background Decorative Element */}
      <div className="absolute -right-10 -top-10 text-slate-50 opacity-50 pointer-events-none dark:text-white/10">
        <Lock size={160} strokeWidth={1} />
      </div>

      <div className="relative mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm border border-slate-200/60 dark:bg-white/10 dark:text-slate-100 dark:border-white/15">
            <CalendarX2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Enjaulados</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Animales con más tiempo sin salir</p>
            {loadingHistory && (
              <div className="flex items-center gap-1.5 mt-1">
                <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                <span className="text-[11px] font-medium text-amber-500">Actualizando con historial completo…</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSortDesc(!sortDesc);
              setCurrentPage(0); // reset page on sort
            }}
            title={sortDesc ? "Ordenar por más recientes" : "Ordenar por más atrasados"}
            className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-700 transition-all text-xs font-semibold dark:bg-white/10 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/20 dark:hover:text-white"
          >
            {sortDesc ? <ArrowDownWideNarrow className="w-4 h-4" /> : <ArrowUpNarrowWide className="w-4 h-4" />}
            {sortDesc ? "Atrasados" : "Recientes"}
          </button>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 h-8 bg-slate-50 border border-slate-200 rounded-xl p-0.5 dark:bg-white/10 dark:border-white/15">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all dark:text-slate-200 dark:hover:bg-white/20"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-500 min-w-[3rem] text-center dark:text-slate-200">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all dark:text-slate-200 dark:hover:bg-white/20"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 mt-2">
        <AnimatePresence mode="popLayout">
          {paginatedEnjaulados.map((animal, i) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
              key={animal.name}
              className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-slate-100 shadow-sm relative group hover:bg-slate-100/80 hover:border-slate-300 hover:shadow-md transition-all duration-300 dark:bg-white/10 dark:border-white/10 dark:hover:bg-white/20 dark:hover:border-white/25"
            >
              {/* Badge */}
              <div
                className={cn(
                  "absolute -top-3 inset-x-0 w-max mx-auto px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border shadow-sm flex items-center gap-1.5 z-10 transition-colors",
                  getBadgeColor(animal.daysSinceLastSeen, animal.isNever)
                )}
              >
                <Clock className="w-3 h-3" />
                {getStatusText(animal.daysSinceLastSeen, animal.isNever)}
              </div>

              {/* Animal Emoji */}
              <div className="mt-3 text-5xl mb-2 filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300 ease-out">{animal.emoji}</div>
              
              {/* Animal Info */}
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{animal.name}</p>
                <div className="inline-flex py-0.5 px-2 bg-white rounded-md border border-slate-200 dark:bg-black/25 dark:border-white/15">
                  <span className="text-xs font-black text-slate-900 tracking-widest dark:text-white">{formatAnimalNumber(animal.name, animal.number)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {enjaulados.length === 0 && (
        <div className="text-center py-8 text-slate-400 dark:text-slate-300">
          <p className="text-sm font-medium">Buscando datos...</p>
        </div>
      )}
    </div>
  );
};
