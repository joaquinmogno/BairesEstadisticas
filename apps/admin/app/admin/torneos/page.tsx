"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useState } from "react";
import { Edit3, Plus, Save, Trash2 } from "lucide-react";
import { AdminShell, Card, PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput, Toast } from "../_components/admin-shell";
import { MediaPicker } from "../_components/media-picker";
import { useAdmin, type Tournament } from "../_lib/admin-store";

export default function AdminTournamentsPage() {
  const { tournaments, teams, addTournament, addTeam, standingsByTournament, updateTournament, updateTournamentLogo, deleteTournament } = useAdmin();
  const [showForm, setShowForm] = useState(false);
  const [showPlayoffForm, setShowPlayoffForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [playoffDraft, setPlayoffDraft] = useState({ sourceTournamentId: "", name: "", qualifiers: 4 });
  const [draft, setDraft] = useState({
    name: "",
    category: "Futbol 5",
    season: "2026 Apertura",
    startDate: "",
    rules: "",
    type: "league" as Tournament["type"],
  });
  const sourceTournament = tournaments.find((tournament) => tournament.id === playoffDraft.sourceTournamentId);
  const qualifiedRows = playoffDraft.sourceTournamentId ? standingsByTournament(playoffDraft.sourceTournamentId).slice(0, playoffDraft.qualifiers) : [];

  async function createPlayoffFromStandings() {
    if (!sourceTournament || !qualifiedRows.length) return;
    try {
      setError("");
      const created = await addTournament({
        name: playoffDraft.name.trim() || `Playoff ${sourceTournament.name}`,
        category: sourceTournament.category,
        season: sourceTournament.season,
        startDate: "",
        type: "knockout",
        rules: sourceTournament.rules,
      });
      for (const row of qualifiedRows) {
        const sourceTeam = teams.find((team) => team.id === row.teamId);
        if (!sourceTeam) continue;
        await addTeam({
          tournamentId: created.id,
          clubId: sourceTeam.clubId,
          sourceTeamId: sourceTeam.id,
          name: sourceTeam.name,
          badge: sourceTeam.badge,
          badgeUrl: sourceTeam.badgeUrl,
          photoUrl: sourceTeam.photoUrl,
          colors: sourceTeam.colors,
          category: sourceTeam.category,
        });
      }
      setMessage(`Playoff creado con ${qualifiedRows.length} clasificados.`);
      setShowPlayoffForm(false);
      setPlayoffDraft({ sourceTournamentId: "", name: "", qualifiers: 4 });
    } catch (caught) {
      setMessage("");
      setError(caught instanceof Error ? caught.message : "No se pudo crear el playoff.");
    }
  }

  return (
    <AdminShell title="Torneos" subtitle="Gestion deportiva">
      <section className="rounded-3xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Torneos</p>
            <h2 className="mt-1.5 text-[1.65rem] font-black leading-tight text-slate-950">Alta y edición de competencias</h2>
            <p className="mt-1.5 max-w-2xl text-sm font-bold text-slate-500">Crealos, editarlos y entrar al detalle sin demasiada fricción.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-600 ring-1 ring-slate-200">
            {tournaments.length} cargados
          </div>
        </div>
      </section>
      <div className="space-y-3.5">
        {message ? <Toast message={message} /> : null}
        {error ? <Toast message={error} tone="error" /> : null}
        <PrimaryButton onClick={() => setShowForm((o) => !o)} className="flex w-full items-center justify-center gap-2 sm:w-auto">
          <Plus size={18} /> Nuevo torneo
        </PrimaryButton>
        <SecondaryButton onClick={() => setShowPlayoffForm((value) => !value)} className="flex w-full items-center justify-center gap-2 sm:w-auto">
          Crear playoff desde tabla
        </SecondaryButton>

        {showForm ? (
          <Card className="grid gap-3 p-3.5 md:grid-cols-2">
            <TextInput placeholder="Nombre del torneo" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <TextInput placeholder="Categoria" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
            <TextInput placeholder="Temporada" value={draft.season} onChange={(event) => setDraft({ ...draft, season: event.target.value })} />
            <SelectInput value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as Tournament["type"] })}>
              <option value="league">Liga</option>
              <option value="cup">Copa</option>
              <option value="groups_playoffs">Grupos + Playoffs</option>
              <option value="knockout">Eliminacion directa</option>
            </SelectInput>
            <TextInput type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} />
            <TextArea placeholder="Reglamento" value={draft.rules} onChange={(event) => setDraft({ ...draft, rules: event.target.value })} className="md:col-span-2" />
            <PrimaryButton
              className="md:col-span-2"
              disabled={!draft.name}
              onClick={async () => {
                try {
                  setError("");
                  await addTournament(draft);
                  setDraft({ name: "", category: "Futbol 5", season: "2026 Apertura", startDate: "", rules: "", type: "league" });
                  setShowForm(false);
                  setMessage("Torneo creado");
                } catch (caught) {
                  setMessage("");
                  setError(caught instanceof Error ? caught.message : "No se pudo crear el torneo.");
                }
              }}
            >
              Crear torneo
            </PrimaryButton>
          </Card>
        ) : null}

        {showPlayoffForm ? (
          <Card className="grid gap-3 p-3.5 md:grid-cols-2">
            <SelectInput value={playoffDraft.sourceTournamentId} onChange={(event) => setPlayoffDraft({ ...playoffDraft, sourceTournamentId: event.target.value })}>
              <option value="">Torneo base</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
              ))}
            </SelectInput>
            <TextInput placeholder="Nombre del playoff" value={playoffDraft.name} onChange={(event) => setPlayoffDraft({ ...playoffDraft, name: event.target.value })} />
            <TextInput type="number" min={2} max={32} value={playoffDraft.qualifiers} onChange={(event) => setPlayoffDraft({ ...playoffDraft, qualifiers: Number(event.target.value) || 2 })} />
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
              {sourceTournament ? `${qualifiedRows.length} clasificados desde ${sourceTournament.name}` : "Elegí un torneo con tabla cargada"}
            </div>
            {qualifiedRows.length ? (
              <div className="md:col-span-2 grid gap-2">
                {qualifiedRows.map((row, index) => {
                  const team = teams.find((item) => item.id === row.teamId);
                  return <div key={row.teamId} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-black text-slate-700"><span>{index + 1}° {team?.name}</span><span>{row.pts} pts</span></div>;
                })}
              </div>
            ) : null}
            <PrimaryButton disabled={!sourceTournament || !qualifiedRows.length} onClick={() => void createPlayoffFromStandings()} className="md:col-span-2">
              Crear playoff y copiar planteles
            </PrimaryButton>
          </Card>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {tournaments.length === 0 ? <Card className="p-3.5 text-sm font-black text-slate-500">Sin torneos cargados.</Card> : null}
          {tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              onUpdate={(data) => updateTournament(tournament.id, data)}
              onLogo={(url) => updateTournamentLogo(tournament.id, url)}
              onDelete={() => deleteTournament(tournament.id)}
            />
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

function TournamentCard({
  tournament,
  onUpdate,
  onLogo,
  onDelete,
}: {
  tournament: Tournament;
  onUpdate: (data: Partial<Tournament>) => Promise<void>;
  onLogo: (url: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tournament);
  const [error, setError] = useState("");

  async function save() {
    try {
      setError("");
      await onUpdate(draft);
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el torneo.");
    }
  }

  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/admin/torneos/${tournament.id}`} className="flex min-w-0 flex-1 gap-3">
          {tournament.logo ? <NextImage src={tournament.logo} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-lg object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 font-black text-slate-500">BT</span>}
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-black">{tournament.name}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{tournament.category} · {tournament.season}</p>
          </div>
        </Link>
        <button type="button" onClick={() => setEditing((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600">
          <Edit3 size={16} />
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(`Eliminar ${tournament.name}? Se borrarán fechas, partidos y participaciones de este torneo. Los clubes y jugadores que participen en otros torneos seguirán existiendo.`)) return;
            try {
              setError("");
              await onDelete();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "No se pudo eliminar el torneo.");
            }
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-500"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {editing ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <TextInput value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
          <TextInput value={draft.season} onChange={(event) => setDraft({ ...draft, season: event.target.value })} />
          <SelectInput value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Tournament["status"] })}>
            <option value="scheduled">Programado</option>
            <option value="live">En juego</option>
            <option value="finished">Finalizado</option>
          </SelectInput>
          <SelectInput value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as Tournament["type"] })}>
            <option value="league">Liga</option>
            <option value="cup">Copa</option>
            <option value="groups_playoffs">Grupos + Playoffs</option>
            <option value="knockout">Eliminacion directa</option>
          </SelectInput>
          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Logo del torneo</p>
            <MediaPicker type="tournament_logo" value={draft.logo} onChange={(url) => {
              setDraft({ ...draft, logo: url });
              void onLogo(url).catch((caught) => setError(caught instanceof Error ? caught.message : "No se pudo actualizar el logo."));
            }} />
          </div>
          <TextArea value={draft.rules ?? ""} onChange={(event) => setDraft({ ...draft, rules: event.target.value })} className="md:col-span-2" />
          <PrimaryButton type="button" onClick={save} className="flex items-center justify-center gap-2 md:col-span-2">
            <Save size={16} /> Guardar cambios
          </PrimaryButton>
        </div>
      ) : (
        <p className="mt-4 line-clamp-2 text-sm font-bold text-slate-500">{tournament.rules || "Sin reglamento cargado."}</p>
      )}
      {error ? <div className="mt-3"><Toast message={error} tone="error" /></div> : null}
    </Card>
  );
}
