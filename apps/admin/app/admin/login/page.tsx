"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { PrimaryButton, TextInput } from "../_components/admin-shell";

export default function AdminLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.trim().toLowerCase(), password }),
      });
      const payload = await response.json() as { ok?: boolean; message?: string };
      if (payload.ok) {
        router.push("/admin");
        return;
      }
      setError(payload.message || "No se pudo iniciar sesión.");
    } catch {
      setError("No se pudo conectar con la API. Verificá backend, base de datos y credenciales.");
    }
    setLoading(false);
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[560px] items-center px-4 py-8 text-[#102116]">
      <div className="absolute inset-x-4 top-6 h-24 rounded-[32px] bg-emerald-500/10 blur-3xl" aria-hidden />
      <section className="relative w-full rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
              <LockKeyhole size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">BairesStats</p>
              <h1 className="text-[1.7rem] font-black leading-tight">Panel admin</h1>
            </div>
          </div>
          <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
            Acceso seguro
          </span>
        </div>

        <div className="space-y-3">
          <TextInput value={user} onChange={(event) => setUser(event.target.value)} placeholder="Usuario" />
          <TextInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña"
            type="password"
          />
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-black text-red-700">{error}</p> : null}
          <PrimaryButton disabled={!user || !password || loading} onClick={login}>
            {loading ? "Ingresando..." : "Ingresar"}
          </PrimaryButton>
        </div>
      </section>
    </main>
  );
}
