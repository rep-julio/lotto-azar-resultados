import { useState, useEffect, useRef } from "react";
import LottoHeader from "@/components/LottoHeader";
import NavBar from "@/components/NavBar";
import HeroSection from "@/components/HeroSection";
import HistorySection from "@/components/HistorySection";
import Footer from "@/components/Footer";
import SorteoInfoSection from "@/components/SorteoInfoSection";
import { ProbabilityPanel } from "@/components/ProbabilityPanel";
import { EnjauladosPanel } from "@/components/EnjauladosPanel";
import { AnimalCarousel } from "@/components/AnimalCarousel";
import { useSorteosContext } from "@/context/SorteosContext";
import { useEnjaulados } from "@/hooks/useEnjaulados";
import { useTheme } from "@/hooks/useTheme";
import { Loader2 } from "lucide-react";

const Index = () => {
  useTheme(); // ensures ThemeProvider effect runs on this route
  const [updatedAgo, setUpdatedAgo] = useState(2);
  const heroRef    = useRef<HTMLDivElement>(null);
  const premiosRef = useRef<HTMLDivElement>(null);
  const probRef    = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const { results, loading, loadingHistory, error } = useSorteosContext();
  const enjaulados = useEnjaulados(results);

  // tick "updated X mins ago"
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdatedAgo((prev) => (prev >= 5 ? 0 : prev + 1));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const scrollToHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleNavScroll = (section: "inicio" | "premios" | "probabilidades" | "historial") => {
    const map = {
      inicio:         heroRef,
      premios:        premiosRef,
      probabilidades: probRef,
      historial:      historyRef,
    } as const;
    map[section].current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 w-full flex flex-col shadow-sm bg-background">
        <LottoHeader
          onToggleFilters={scrollToHistory}
        />
      </div>
      {/* NavBar now scrolls with the page */}
      <NavBar onScrollTo={handleNavScroll} />
      {/* main rest of content */}
      <main className="pt-4">
        <div ref={heroRef}>
          <HeroSection updatedAgo={updatedAgo} />
        </div>

        {/* Panel de Enjaulados y Probabilidades */}
        {!loading && !error && (
          <div ref={probRef} className="container max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div ref={premiosRef} className="lg:col-span-4">
              <ProbabilityPanel results={results} />
            </div>
            <div className="lg:col-span-8">
              <EnjauladosPanel enjaulados={enjaulados} loadingHistory={loadingHistory} />
            </div>
          </div>
        )}

        {/* Carrusel de animales */}
        <AnimalCarousel />

        <div ref={historyRef} className="container max-w-7xl mx-auto px-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm">Cargando historial…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-destructive">
              <span className="text-sm font-medium">Error al cargar el historial</span>
              <span className="text-xs opacity-70">{error}</span>
            </div>
          ) : (
            <HistorySection results={results} loadingHistory={loadingHistory} />
          )}
        </div>
      </main>

      <SorteoInfoSection />
      <Footer />
    </div>
  );
};

export default Index;
