import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ImagePlus, Loader2, RefreshCw, GripVertical } from "lucide-react";
import { sileo } from "sileo";
import { supabase } from "@/lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ──────────────────────────────────────────────
   Types
────────────────────────────────────────────── */
interface AnimalSlide {
  id: number;
  nombre: string;
  imagen_url: string;
  orden: number;
}

const BUCKET = "carrusel-animales";

/* ──────────────────────────────────────────────
   Helpers
────────────────────────────────────────────── */
function padNum(n: number) {
  return String(n).padStart(2, "0");
}

/* ──────────────────────────────────────────────
   Component
────────────────────────────────────────────── */
export const SectionCarrusel: React.FC = () => {
  const [animals, setAnimals] = useState<AnimalSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Fetch ── */
  const fetchAnimals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("carrusel_animales")
      .select("id, nombre, imagen_url, orden")
      .order("orden", { ascending: true });
    if (!error && data) setAnimals(data);
    setLoading(false);
  };

  useEffect(() => { fetchAnimals(); }, []);

  /* ── Upload ── */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    try {
      const nextOrden = animals.length ? Math.max(...animals.map((a) => a.orden)) + 1 : 1;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() ?? "jpg";
        const fileName = `animal_${Date.now()}_${i}.${ext}`;

        // 1. Upload to storage
        const { error: storageErr } = await supabase.storage
          .from(BUCKET)
          .upload(fileName, file, { 
            contentType: file.type, 
            cacheControl: "31536000",
            upsert: false 
          });

        if (storageErr) throw storageErr;

        // 2. Get public URL
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(fileName);

        // 3. Insert row
        const nombre = `animal #${padNum(nextOrden + i)}`;
        const { error: dbErr } = await supabase
          .from("carrusel_animales")
          .insert({
            nombre,
            imagen_url: urlData.publicUrl,
            orden: nextOrden + i,
          });

        if (dbErr) throw dbErr;
      }

      sileo.success({
        title: "Imagen(es) subida(s)",
        description: `${files.length} animal(es) añadido(s) al carrusel.`,
        duration: 2500,
      });
      await fetchAnimals();
    } catch (err: any) {
      console.error(err);
      sileo.error({
        title: "Error al subir",
        description: err?.message ?? "Ocurrió un error inesperado.",
        duration: 3000,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ── Delete ── */
  const handleDelete = async (animal: AnimalSlide) => {
    setDeletingId(animal.id);
    try {
      // Extract storage path from URL
      const url = new URL(animal.imagen_url);
      const pathParts = url.pathname.split(`/${BUCKET}/`);
      const storagePath = pathParts[1] ?? "";

      if (storagePath) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
      }

      const { error } = await supabase
        .from("carrusel_animales")
        .delete()
        .eq("id", animal.id);

      if (error) throw error;

      sileo.success({ title: "Animal eliminado", description: animal.nombre, duration: 2000 });
      setAnimals((prev) => prev.filter((a) => a.id !== animal.id));
    } catch (err: any) {
      console.error(err);
      sileo.error({ title: "Error al eliminar", description: err?.message, duration: 3000 });
    } finally {
      setDeletingId(null);
    }
  };

  /* ──────────────────────────────────────────────
     Render
  ────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Carrusel de Animales</h2>
          <p className="text-sm text-gray-500">
            Gestiona las imágenes que aparecen en el carrusel público del sitio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnimals}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50"
            title="Recargar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {uploading ? "Subiendo..." : "Añadir animal(es)"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Stats badge */}
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          {animals.length} animal{animals.length !== 1 ? "es" : ""} en el carrusel
        </span>
        {animals.length === 0 && !loading && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full font-medium">
            ⚠️ El carrusel está vacío — sube al menos una imagen
          </span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : animals.length === 0 ? (
        /* Empty state */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-4 py-24 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
            <ImagePlus className="h-7 w-7 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600 group-hover:text-blue-700 transition-colors">
              Haz clic para subir imágenes
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — puedes seleccionar varios a la vez</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Upload tile */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
              <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <span className="text-[11px] font-semibold text-gray-400 group-hover:text-blue-500 text-center px-2 leading-tight transition-colors">
              Añadir imagen
            </span>
          </div>

          {/* Animal tiles */}
          {animals.map((animal) => (
            <div
              key={animal.id}
              className="aspect-square rounded-2xl overflow-hidden relative group border border-gray-100 shadow-sm"
            >
              <img
                src={animal.imagen_url}
                alt={animal.nombre}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex flex-col items-center justify-center gap-2 rounded-2xl">
                {/* Delete button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={deletingId === animal.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-lg disabled:opacity-60"
                    >
                      {deletingId === animal.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Eliminar
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la imagen "{animal.nombre}" del carrusel.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(animal)} className="bg-rose-600 hover:bg-rose-700 text-white">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Name badge */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">
                  {animal.nombre}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info note */}
      {animals.length > 0 && (
        <p className="mt-5 text-[11px] text-gray-400 text-center">
          Las imágenes se muestran en el carrusel público en el orden en que fueron añadidas.
          Pasa el cursor sobre una imagen para eliminarla.
        </p>
      )}
    </div>
  );
};

export default SectionCarrusel;
