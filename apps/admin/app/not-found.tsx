import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 text-slate-950">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">BairesStats Admin</p>
        <h1 className="mt-3 text-2xl font-black">Pantalla no encontrada</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">
          La ruta que intentaste abrir no existe o ya no esta disponible.
        </p>
        <Link
          href="/admin"
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white"
        >
          Volver al panel
        </Link>
      </section>
    </main>
  );
}
