"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserPlus, MapPin } from "lucide-react";
import { AdminShell, Card, PrimaryButton, SecondaryButton, SelectInput, TextInput } from "../_components/admin-shell";
import { useAdmin, type Tournament } from "../_lib/admin-store";

type AdminRole = "superuser" | "organizer";
type PermissionModule = "tournaments" | "teams" | "players" | "matchdays" | "matches" | "media" | "users";

type Venue = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  notes?: string;
  isActive: boolean;
};

type AdminPermission = {
  id?: string;
  module: PermissionModule;
  tournamentId?: string;
  tournamentName?: string;
  venueId?: string;
  venueName?: string;
  canRead: boolean;
  canWrite: boolean;
};

type AdminUser = {
  id: string;
  email: string;
  name?: string;
  role: AdminRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt: string;
  permissions: AdminPermission[];
};

const modules: Array<{ id: PermissionModule; label: string }> = [
  { id: "tournaments", label: "Torneos" },
  { id: "teams", label: "Equipos" },
  { id: "players", label: "Jugadores" },
  { id: "matchdays", label: "Fechas" },
  { id: "matches", label: "Partidos" },
  { id: "media", label: "Multimedia" },
];

export default function UsersPage() {
  const { tournaments } = useAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    password: "",
    role: "organizer" as AdminRole,
    tournamentId: "",
    venueId: "",
    modules: ["tournaments", "teams", "players", "matchdays", "matches"] as PermissionModule[],
  });
  const [venueDraft, setVenueDraft] = useState({ name: "", city: "", address: "" });

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [usersPayload, venuesPayload] = await Promise.all([
        api<AdminUser[]>("/admin-users"),
        api<Venue[]>("/venues"),
      ]);
      setUsers(usersPayload);
      setVenues(venuesPayload);
      setMessage("");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "No pudimos cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    const permissions = draft.role === "superuser"
      ? []
      : draft.modules.map((module) => ({
        module,
        tournamentId: draft.tournamentId || undefined,
        venueId: draft.venueId || undefined,
        canRead: true,
        canWrite: true,
      }));

    try {
      await api("/admin-users", {
        method: "POST",
        body: JSON.stringify({
          email: draft.email,
          name: draft.name,
          password: draft.password,
          role: draft.role,
          mustChangePassword: true,
          permissions,
        }),
      });
      setDraft({ name: "", email: "", password: "", role: "organizer", tournamentId: "", venueId: "", modules: draft.modules });
      await refresh();
      setMessage("Usuario creado correctamente.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "No pudimos crear el usuario.");
    }
  }

  async function createVenue() {
    try {
      await api("/venues", {
        method: "POST",
        body: JSON.stringify(venueDraft),
      });
      setVenueDraft({ name: "", city: "", address: "" });
      await refresh();
      setMessage("Sede creada correctamente.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "No pudimos crear la sede.");
    }
  }

  return (
    <AdminShell title="Usuarios internos" subtitle="Accesos">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-3">
          {message ? <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">{message}</div> : null}
          {loading ? <Card className="p-4 text-sm font-black text-slate-500">Cargando usuarios...</Card> : null}
          {users.map((user) => (
            <UserCard key={user.id} user={user} tournaments={tournaments} venues={venues} onRefresh={refresh} />
          ))}
          {!loading && !users.length ? <Card className="p-4 text-sm font-black text-slate-500">Todavia no hay usuarios internos.</Card> : null}
        </section>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-emerald-700" />
              <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Crear acceso</h2>
            </div>
            <div className="mt-4 space-y-3">
              <TextInput placeholder="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              <TextInput placeholder="Email" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              <TextInput placeholder="Password temporal" type="password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} />
              <SelectInput value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as AdminRole })}>
                <option value="organizer">Organizador</option>
                <option value="superuser">Superusuario</option>
              </SelectInput>
              {draft.role === "organizer" ? (
                <>
                  <SelectInput value={draft.tournamentId} onChange={(event) => setDraft({ ...draft, tournamentId: event.target.value })}>
                    <option value="">Todos los torneos asignados por modulo</option>
                    {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}
                  </SelectInput>
                  <SelectInput value={draft.venueId} onChange={(event) => setDraft({ ...draft, venueId: event.target.value })}>
                    <option value="">Todas las sedes</option>
                    {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
                  </SelectInput>
                  <ModulePicker value={draft.modules} onChange={(value) => setDraft({ ...draft, modules: value })} />
                </>
              ) : null}
              <PrimaryButton disabled={!draft.email || draft.password.length < 8} onClick={() => void createUser()} className="w-full">
                Crear usuario
              </PrimaryButton>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-emerald-700" />
              <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Sedes</h2>
            </div>
            <div className="mt-4 space-y-3">
              <TextInput placeholder="Nombre de sede" value={venueDraft.name} onChange={(event) => setVenueDraft({ ...venueDraft, name: event.target.value })} />
              <TextInput placeholder="Ciudad" value={venueDraft.city} onChange={(event) => setVenueDraft({ ...venueDraft, city: event.target.value })} />
              <TextInput placeholder="Direccion" value={venueDraft.address} onChange={(event) => setVenueDraft({ ...venueDraft, address: event.target.value })} />
              <SecondaryButton disabled={!venueDraft.name.trim()} onClick={() => void createVenue()} className="w-full">
                Crear sede
              </SecondaryButton>
              <div className="space-y-2">
                {venues.map((venue) => (
                  <div key={venue.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-sm font-black">{venue.name}</p>
                    <p className="text-xs font-bold text-slate-500">{[venue.city, venue.address].filter(Boolean).join(" · ") || "Sin detalle"}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}

function UserCard({ user, onRefresh }: { user: AdminUser; tournaments: Tournament[]; venues: Venue[]; onRefresh: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const scopeLabel = useMemo(() => {
    if (user.role === "superuser") return "Acceso total";
    if (!user.permissions.length) return "Sin permisos asignados";
    return user.permissions
      .map((permission) => [moduleLabel(permission.module), permission.tournamentName, permission.venueName].filter(Boolean).join(" · "))
      .join(" / ");
  }, [user.permissions, user.role]);

  async function toggleActive() {
    setSaving(true);
    try {
      await api(`/admin-users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className={user.role === "superuser" ? "text-emerald-700" : "text-slate-500"} />
            <h2 className="truncate text-base font-black">{user.name || user.email}</h2>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-500">{user.email}</p>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">{user.role === "superuser" ? "Superusuario" : "Organizador"}</p>
          <p className="mt-2 text-sm font-bold text-slate-600">{scopeLabel}</p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void toggleActive()}
          className={`h-10 rounded-lg px-3 text-sm font-black ${user.isActive ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}
        >
          {user.isActive ? "Activo" : "Inactivo"}
        </button>
      </div>
    </Card>
  );
}

function ModulePicker({ value, onChange }: { value: PermissionModule[]; onChange: (value: PermissionModule[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {modules.map((module) => {
        const active = value.includes(module.id);
        return (
          <button
            key={module.id}
            type="button"
            onClick={() => onChange(active ? value.filter((item) => item !== module.id) : [...value, module.id])}
            className={`min-h-10 rounded-lg border px-2 text-xs font-black ${active ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}
          >
            {module.label}
          </button>
        );
      })}
    </div>
  );
}

function moduleLabel(module: PermissionModule) {
  return modules.find((item) => item.id === module)?.label ?? module;
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(". ") : payload?.message;
    throw new Error(message || `La API respondio ${response.status}.`);
  }
  return response.json() as Promise<T>;
}
