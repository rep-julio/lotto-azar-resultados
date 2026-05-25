import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface AnimalSlide {
  id: number;
  nombre: string;
  imagen_url: string;
  orden: number;
}

export const AnimalCarousel = () => {
  const [animals, setAnimals] = useState<AnimalSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const fetchAnimals = async () => {
      const { data, error } = await supabase
        .from("carrusel_animales")
        .select("id, nombre, imagen_url, orden")
        .order("orden", { ascending: true });
      if (!error && data) setAnimals(data);
      setLoading(false);
    };
    fetchAnimals();
  }, []);

  useEffect(() => {
    if (!animals.length) return;
    const track = trackRef.current;
    if (!track) return;

    const speed = 0.6; // px por frame
    const totalWidth = track.scrollWidth / 2; // mitad porque duplicamos

    const animate = () => {
      if (!pausedRef.current) {
        posRef.current += speed;
        if (posRef.current >= totalWidth) posRef.current = 0;
        if (track) track.style.transform = `translateX(-${posRef.current}px)`;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animals]);

  if (loading) return null;
  if (!animals.length) return null;

  // Triplicamos para garantizar bucle suave en cualquier ancho
  const slides = [...animals, ...animals, ...animals];

  return (
    <section className="py-14 overflow-hidden relative bg-gradient-to-b from-transparent to-transparent">
      {/* Título */}
      <div className="text-center mb-8 px-4">
        <h2 className="text-display-sm text-foreground">
          Conoce a nuestros animales
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Los protagonistas de cada sorteo
        </p>
      </div>

      {/* Fade edges */}
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-background to-transparent" />

        {/* Track */}
        <div
          className="overflow-hidden"
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
        >
          <div
            ref={trackRef}
            className="flex gap-4 will-change-transform"
            style={{ width: "max-content" }}
          >
            {slides.map((animal, idx) => (
              <div
                key={`${animal.id}-${idx}`}
                className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-md border border-white/10 relative"
              >
                <img
                  src={animal.imagen_url}
                  alt={animal.nombre}
                  className="w-full h-full object-cover"
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnimalCarousel;
