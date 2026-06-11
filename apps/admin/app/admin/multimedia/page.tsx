"use client";

import NextImage from "next/image";
import { Image, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminShell, Card, PrimaryButton, SelectInput, TextInput, Toast } from "../_components/admin-shell";

type MediaType = "team_badge" | "player_photo" | "team_photo" | "tournament_logo";
type MediaAsset = { id: string; type: MediaType; url: string; alt?: string; createdAt?: string };

const mediaTypes: { value: MediaType; label: string; folder: string }[] = [
  { value: "team_badge", label: "Escudo", folder: "team-badges" },
  { value: "player_photo", label: "Foto de jugador", folder: "player-photos" },
  { value: "team_photo", label: "Foto de equipo", folder: "team-photos" },
  { value: "tournament_logo", label: "Logo de torneo", folder: "tournament-logos" },
];

export default function AdminMediaPage() {
  const [type, setType] = useState<MediaType>("team_badge");
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {
    try {
      const response = await fetch("/api/media", { cache: "no-store" });
      if (!response.ok) return;
      setAssets(await response.json() as MediaAsset[]);
    } catch {
      setAssets([]);
    }
  }

  async function upload() {
    if (!file) return;
    const form = new FormData();
    form.append("type", type);
    form.append("alt", alt || file.name);
    form.append("file", file);

    setUploading(true);
    setMessage("");
    try {
      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error("upload failed");
      const asset = await response.json() as MediaAsset;
      setAssets((current) => [asset, ...current]);
      setFile(null);
      setAlt("");
      setMessage("Imagen subida a uploads");
    } catch {
      setMessage("No se pudo subir. Verifica que la API este corriendo.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteAsset(asset: MediaAsset) {
    if (!window.confirm(`Eliminar ${asset.alt || "imagen"}?`)) return;
    try {
      const response = await fetch(`/api/media/${asset.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("delete failed");
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setMessage("Imagen eliminada");
    } catch {
      setMessage("No se pudo eliminar en la API.");
    }
  }

  return (
    <AdminShell title="Multimedia" subtitle="Biblioteca">
      <section className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-3.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Biblioteca multimedia</p>
            <h2 className="mt-1.5 text-2xl font-black leading-tight text-slate-950 sm:text-[1.65rem]">Subí, revisá y limpiá archivos</h2>
            <p className="mt-1.5 max-w-2xl text-sm font-bold leading-relaxed text-slate-500">Todo queda en `backend/uploads`; acá solo elegís el tipo, subís el archivo y administrás lo cargado.</p>
          </div>
          <div className="inline-flex w-fit rounded-2xl bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-600 ring-1 ring-slate-200">
            {assets.length} archivos cargados
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-3.5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Subida rápida</p>
            <Image size={18} className="text-slate-300" />
          </div>
          <div className="mt-3 flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-2">
            {file ? (
              <NextImage src={URL.createObjectURL(file)} alt="" width={320} height={144} unoptimized className="h-full w-full rounded-2xl object-contain p-2" />
            ) : (
              <Upload className="text-slate-400" size={28} />
            )}
          </div>
          <div className="mt-4 space-y-3">
            {message ? <Toast message={message} /> : null}
            <SelectInput value={type} onChange={(event) => setType(event.target.value as MediaType)}>
              {mediaTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </SelectInput>
            <TextInput value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Texto alternativo" />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm font-bold text-slate-600 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-slate-950 file:px-4 file:text-sm file:font-black file:text-white"
            />
            <PrimaryButton disabled={!file || uploading} onClick={upload} className="w-full">
              {uploading ? "Subiendo..." : "Subir archivo"}
            </PrimaryButton>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">Archivos cargados</h2>
          </div>
          {assets.length ? (
            <div className="grid gap-3 p-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map((asset) => (
                <article key={asset.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <NextImage src={asset.url} alt={asset.alt ?? ""} width={320} height={144} unoptimized className="h-32 w-full bg-slate-50 object-cover" />
                  <div className="p-3">
                    <p className="truncate text-sm font-black text-slate-950">{asset.alt || "Sin descripcion"}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{labelFor(asset.type)}</p>
                    <p className="mt-2 break-all text-[11px] font-bold text-slate-400">{asset.url}</p>
                    <button
                      type="button"
                      onClick={() => deleteAsset(asset)}
                      className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-100 text-sm font-black text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm font-bold text-slate-500">Todavia no hay imagenes cargadas en la API.</div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}

function labelFor(type: MediaType) {
  return mediaTypes.find((item) => item.value === type)?.label ?? type;
}
