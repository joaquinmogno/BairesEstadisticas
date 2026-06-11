"use client";

import NextImage from "next/image";
import { ImagePlus, Loader2, UploadCloud } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { SelectInput, TextInput } from "./admin-shell";

export type MediaType = "team_badge" | "player_photo" | "team_photo" | "tournament_logo";
export type MediaAsset = { id: string; type: MediaType; url: string; alt?: string };

export function MediaPicker({
  type,
  value,
  onChange,
  compact = false,
}: {
  type: MediaType;
  value?: string;
  onChange: (url: string) => void;
  compact?: boolean;
}) {
  const inputId = useId();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAssets();
  }, []);

  function loadAssets() {
    fetch("/api/media", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) return [];
        return response.json();
      })
      .then((payload: MediaAsset[]) => setAssets(payload))
      .catch(() => setAssets([]));
  }

  async function upload() {
    if (!file) return;
    const form = new FormData();
    form.append("type", type);
    form.append("alt", alt || file.name);
    form.append("file", file);

    setUploading(true);
    setError("");
    try {
      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "upload failed");
      }
      const asset = await response.json() as MediaAsset;
      setAssets((current) => [asset, ...current]);
      setFile(null);
      setAlt("");
      onChange(asset.url);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(message ? `No se pudo subir la imagen: ${message}` : "No se pudo subir la imagen. Verifica que la API este corriendo.");
    } finally {
      setUploading(false);
    }
  }

  const filtered = useMemo(() => assets.filter((asset) => asset.type === type), [assets, type]);

  return (
    <div className="grid gap-3">
      <div className={compact ? "grid grid-cols-[88px_minmax(0,1fr)] gap-3" : "grid gap-3"}>
        <div className={compact ? "relative h-[88px] w-[88px] overflow-hidden rounded-lg border border-slate-200 bg-white" : "relative h-36 w-full overflow-hidden rounded-lg border border-slate-200 bg-white"}>
          {value ? (
            <NextImage src={value} alt="" fill sizes={compact ? "88px" : "320px"} unoptimized className="object-contain p-1" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400">
              <ImagePlus size={compact ? 24 : 32} />
            </div>
          )}
        </div>
        <div className="grid content-start gap-2">
          <label htmlFor={inputId} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm active:scale-[0.99]">
            <UploadCloud size={17} />
            {file ? "Cambiar archivo" : value ? "Cambiar imagen" : "Subir imagen"}
          </label>
          {file ? (
            <>
              <TextInput value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Descripcion" className="!h-10 text-sm" />
              <button type="button" disabled={uploading} onClick={upload} className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-black text-white disabled:opacity-50">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : null}
                {uploading ? "Subiendo" : "Usar imagen"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="hidden">
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            setError("");
            setFile(event.target.files?.[0] ?? null);
          }}
          className="hidden"
        />
      </div>
      {filtered.length ? (
        <SelectInput value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="!h-10 text-sm">
          <option value="">Elegir imagen existente</option>
          {filtered.map((asset) => (
            <option key={asset.id} value={asset.url}>{asset.alt || asset.url}</option>
          ))}
        </SelectInput>
      ) : null}
      {error ? <p className="text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  );
}
