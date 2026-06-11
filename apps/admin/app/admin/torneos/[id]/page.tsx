"use client";

import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Award, Camera, ChevronDown, ChevronUp, ClipboardList, Edit3, FileUp, Plus, Save, ShieldAlert, Star, Trash2, Upload, UserPlus, X } from "lucide-react";
import clsx from "clsx";
import {
  AdminShell,
  Badge,
  formatDateDisplay,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  StatusChip,
  TabBar,
  TextArea,
  TextInput,
  Toast,
  todayInputValue,
} from "../../_components/admin-shell";
import { MediaPicker } from "../../_components/media-picker";
import { useAdmin, type EventType, type Match, type MatchEvent, type Player, type Team } from "../../_lib/admin-store";

const eventEmoji: Record<EventType, string> = { goal: "G", assist: "A", yellow: "AM", red: "R", mvp: "MVP" };

type DraftEvent = MatchEvent & { isDraft?: boolean };
type Tab = "resumen" | "equipos" | "fechas" | "partidos";

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getTournament } = useAdmin();
  const tournament = getTournament(params.id);

  const [tab, setTab] = useState<Tab>("resumen");
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const urlTab = searchParams.get("tab") as Tab;
      if (urlTab && ["resumen", "equipos", "fechas", "partidos"].includes(urlTab)) {
        setTab(urlTab);
      }
      const matchId = searchParams.get("match");
      if (matchId) {
        setTab("partidos");
        setEditingMatchId(matchId);
      }
    }
  }, []);

  if (!tournament) {
    return (
      <AdminShell title="Torneo" onBack={() => router.push("/admin/torneos")}>
        <div className="rounded-xl bg-white p-4 font-black ring-1 ring-slate-200">Torneo no encontrado</div>
      </AdminShell>
    );
  }

  if (editingMatchId) {
    return <MatchEditor matchId={editingMatchId} onClose={() => setEditingMatchId(null)} />;
  }

  return (
    <AdminShell title={tournament.name} subtitle="BairesStats Admin" onBack={() => router.push("/admin/torneos")}>
      <TabBar
        tabs={[
          { key: "resumen", label: "Resumen" },
          { key: "equipos", label: "Equipos" },
          { key: "fechas", label: "Fechas" },
          { key: "partidos", label: "Partidos" },
        ]}
        active={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {tab === "resumen" && <ResumenTab tournamentId={tournament.id} onNavigate={setTab} onEdit={setEditingMatchId} />}
      {tab === "equipos" && <EquiposTab tournamentId={tournament.id} />}
      {tab === "fechas" && <FechasTab tournamentId={tournament.id} />}
      {tab === "partidos" && <PartidosTab tournamentId={tournament.id} onEdit={setEditingMatchId} />}
    </AdminShell>
  );
}

function ResumenTab({ tournamentId, onNavigate, onEdit }: { tournamentId: string; onNavigate: (tab: Tab) => void; onEdit: (id: string) => void }) {
  const {
    teamsByTournament,
    playersByTeam,
    matchdaysByTournament,
    matchesByMatchday,
    matches,
    getTournament,
    getTeam,
  } = useAdmin();
  const tournament = getTournament(tournamentId);
  const teams = teamsByTournament(tournamentId);
  const matchdays = matchdaysByTournament(tournamentId);
  const tournamentMatches = matches.filter((match) => match.tournamentId === tournamentId);
  const teamsWithoutBadge = teams.filter((team) => !team.badgeUrl);
  const players = teams.flatMap((team) => playersByTeam(team.id));
  const playersWithoutPhoto = players.filter((player) => !player.photoUrl);
  const matchdaysWithoutMatches = matchdays.filter((matchday) => !matchesByMatchday(matchday.id).length);
  const draftMatches = tournamentMatches.filter((match) => match.publicationStatus !== "published");
  const pendingMatches = tournamentMatches.filter((match) => match.status !== "final");

  return (
    <div className="space-y-3">
      <section className="rounded-3xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Centro operativo del torneo</p>
            <h2 className="mt-1.5 text-[1.65rem] font-black leading-tight text-slate-950">{tournament?.name}</h2>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <SecondaryButton onClick={() => onNavigate("equipos")} className="!h-11 !w-full !rounded-2xl sm:!w-auto">Equipos</SecondaryButton>
            <SecondaryButton onClick={() => onNavigate("fechas")} className="!h-11 !w-full !rounded-2xl sm:!w-auto">Fechas</SecondaryButton>
            <SecondaryButton onClick={() => onNavigate("partidos")} className="!h-11 !w-full !rounded-2xl sm:!w-auto">Partidos</SecondaryButton>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Alertas</p>
                <h3 className="mt-1 text-base font-black text-slate-950">Lo que pide atención</h3>
              </div>
              <StatusChip label={`${draftMatches.length + teamsWithoutBadge.length + playersWithoutPhoto.length + matchdaysWithoutMatches.length}`} tone={draftMatches.length || teamsWithoutBadge.length || playersWithoutPhoto.length || matchdaysWithoutMatches.length ? "warning" : "success"} />
            </div>
            <div className="mt-3 grid gap-2">
              <CompactAlertRow label="Partidos en borrador" value={draftMatches.length} tone={draftMatches.length ? "warning" : "success"} />
              <CompactAlertRow label="Equipos sin escudo" value={teamsWithoutBadge.length} tone={teamsWithoutBadge.length ? "warning" : "success"} />
              <CompactAlertRow label="Jugadores sin foto" value={playersWithoutPhoto.length} tone={playersWithoutPhoto.length ? "warning" : "success"} />
              <CompactAlertRow label="Fechas vacías" value={matchdaysWithoutMatches.length} tone={matchdaysWithoutMatches.length ? "warning" : "success"} />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Próximos partidos</p>
              </div>
              <StatusChip label={`${pendingMatches.length}`} tone={pendingMatches.length ? "warning" : "success"} />
            </div>
            <div className="mt-3 grid gap-2">
              {pendingMatches
                .slice()
                .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
                .slice(0, 4)
                .map((match) => (
                  <button key={match.id} type="button" onClick={() => onEdit(match.id)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left active:bg-slate-50">
                    <p className="text-sm font-black text-slate-950">{getTeam(match.homeTeamId)?.name ?? "Local"} vs {getTeam(match.awayTeamId)?.name ?? "Visitante"}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{match.matchdayName ?? "Sin fecha"} · {formatDateDisplay(match.date)} · {match.time} · {match.court}</p>
                  </button>
                ))}
              {!pendingMatches.length ? <p className="text-sm font-bold text-slate-500">No hay partidos próximos para mostrar.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EquiposTab({ tournamentId }: { tournamentId: string }) {
  const { tournaments, teams: allTeams, teamsByTournament, playersByTeam, addTeam, addPlayer, deleteTeam, deletePlayer, updateTeam, updateTeamMedia, updatePlayer } = useAdmin();
  const teams = teamsByTournament(tournamentId);
  const teamLookup = useMemo(() => new Map(teams.map((team) => [normalizeLookupValue(team.name), team])), [teams]);
  const existingClubOptions = useMemo(() => {
    const currentClubIds = new Set(teams.map((team) => team.clubId).filter(Boolean));
    const seen = new Set<string>();
    return allTeams.filter((team) => {
      const key = team.clubId ?? team.id;
      if (currentClubIds.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allTeams, teams]);

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedExistingTeamId, setSelectedExistingTeamId] = useState("");
  const [copyExistingRoster, setCopyExistingRoster] = useState(true);
  const [selectedRosterPlayerIds, setSelectedRosterPlayerIds] = useState<string[]>([]);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [name, setName] = useState("");
  const [badgeUrl, setBadgeUrl] = useState("");
  const [teamsCsv, setTeamsCsv] = useState("equipo,escudo_url,colores,categoria");
  const [rosterCsv, setRosterCsv] = useState("equipo,jugador,apellido,numero,posicion,nacimiento,foto_url");
  const [msg, setMsg] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBadgeUrl, setEditBadgeUrl] = useState("");
  const rosterFileRef = useRef<HTMLInputElement | null>(null);
  const selectedExistingTeam = existingClubOptions.find((team) => team.id === selectedExistingTeamId);
  const selectedExistingRoster = selectedExistingTeam ? playersByTeam(selectedExistingTeam.id) : [];
  const selectedExistingParticipations = selectedExistingTeam?.clubId
    ? allTeams.filter((team) => team.clubId === selectedExistingTeam.clubId)
    : selectedExistingTeam ? [selectedExistingTeam] : [];

  async function importTeams() {
    const rows = parseCsvBlock(teamsCsv);
    if (!rows.length) {
      setMsg("Pegá un CSV de equipos antes de importar.");
      return;
    }

    try {
      let imported = 0;
      for (const row of rows) {
        const [teamName, importedBadgeUrl, colors, category] = row;
        if (!teamName || normalizeLookupValue(teamName) === "equipo") continue;
        await addTeam({
          tournamentId,
          name: teamName,
          badge: teamInitials(teamName),
          badgeUrl: importedBadgeUrl || undefined,
          colors: colors || undefined,
          category: category || undefined,
        });
        imported += 1;
      }
      setMsg(`Importaste ${imported} equipos.`);
    } catch (caught) {
      setMsg(caught instanceof Error ? caught.message : "No se pudo importar el CSV de equipos.");
    }
  }

  function startEditTeam(team: Team) {
    setEditingTeamId(team.id);
    setEditName(team.name);
    setEditBadgeUrl(team.badgeUrl ?? "");
  }

  async function saveEditTeam() {
    if (!editingTeamId || !editName.trim()) return;
    try {
      await updateTeam(editingTeamId, { name: editName.trim() });
      if (editBadgeUrl) {
        await updateTeamMedia(editingTeamId, { badgeUrl: editBadgeUrl });
      }
      setMsg("Equipo actualizado.");
      setEditingTeamId(null);
    } catch (caught) {
      setMsg(caught instanceof Error ? caught.message : "No se pudo actualizar el equipo.");
    }
  }

  async function importRosterFile(file?: File | null) {
    if (!file) return;
    try {
      const content = await file.text();
      const rows = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split(/[;,]/).map((cell) => cell.trim().replace(/^"|"$/g, "")));
      if (!rows.length) {
        setMsg("El archivo esta vacío.");
        return;
      }
      let imported = 0;
      for (const row of rows) {
        const [teamName, playerName, lastName, number, position, birthDate, photoUrl] = row;
        if (!teamName || !playerName || normalizeLookupValue(teamName) === "equipo") continue;
        const team = teamLookup.get(normalizeLookupValue(teamName));
        if (!team) {
          throw new Error(`No encontramos el equipo "${teamName}" dentro del torneo.`);
        }
        await addPlayer({
          teamId: team.id,
          name: playerName,
          lastName: lastName || undefined,
          number: number ? Number(number) : undefined,
          position: normalizePlayerPosition(position),
          birthDate: parseDateInput(birthDate),
          photoUrl: photoUrl || undefined,
        });
        imported += 1;
      }
      setMsg(`Importaste ${imported} jugadores desde archivo.`);
    } catch (caught) {
      setMsg(caught instanceof Error ? caught.message : "No se pudo importar el archivo.");
    }
    if (rosterFileRef.current) rosterFileRef.current.value = "";
  }

  async function importRoster() {
    const rows = parseCsvBlock(rosterCsv);
    if (!rows.length) {
      setMsg("Pegá un CSV de plantel antes de importar.");
      return;
    }

    try {
      let imported = 0;
      for (const row of rows) {
        const [teamName, playerName, lastName, number, position, birthDate, photoUrl] = row;
        if (!teamName || !playerName || normalizeLookupValue(teamName) === "equipo") continue;
        const team = teamLookup.get(normalizeLookupValue(teamName));
        if (!team) {
          throw new Error(`No encontramos el equipo "${teamName}" dentro del torneo.`);
        }
        await addPlayer({
          teamId: team.id,
          name: playerName,
          lastName: lastName || undefined,
          number: number ? Number(number) : undefined,
          position: normalizePlayerPosition(position),
          birthDate: parseDateInput(birthDate),
          photoUrl: photoUrl || undefined,
        });
        imported += 1;
      }
      setMsg(`Importaste ${imported} jugadores.`);
    } catch (caught) {
      setMsg(caught instanceof Error ? caught.message : "No se pudo importar el plantel.");
    }
  }

  return (
    <div className="space-y-4">
      {msg ? <Toast message={msg} tone={msg.includes("No se pudo") || msg.includes("No encontramos") || msg.includes("Pegá") ? "error" : "success"} /> : null}
      {teamToDelete ? (
        <ConfirmParticipationDeleteModal
          team={teamToDelete}
          rosterCount={playersByTeam(teamToDelete.id).length}
          deleting={deletingTeam}
          onCancel={() => setTeamToDelete(null)}
          onConfirm={async () => {
            try {
              setDeletingTeam(true);
              await deleteTeam(teamToDelete.id);
              setMsg(`Participación de ${teamToDelete.name} eliminada.`);
              setTeamToDelete(null);
            } catch (caught) {
              setMsg(caught instanceof Error ? caught.message : "No se pudo eliminar el equipo.");
            } finally {
              setDeletingTeam(false);
            }
          }}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={() => setShowForm((value) => !value)} className="flex items-center justify-center gap-2">
          <Plus size={18} /> {showForm ? "Cerrar carga" : "Agregar equipo"}
        </PrimaryButton>
        <SecondaryButton onClick={() => setShowImport((value) => !value)} className="!h-12 !rounded-lg">
          <Upload size={16} className="mr-2 inline" />
          {showImport ? "Cerrar" : "Importar CSV"}
        </SecondaryButton>
        <SecondaryButton onClick={() => rosterFileRef.current?.click()} className="!h-12 !rounded-lg">
          <FileUp size={16} className="mr-2 inline" />
          Cargar archivo de jugadores
        </SecondaryButton>
        <input ref={rosterFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void importRosterFile(event.target.files?.[0])} />
      </div>


      {showForm ? (
        <section className="grid gap-4 rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
          {existingClubOptions.length ? (
            <div>
              <FormLabel>Club existente</FormLabel>
              <button
                type="button"
                onClick={() => {
                  setSelectedExistingTeamId("");
                  setSelectedRosterPlayerIds([]);
                  setName("");
                  setBadgeUrl("");
                }}
                className={`mb-2 flex min-h-12 w-full items-center rounded-xl border px-3 text-left text-sm font-black ${!selectedExistingTeamId ? "border-emerald-600 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-600"}`}
              >
                Crear club nuevo
              </button>
              <div className="grid gap-2 sm:grid-cols-2">
                {existingClubOptions.map((team) => {
                  const participations = team.clubId ? allTeams.filter((item) => item.clubId === team.clubId) : [team];
                  const roster = playersByTeam(team.id);
                  const selected = selectedExistingTeamId === team.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => {
                        setSelectedExistingTeamId(team.id);
                        setName(team.name);
                        setBadgeUrl(team.badgeUrl ?? "");
                        setSelectedRosterPlayerIds(roster.map((player) => player.id));
                      }}
                      className={`flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <TeamAvatar team={team} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-slate-950">{team.name}</span>
                        <span className="mt-1 block truncate text-xs font-bold text-slate-500">
                          {participations.map((item) => tournaments.find((tournament) => tournament.id === item.tournamentId)?.name).filter(Boolean).join(" · ") || "Sin torneos"}
                        </span>
                        <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                          {roster.length} jugadores
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedExistingTeamId ? (
                <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-black text-slate-700">
                    <span>Usar mismo plantel en este torneo</span>
                    <input
                      type="checkbox"
                      checked={copyExistingRoster}
                      onChange={(event) => {
                        setCopyExistingRoster(event.target.checked);
                        setSelectedRosterPlayerIds(event.target.checked ? selectedExistingRoster.map((player) => player.id) : []);
                      }}
                      className="h-5 w-5 accent-emerald-700"
                    />
                  </label>
                  {copyExistingRoster ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Se copiarán {selectedRosterPlayerIds.length} de {selectedExistingRoster.length} jugadores
                        {selectedExistingParticipations[0] ? ` desde ${tournaments.find((tournament) => tournament.id === selectedExistingParticipations[0].tournamentId)?.name ?? "otra competición"}` : ""}
                      </p>
                      <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {selectedExistingRoster.map((player) => {
                          const checked = selectedRosterPlayerIds.includes(player.id);
                          return (
                            <label key={player.id} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-black ${checked ? "border-emerald-200 bg-white text-slate-950" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  setSelectedRosterPlayerIds((current) => event.target.checked ? [...current, player.id] : current.filter((id) => id !== player.id));
                                }}
                                className="h-5 w-5 accent-emerald-700"
                              />
                              <span className="min-w-0">
                                <span className="block truncate">{player.name}</span>
                                <span className="block truncate text-xs text-slate-500">{player.number ? `#${player.number} · ` : ""}{normalizePlayerPosition(player.position)}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <div>
            <FormLabel>Nombre del equipo</FormLabel>
            <TextInput placeholder="Ej: Villa Luro FC" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <FormLabel>Escudo</FormLabel>
            <MediaPicker type="team_badge" value={badgeUrl} compact onChange={setBadgeUrl} />
          </div>
          <PrimaryButton
            disabled={!name}
            onClick={async () => {
              try {
                const selected = existingClubOptions.find((team) => team.id === selectedExistingTeamId);
                await addTeam({
                  tournamentId,
                  clubId: selected?.clubId,
                  sourceTeamId: selected && copyExistingRoster ? selected.id : undefined,
                  sourcePlayerIds: selected && copyExistingRoster ? selectedRosterPlayerIds : undefined,
                  name,
                  badge: teamInitials(name),
                  badgeUrl: badgeUrl || selected?.badgeUrl,
                  photoUrl: selected?.photoUrl,
                  colors: selected?.colors,
                  category: selected?.category,
                });
                setName("");
                setBadgeUrl("");
                setSelectedExistingTeamId("");
                setCopyExistingRoster(true);
                setSelectedRosterPlayerIds([]);
                setShowForm(false);
                setMsg("Equipo creado.");
              } catch (caught) {
                setMsg(caught instanceof Error ? caught.message : "No se pudo crear el equipo.");
              }
            }}
            className="w-full"
          >
            Guardar equipo
          </PrimaryButton>
        </section>
      ) : null}

      {showImport ? (
        <section className="grid gap-3 xl:grid-cols-2">
          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Carga de equipos</p>
            <p className="mt-1 text-sm font-bold text-slate-500">Formato: <span className="font-black">equipo, escudo_url, colores, categoria</span></p>
            <TextArea value={teamsCsv} onChange={(event) => setTeamsCsv(event.target.value)} className="mt-3 min-h-36" />
            <PrimaryButton onClick={() => void importTeams()} className="mt-3 w-full">
              Importar equipos
            </PrimaryButton>
          </div>
          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Carga de planteles</p>
            <p className="mt-1 text-sm font-bold text-slate-500">Formato: <span className="font-black">equipo, jugador, apellido, numero, posicion, nacimiento, foto_url</span></p>
            <TextArea value={rosterCsv} onChange={(event) => setRosterCsv(event.target.value)} className="mt-3 min-h-36" />
            <PrimaryButton onClick={() => void importRoster()} className="mt-3 w-full">
              Importar jugadores
            </PrimaryButton>
          </div>
        </section>
      ) : null}

      {teams.length === 0 && !showForm && !showImport ? <CompactEmpty label="Sin equipos en este torneo." action="Crear equipo" onClick={() => setShowForm(true)} /> : null}

      {teams.map((team) => {
        const isOpen = expandedTeam === team.id;
        const isEditing = editingTeamId === team.id;
        const roster = playersByTeam(team.id);
        return (
          <div key={team.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex w-full items-center gap-3 p-3.5">
              <button onClick={() => setExpandedTeam(isOpen ? null : team.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:bg-slate-50">
                <TeamAvatar team={team} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-black">{team.name}</span>
                  <span className="mt-0.5 block text-xs font-black uppercase tracking-[0.08em] text-slate-400">{roster.length} jugadores</span>
                </span>
              </button>
              {!team.badgeUrl ? <StatusChip label="Sin escudo" tone="warning" /> : null}
              <span
                role="button"
                tabIndex={0}
                onClick={() => startEditTeam(team)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") startEditTeam(team); }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 active:bg-slate-50"
              >
                <Edit3 size={17} />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={() => setTeamToDelete(team)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  setTeamToDelete(team);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-500 active:bg-red-50"
              >
                <Trash2 size={17} />
              </span>
              <button onClick={() => setExpandedTeam(isOpen ? null : team.id)}>
                {isOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>
            </div>
            {isEditing ? (
              <div className="border-t border-slate-100 px-3.5 pb-3.5 pt-3">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Editar equipo</p>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <FormLabel>Nombre del equipo</FormLabel>
                    <TextInput value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="Nombre del equipo" />
                  </div>
                  <div>
                    <FormLabel>Escudo</FormLabel>
                    <MediaPicker type="team_badge" value={editBadgeUrl} compact onChange={setEditBadgeUrl} />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <PrimaryButton disabled={!editName.trim()} onClick={() => void saveEditTeam()} className="flex items-center justify-center gap-2">
                    <Save size={16} /> Guardar
                  </PrimaryButton>
                  <SecondaryButton onClick={() => setEditingTeamId(null)} className="!h-12 !rounded-lg">Cancelar</SecondaryButton>
                </div>
              </div>
            ) : null}
            {isOpen ? (
              <TeamPlayersPanel teamId={team.id} players={roster} addPlayer={addPlayer} deletePlayer={deletePlayer} updatePlayer={updatePlayer} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ConfirmParticipationDeleteModal({
  team,
  rosterCount,
  deleting,
  onCancel,
  onConfirm,
}: {
  team: Team;
  rosterCount: number;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/50 p-3 sm:items-center sm:justify-center">
      <section className="w-full rounded-[28px] bg-white p-4 shadow-2xl ring-1 ring-slate-200 sm:max-w-md">
        <div className="flex items-start gap-3">
          <TeamAvatar team={team} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-500">Eliminar participación</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{team.name}</h3>
            <p className="mt-2 text-sm font-bold leading-relaxed text-slate-500">
              Se eliminará la participación de este equipo en este torneo, junto con sus partidos de esta competición.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          <p>El club seguirá existiendo si participa en otros torneos.</p>
          <p>Los jugadores no se borran si están en otro plantel.</p>
          <p>{rosterCount} jugadores asociados a esta participación.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <SecondaryButton disabled={deleting} onClick={onCancel} className="!h-12 !rounded-2xl">
            Cancelar
          </SecondaryButton>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void onConfirm()}
            className="min-h-12 rounded-2xl bg-red-600 px-4 text-sm font-black text-white disabled:opacity-60"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </section>
    </div>
  );
}

function EditPlayerInlineForm({
  player,
  onCancel,
  onSave,
}: {
  player: Player;
  onCancel: () => void;
  onSave: (data: Partial<Player>) => Promise<void>;
}) {
  const [name, setName] = useState(player.name || "");
  const [number, setNumber] = useState(player.number ? String(player.number) : "");
  const [position, setPosition] = useState(normalizePlayerPosition(player.position));
  const [birthDate, setBirthDate] = useState(player.birthDate || "");
  const [photoUrl, setPhotoUrl] = useState(player.photoUrl || "");

  return (
    <div className="grid gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50 w-full">
      <div>
        <FormLabel>Foto del jugador</FormLabel>
        <MediaPicker type="player_photo" value={photoUrl} compact onChange={setPhotoUrl} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
        <div>
          <FormLabel>Nombre y apellido</FormLabel>
          <TextInput placeholder="Nombre y apellido" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <FormLabel>Dorsal</FormLabel>
          <TextInput placeholder="10" type="number" value={number} onChange={(event) => setNumber(event.target.value)} />
        </div>
      </div>
      <div>
        <FormLabel>Posición</FormLabel>
        <SelectInput value={position} onChange={(event) => setPosition(event.target.value)}>
          <option value="Jugador">Jugador</option>
          <option value="Arquero">Arquero</option>
        </SelectInput>
      </div>
      <div>
        <FormLabel>Fecha de nacimiento</FormLabel>
        <TextInput type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
      </div>
      <div className="flex gap-2">
        <button
          disabled={!name.trim()}
          onClick={() => void onSave({
            name,
            number: number ? Number(number) : undefined,
            position: normalizePlayerPosition(position),
            birthDate: birthDate || undefined,
            photoUrl: photoUrl || undefined,
          })}
          className="flex-1 min-h-10 rounded-lg bg-emerald-700 text-xs font-black text-white disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="flex-1 min-h-10 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function TeamPlayersPanel({
  teamId,
  players,
  addPlayer,
  deletePlayer,
  updatePlayer,
}: {
  teamId: string;
  players: Player[];
  addPlayer: (data: { name: string; teamId: string; lastName?: string; number?: number; position?: string; birthDate?: string; photoUrl?: string }) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<void>;
  updatePlayer: (playerId: string, data: Partial<Player>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [position, setPosition] = useState("Jugador");
  const [birthDate, setBirthDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  return (
    <div className="border-t border-slate-100 px-3.5 pb-3.5 pt-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase text-slate-500">{players.length} jugadores</p>
        <div className="flex gap-2">
          <button onClick={() => { setShowAdd((value) => !value); setShowBulk(false); }} className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-black text-emerald-700 active:bg-emerald-50">
            <UserPlus size={17} /> {showAdd ? "Cerrar" : "Agregar jugador"}
          </button>
          <button onClick={() => { setShowBulk((value) => !value); setShowAdd(false); }} className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-black text-emerald-700 active:bg-emerald-50">
            <ClipboardList size={17} /> {showBulk ? "Cerrar" : "Carga rápida"}
          </button>
        </div>
      </div>

      {showBulk ? (
        <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <FormLabel>Carga rápida de plantel</FormLabel>
            <p className="text-xs font-bold text-slate-500 mb-2">
              Ingresá un jugador por línea.<br />
              Formato: <span className="font-black">nombre y apellido, dorsal, fecha nacimiento</span> o <span className="font-black">nombre y apellido, dorsal, posición, fecha nacimiento</span>.
            </p>
            <TextArea
              placeholder="Ejemplo:&#10;Juan Pérez, 10, 12-04-1995&#10;Carlos Gómez, 5, Arquero, 23-11-1998&#10;Martín Rodríguez, , 23-11-1998"
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              className="min-h-[160px]"
            />
          </div>
          <button
            disabled={!bulkText.trim()}
            onClick={async () => {
              try {
                const lines = bulkText.split("\n").map(line => line.trim()).filter(Boolean);
                let imported = 0;
                for (const line of lines) {
                  const parts = line.split(",").map(part => part.trim());
                  const pName = parts[0];
                  if (!pName) continue;
                  
                  const pNum = parts[1] ? Number(parts[1]) : undefined;
                  const pPosition = parts.length >= 4 ? parts[2] : undefined;
                  const pBirth = parts.length >= 4 ? parts[3] : parts[2];
                  
                  await addPlayer({
                    name: pName,
                    teamId,
                    number: pNum && !isNaN(pNum) ? pNum : undefined,
                    position: normalizePlayerPosition(pPosition),
                    birthDate: parseDateInput(pBirth),
                  });
                  imported++;
                }
                setBulkText("");
                setShowBulk(false);
                window.alert(`Se cargaron ${imported} jugadores con éxito.`);
              } catch (caught) {
                window.alert(caught instanceof Error ? caught.message : "No se pudo cargar los jugadores.");
              }
            }}
            className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50"
          >
            Cargar plantel
          </button>
        </div>
      ) : null}

      {showAdd ? (
        <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <FormLabel>Foto</FormLabel>
            <MediaPicker type="player_photo" value={photoUrl} compact onChange={setPhotoUrl} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
            <div>
              <FormLabel>Nombre</FormLabel>
              <TextInput placeholder="Nombre y apellido" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <FormLabel>Numero</FormLabel>
              <TextInput placeholder="10" type="number" value={number} onChange={(event) => setNumber(event.target.value)} />
            </div>
          </div>
          <div>
            <FormLabel>Posición</FormLabel>
            <SelectInput value={position} onChange={(event) => setPosition(event.target.value)}>
              <option value="Jugador">Jugador</option>
              <option value="Arquero">Arquero</option>
            </SelectInput>
          </div>
          <div>
            <FormLabel>Fecha de nacimiento</FormLabel>
            <TextInput type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
          </div>
          <button
            disabled={!name}
            onClick={async () => {
              try {
                await addPlayer({
                  name,
                  teamId,
                  number: number ? Number(number) : undefined,
                  position: normalizePlayerPosition(position),
                  birthDate: parseDateInput(birthDate),
                  photoUrl: photoUrl || undefined,
                });
                setName("");
                setNumber("");
                setPosition("Jugador");
                setBirthDate("");
                setPhotoUrl("");
              } catch (caught) {
                window.alert(caught instanceof Error ? caught.message : "No se pudo crear el jugador.");
              }
            }}
            className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50"
          >
            Guardar jugador
          </button>
        </div>
      ) : null}

      {players.length ? players.map((player) => {
        const isEditing = editingPlayerId === player.id;
        return (
          <div key={player.id} className="mt-2 first:mt-0">
            {isEditing ? (
              <EditPlayerInlineForm
                player={player}
                onCancel={() => setEditingPlayerId(null)}
                onSave={async (updatedData) => {
                  try {
                    await updatePlayer(player.id, updatedData);
                    setEditingPlayerId(null);
                  } catch (caught) {
                    window.alert(caught instanceof Error ? caught.message : "No se pudo actualizar el jugador.");
                  }
                }}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-2 py-2 text-sm font-bold text-slate-700">
                <AvatarImage src={player.photoUrl} label={teamInitials(player.name)} size="sm" rounded="full" />
                <span className="min-w-0 flex-1 truncate">{player.name}</span>
                {!player.photoUrl ? <StatusChip label="Sin foto" tone="warning" /> : null}
                <span className={clsx("rounded-md px-2 py-1 text-xs font-black", normalizePlayerPosition(player.position) === "Arquero" ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-800")}>
                  {normalizePlayerPosition(player.position)}
                </span>
                {player.number ? <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">#{player.number}</span> : null}
                {player.birthDate ? <span className="hidden text-xs font-black text-slate-400 sm:inline">{formatDateDisplay(player.birthDate)}</span> : null}
                <button
                  type="button"
                  onClick={() => setEditingPlayerId(player.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 active:bg-slate-50"
                  title="Editar jugador"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Eliminar ${player.name}?`)) return;
                    void deletePlayer(player.id).catch((caught) => window.alert(caught instanceof Error ? caught.message : "No se pudo eliminar el jugador."));
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 active:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        );
      }) : !showAdd && !showBulk ? (
        <div className="flex flex-col gap-2">
          <CompactEmpty label="Sin plantel cargado." action="Agregar jugador" onClick={() => setShowAdd(true)} />
          <button onClick={() => setShowBulk(true)} className="text-center text-xs font-black text-emerald-700 underline">
            O usar carga rápida
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FechasTab({ tournamentId }: { tournamentId: string }) {
  const { matchdaysByTournament, matchesByMatchday, addMatchday, deleteMatchday } = useAdmin();
  const matchdays = matchdaysByTournament(tournamentId);

  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [name, setName] = useState("");
  const [bulkNames, setBulkNames] = useState("Fecha 1\nFecha 2\nFecha 3");
  const [msg, setMsg] = useState("");

  async function createBulkMatchdays() {
    const rows = bulkNames
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (!rows.length) {
      setMsg("Escribí al menos una fecha antes de crear el bloque.");
      return;
    }
    try {
      for (const item of rows) {
        await addMatchday({ tournamentId, name: item });
      }
      setMsg(`Creaste ${rows.length} fechas.`);
    } catch (caught) {
      setMsg(caught instanceof Error ? caught.message : "No se pudo crear el bloque de fechas.");
    }
  }

  return (
    <div className="space-y-3">
      {msg ? <Toast message={msg} tone={msg.includes("No se pudo") || msg.includes("Escribí") ? "error" : "success"} /> : null}

      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={() => setShowForm((value) => !value)} className="flex items-center justify-center gap-2">
          <Plus size={18} /> {showForm ? "Cerrar" : "Crear fecha"}
        </PrimaryButton>
        <SecondaryButton onClick={() => setShowBulk((value) => !value)} className="!h-12 !rounded-lg">
          <Upload size={16} className="mr-2 inline" />
          {showBulk ? "Cerrar" : "Carga en bloque"}
        </SecondaryButton>
      </div>

      {showForm ? (
        <section className="space-y-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <TextInput placeholder="Nombre (ej: Fecha 1)" value={name} onChange={(event) => setName(event.target.value)} />
          <PrimaryButton
            disabled={!name}
            onClick={async () => {
              try {
                await addMatchday({ tournamentId, name });
                setName("");
                setShowForm(false);
                setMsg("Fecha creada.");
              } catch (caught) {
                setMsg(caught instanceof Error ? caught.message : "No se pudo crear la fecha.");
              }
            }}
          >
            Crear fecha
          </PrimaryButton>
        </section>
      ) : null}

      {showBulk ? (
        <section className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Carga masiva</p>
          <p className="mt-1 text-sm font-bold text-slate-500">Escribí una fecha por línea para crear la estructura del torneo en segundos.</p>
          <TextArea value={bulkNames} onChange={(event) => setBulkNames(event.target.value)} className="mt-3 min-h-40" />
          <PrimaryButton onClick={() => void createBulkMatchdays()} className="mt-3 w-full">
            Crear bloque de fechas
          </PrimaryButton>
        </section>
      ) : null}

      {matchdays.length === 0 && !showForm && !showBulk ? (
        <CompactEmpty label="Sin fechas cargadas." action="Crear varias" onClick={() => setShowBulk(true)} />
      ) : null}

      {matchdays.map((matchday) => (
        <article key={matchday.id} className="flex items-center gap-3 rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-black">{matchday.name}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{matchesByMatchday(matchday.id).length} partidos</p>
          </div>
          {!matchesByMatchday(matchday.id).length ? <StatusChip label="Sin partidos" tone="warning" /> : null}
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`Eliminar ${matchday.name}? También se borrarán sus partidos.`)) return;
              void deleteMatchday(matchday.id).catch((caught) => window.alert(caught instanceof Error ? caught.message : "No se pudo eliminar la fecha."));
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-500 active:bg-red-50"
          >
            <Trash2 size={17} />
          </button>
        </article>
      ))}
    </div>
  );
}

function PartidosTab({ tournamentId, onEdit }: { tournamentId: string; onEdit: (id: string) => void }) {
  const { matchdaysByTournament, matchesByMatchday, teamsByTournament, playersByTeam, getTeam, getMatchScore, addMatch, deleteMatch } = useAdmin();
  const matchdays = matchdaysByTournament(tournamentId);
  const teams = teamsByTournament(tournamentId);
  const teamLookup = useMemo(() => new Map(teams.map((team) => [normalizeLookupValue(team.name), team])), [teams]);

  const [selectedMatchday, setSelectedMatchday] = useState(matchdays[0]?.id ?? "");
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [homeId, setHomeId] = useState("");
  const [awayId, setAwayId] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [day, setDay] = useState(new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long" }).format(new Date()));
  const [time, setTime] = useState("20:00");
  const [court, setCourt] = useState("Cancha 1");
  const [bulkRows, setBulkRows] = useState("local,visitante,fecha,hora,cancha,dia");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!matchdays.length) {
      setSelectedMatchday("");
      return;
    }
    if (!selectedMatchday || !matchdays.some((item) => item.id === selectedMatchday)) {
      setSelectedMatchday(matchdays[0].id);
    }
  }, [matchdays, selectedMatchday]);

  const dayMatches = useMemo(() => matchesByMatchday(selectedMatchday), [matchesByMatchday, selectedMatchday]);
  const orderedMatches = useMemo(() => {
    const rank: Record<string, number> = { live: 0, pending: 1, suspended: 2, final: 3 };
    return [...dayMatches].sort((a, b) => {
      const byStatus = (rank[a.status] ?? 99) - (rank[b.status] ?? 99);
      if (byStatus !== 0) return byStatus;
      return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
    });
  }, [dayMatches]);
  const pendingCount = useMemo(() => orderedMatches.filter((match) => match.status !== "final").length, [orderedMatches]);
  const activeMatches = useMemo(() => orderedMatches.filter((match) => match.status !== "final"), [orderedMatches]);
  const finishedMatches = useMemo(() => orderedMatches.filter((match) => match.status === "final"), [orderedMatches]);
  const canCreate = homeId && awayId && homeId !== awayId && selectedMatchday && time && date;

  async function importFixtureBlock() {
    if (!selectedMatchday) {
      setMsg("Elegí primero una fecha del torneo para importar el bloque de partidos.");
      return;
    }

    const rows = parseCsvBlock(bulkRows);
    if (!rows.length) {
      setMsg("Pegá un CSV de fixture antes de importar.");
      return;
    }

    try {
      let imported = 0;
      for (const row of rows) {
        const [homeName, awayName, rowDate, rowTime, rowCourt, rowDay] = row;
        if (!homeName || !awayName || normalizeLookupValue(homeName) === "local") continue;
        const homeTeam = teamLookup.get(normalizeLookupValue(homeName));
        const awayTeam = teamLookup.get(normalizeLookupValue(awayName));
        if (!homeTeam || !awayTeam) throw new Error(`No encontramos ambos equipos para la fila "${homeName} vs ${awayName}".`);
        if (!rowDate || !rowTime) throw new Error(`La fila "${homeName} vs ${awayName}" está incompleta: faltan fecha u horario.`);
        const parsedDate = parseDateInput(rowDate);
        if (!parsedDate) throw new Error(`La fecha "${rowDate}" no tiene un formato válido.`);
        await addMatch({
          tournamentId,
          matchdayId: selectedMatchday,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          date: parsedDate,
          time: rowTime,
          court: rowCourt || "Cancha 1",
          day: rowDay || dayNameFromDate(parsedDate),
        });
        imported += 1;
      }
      setMsg(`Importaste ${imported} partidos en bloque.`);
    } catch (caught) {
      setMsg(caught instanceof Error ? caught.message : "No se pudo importar el fixture.");
    }
  }

  return (
    <div className="space-y-3">
      {msg ? <Toast message={msg} tone={msg.includes("No se pudo") || msg.includes("Elegí") || msg.includes("incompleta") || msg.includes("No encontramos") || msg.includes("Pegá") ? "error" : "success"} /> : null}

      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Pendientes o en juego</p>
            <p className="mt-1 text-xl font-black tabular-nums text-slate-950">{pendingCount}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Equipos sin plantel</p>
            <p className="mt-1 text-xl font-black tabular-nums text-slate-950">{teams.filter((team) => playersByTeam(team.id).length === 0).length}</p>
          </div>
        </div>
      </section>

      {matchdays.length ? (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {matchdays.map((matchday) => (
              <button
                key={matchday.id}
                onClick={() => setSelectedMatchday(matchday.id)}
                className={clsx(
                  "shrink-0 rounded-lg px-4 py-2 text-sm font-black transition-colors",
                  selectedMatchday === matchday.id ? "bg-emerald-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200",
                )}
              >
                {matchday.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={() => setShowForm((value) => !value)} className="flex items-center justify-center gap-2">
              <Plus size={18} /> {showForm ? "Cerrar" : "Nuevo partido"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setShowBulk((value) => !value)} className="!h-12 !rounded-lg">
              <Upload size={16} className="mr-2 inline" />
              {showBulk ? "Cerrar" : "Carga en bloque"}
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <CompactEmpty label="Creá fechas para programar partidos." />
      )}

      {showForm ? (
        <section className="space-y-3 rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Equipos</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectInput value={homeId} onChange={(event) => setHomeId(event.target.value)}>
              <option value="">Local</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </SelectInput>
            <SelectInput value={awayId} onChange={(event) => setAwayId(event.target.value)}>
              <option value="">Visitante</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </SelectInput>
          </div>
          {homeId && awayId && homeId === awayId ? (
            <p className="text-sm font-bold text-red-500">Los equipos deben ser distintos.</p>
          ) : null}

          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Fecha y horario</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TextInput type="date" value={date} onChange={(event) => {
              const value = event.target.value;
              setDate(value);
              setDay(dayNameFromDate(value));
            }} />
            <SelectInput value={day} onChange={(event) => setDay(event.target.value)}>
              <option value="lunes">Lunes</option>
              <option value="martes">Martes</option>
              <option value="miércoles">Miércoles</option>
              <option value="jueves">Jueves</option>
              <option value="viernes">Viernes</option>
              <option value="sábado">Sábado</option>
              <option value="domingo">Domingo</option>
            </SelectInput>
            <TextInput type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            <TextInput placeholder="Cancha" value={court} onChange={(event) => setCourt(event.target.value)} />
          </div>

          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Fecha del torneo</p>
          <SelectInput value={selectedMatchday} onChange={(event) => setSelectedMatchday(event.target.value)}>
            {matchdays.map((matchday) => (
              <option key={matchday.id} value={matchday.id}>{matchday.name}</option>
            ))}
          </SelectInput>

          <PrimaryButton
            disabled={!canCreate}
            onClick={async () => {
              try {
                await addMatch({ tournamentId, matchdayId: selectedMatchday, date, day, time, homeTeamId: homeId, awayTeamId: awayId, court });
                setHomeId("");
                setAwayId("");
                setTime("20:00");
                setShowForm(false);
                setMsg("Partido creado.");
              } catch (caught) {
                setMsg(caught instanceof Error ? caught.message : "No se pudo crear el partido.");
              }
            }}
            className="w-full"
          >
            Guardar partido
          </PrimaryButton>
        </section>
      ) : null}

      {showBulk ? (
        <section className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Importar fixture</p>
          <p className="mt-1 text-sm font-bold text-slate-500">Formato: <span className="font-black">local, visitante, fecha, hora, cancha, dia</span>. Se importa dentro de la fecha seleccionada.</p>
          <TextArea value={bulkRows} onChange={(event) => setBulkRows(event.target.value)} className="mt-3 min-h-40" />
          <PrimaryButton onClick={() => void importFixtureBlock()} className="mt-3 w-full">
            Programar bloque
          </PrimaryButton>
        </section>
      ) : null}

      {renderAdminMatchSection({ title: "Pendientes y en juego", matches: activeMatches, getTeam, getMatchScore, playersByTeam, onEdit, deleteMatch })}
      {finishedMatches.length ? renderAdminMatchSection({ title: "Finalizados", matches: finishedMatches, getTeam, getMatchScore, playersByTeam, onEdit, deleteMatch }) : null}

      {dayMatches.length === 0 && matchdays.length > 0 ? (
        <CompactEmpty label="Sin partidos en esta fecha." action="Carga en bloque" onClick={() => setShowBulk(true)} />
      ) : null}
    </div>
  );
}

function renderAdminMatchSection({
  title,
  matches,
  getTeam,
  getMatchScore,
  playersByTeam,
  onEdit,
  deleteMatch,
}: {
  title: string;
  matches: Match[];
  getTeam: (id: string) => Team | undefined;
  getMatchScore: (match: Match) => { home: number; away: number };
  playersByTeam: (teamId: string) => Player[];
  onEdit: (id: string) => void;
  deleteMatch: (matchId: string) => Promise<void>;
}) {
  if (!matches.length) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">{title}</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{matches.length}</span>
      </div>
      {matches.map((match) => {
        const home = getTeam(match.homeTeamId);
        const away = getTeam(match.awayTeamId);
        const score = getMatchScore(match);
        const scoreText = match.status === "pending" ? "vs" : `${score.home} - ${score.away}`;
        const statusLabel = match.status === "pending" ? "Pendiente" : match.status === "live" ? "En juego" : match.status === "suspended" ? "Suspendido" : "Final";
        const publicationLabel = match.publicationStatus === "published" ? "Publicado" : match.status === "final" ? "Finalizado sin publicar" : "Borrador";
        const dayLabel = match.day ? `${match.day.charAt(0).toUpperCase() + match.day.slice(1)} · ` : "";
        const rosterIncomplete = playersByTeam(match.homeTeamId).length === 0 || playersByTeam(match.awayTeamId).length === 0;

        return (
          <div key={match.id} className="grid grid-cols-[minmax(0,1fr)_44px] overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <button onClick={() => onEdit(match.id)} className="block w-full text-left active:bg-slate-50">
              <div className="grid grid-cols-[56px_1fr_52px_1fr] items-center gap-2 px-3 py-2.5">
                <span className={clsx(
                  "rounded-md px-2 py-2 text-center text-[11px] font-black",
                  match.status === "live" ? "bg-green-100 text-green-800" : match.status === "final" ? "bg-slate-100 text-slate-600" : match.status === "suspended" ? "bg-orange-100 text-orange-700" : "bg-amber-50 text-amber-700",
                )}>
                  {match.status === "pending" ? match.time : statusLabel}
                </span>
                <div className="flex min-w-0 items-center justify-end gap-2">
                  <span className="truncate text-right text-sm font-black">{home?.name}</span>
                  {home ? <TeamBadgeInline team={home} /> : null}
                </div>
                <span className="text-center text-lg font-black">{scoreText}</span>
                <div className="flex min-w-0 items-center gap-2">
                  {away ? <TeamBadgeInline team={away} /> : null}
                  <span className="truncate text-sm font-black">{away?.name}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-3 pb-2.5 text-xs font-bold text-slate-400">
                <span>{dayLabel}{formatDateDisplay(match.date)} · {match.court}</span>
                <span className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]",
                  match.status === "final" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700",
                )}>
                  {statusLabel}
                </span>
                <span className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]",
                  match.publicationStatus === "published" ? "bg-sky-100 text-sky-700" : "bg-amber-50 text-amber-700",
                )}>
                  {publicationLabel}
                </span>
                {rosterIncomplete ? <StatusChip label="Sin planteles completos" tone="warning" /> : null}
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("Eliminar partido?")) return;
                void deleteMatch(match.id).catch((caught) => window.alert(caught instanceof Error ? caught.message : "No se pudo eliminar el partido."));
              }}
              className="flex items-center justify-center border-l border-slate-100 text-red-500 active:bg-red-50"
            >
              <Trash2 size={17} />
            </button>
          </div>
        );
      })}
    </section>
  );
}

function MatchEditor({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const { matches, getTeam, getPlayer, playersByTeam, addMatchEvent, removeMatchEvent, removeMatchPlay, publishMatch, updateMatchStatus } = useAdmin();
  const match = matches.find((item) => item.id === matchId);
  const home = match ? getTeam(match.homeTeamId) : undefined;
  const away = match ? getTeam(match.awayTeamId) : undefined;
  const [draftEvents, setDraftEvents] = useState<DraftEvent[]>(match?.events ?? []);
  const [sheetType, setSheetType] = useState<EventType | null>(null);
  const [summaryMode, setSummaryMode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [includeAssist, setIncludeAssist] = useState(true);
  const [assistPlayerId, setAssistPlayerId] = useState("");

  const homePlayers = useMemo(() => (match ? playersByTeam(match.homeTeamId) : []), [match, playersByTeam]);
  const awayPlayers = useMemo(() => (match ? playersByTeam(match.awayTeamId) : []), [match, playersByTeam]);
  const playerOptionsByTeam = useMemo(
    () => ({
      [home?.id ?? ""]: homePlayers,
      [away?.id ?? ""]: awayPlayers,
    }),
    [away?.id, awayPlayers, home?.id, homePlayers],
  );
  const selectedPlayers = teamId ? playerOptionsByTeam[teamId] ?? [] : [];

  useEffect(() => {
    setDraftEvents(match?.events ?? []);
  }, [match?.events]);

  useEffect(() => {
    if (!sheetType) return;
    setPlayerId("");
    setAssistPlayerId("");
    setIncludeAssist(sheetType === "goal");
    setTeamId(match?.homeTeamId ?? "");
  }, [match?.homeTeamId, sheetType]);

  const score = useMemo(() => {
    if (!match) return { home: 0, away: 0 };
    return computeDraftScore(draftEvents, match.homeTeamId, match.awayTeamId);
  }, [draftEvents, match]);

  const mvpPlayers = useMemo(() => {
    if (!match) return [];
    return draftEvents
      .filter((event) => event.type === "mvp")
      .map((event) => getPlayer(event.playerId)?.name)
      .filter((value): value is string => Boolean(value));
  }, [draftEvents, getPlayer, match]);
  const summaryGroups = useMemo(() => ({
    goals: draftEvents.filter((event) => event.type === "goal"),
    assists: draftEvents.filter((event) => event.type === "assist"),
    yellows: draftEvents.filter((event) => event.type === "yellow"),
    reds: draftEvents.filter((event) => event.type === "red"),
    mvps: draftEvents.filter((event) => event.type === "mvp"),
  }), [draftEvents]);
  const publishWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (homePlayers.length === 0) warnings.push(`${home?.name ?? "El local"} no tiene plantel cargado.`);
    if (awayPlayers.length === 0) warnings.push(`${away?.name ?? "El visitante"} no tiene plantel cargado.`);
    if (draftEvents.length === 0) warnings.push("No podés publicar una planilla vacía.");
    return warnings;
  }, [away?.name, awayPlayers.length, draftEvents.length, home?.name, homePlayers.length]);
  const canPublish = publishWarnings.length === 0;

  if (!match || !home || !away) {
    return (
      <AdminShell title="Partido" onBack={onClose}>
        <div className="rounded-xl bg-white p-4 font-black ring-1 ring-slate-200">Partido no encontrado</div>
      </AdminShell>
    );
  }

  const currentMatch = match;
  const statusLabel = match.status === "pending" ? "Pendiente" : match.status === "live" ? "En juego" : match.status === "suspended" ? "Suspendido" : "Finalizado";
  const publicationLabel = match.publicationStatus === "published" ? "Publicado" : match.status === "final" ? "Finalizado sin publicar" : "Borrador";
  const unsavedChanges = !areDraftEventsEqual(match.events, draftEvents);

  function openAction(type: EventType) {
    setSummaryMode(false);
    setSheetType(type);
  }

  function closeSheet() {
    setSheetType(null);
  }

  function undoLastEvent() {
    setDraftEvents((current) => current.slice(0, -1));
  }

  function addDraftEvent(type: EventType, selectedTeamId: string, selectedPlayerId: string) {
    setDraftEvents((current) => {
      const next = type === "mvp" ? current.filter((event) => event.type !== "mvp") : current;
      return [...next, createDraftEvent(currentMatch.id, selectedPlayerId, selectedTeamId, type)];
    });
  }

  function submitSheet(keepOpen = false) {
    if (!sheetType || !teamId || !playerId) return;

    if (sheetType === "goal") {
      setDraftEvents((current) => {
        const playId = createPlayId();
        const next = [...current, createDraftEvent(currentMatch.id, playerId, teamId, "goal", playId)];
        if (includeAssist && assistPlayerId) {
          next.push(createDraftEvent(currentMatch.id, assistPlayerId, teamId, "assist", playId));
        }
        return next;
      });
      if (keepOpen) {
        setPlayerId("");
        setAssistPlayerId("");
        setIncludeAssist(true);
      } else {
        closeSheet();
      }
      return;
    }

    addDraftEvent(sheetType, teamId, playerId);
    if (!keepOpen) closeSheet();
  }

  async function publishDraft() {
    if (!canPublish) {
      window.alert(publishWarnings.join(" "));
      return;
    }

    try {
      setSaving(true);
      const persistedIds = new Set(currentMatch.events.map((event) => event.id));
      const draftPersistedIds = new Set(draftEvents.filter((event) => persistedIds.has(event.id)).map((event) => event.id));

      for (const event of currentMatch.events) {
        if (!draftPersistedIds.has(event.id)) {
          if (event.playId) await removeMatchPlay(currentMatch.id, event.playId);
          else await removeMatchEvent(currentMatch.id, event.id);
        }
      }

      for (const event of draftEvents) {
        if (!persistedIds.has(event.id)) {
          await addMatchEvent(currentMatch.id, event.playerId, event.teamId, event.type, event.minute, event.playId);
        }
      }

      await publishMatch(currentMatch.id);
      setMessage("Partido publicado.");
      setSummaryMode(false);
      setTimeout(onClose, 700);
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : "No se pudo publicar el partido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Planilla digital" subtitle={`${home.name} vs ${away.name}`} onBack={onClose}>
      <div className="space-y-4 pb-28">
        {message ? <Toast message={message} /> : null}

      <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#052e16_0%,#047857_52%,#0f766e_100%)] text-white shadow-xl">
          <div className="border-b border-white/10 px-4 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100/80">Partido</p>
                <p className="mt-1 text-sm font-bold text-white/90">{formatDateDisplay(match.date)} · {match.time} · {match.court}</p>
              </div>
              <span className={clsx(
                "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]",
                match.status === "final" && "bg-white/15 text-white",
                match.status === "live" && "bg-lime-300 text-emerald-950",
                match.status === "pending" && "bg-amber-300 text-amber-950",
                match.status === "suspended" && "bg-orange-300 text-orange-950",
              )}>
                {statusLabel}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <span className={clsx(
                "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]",
                match.publicationStatus === "published" ? "bg-sky-200 text-sky-950" : "bg-white/15 text-white",
              )}>
                {publicationLabel}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/80">
                {unsavedChanges ? "Cambios sin publicar" : "Planilla al día"}
              </span>
              <span className={clsx(
                "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]",
                canPublish ? "bg-emerald-100 text-emerald-950" : "bg-amber-200 text-amber-950",
              )}>
                {canPublish ? "Lista para cierre" : "Requiere revisión"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
            <TeamMiniPanel team={home} align="right" />
            <div className="rounded-[24px] bg-white/10 px-4 py-3 text-center shadow-inner backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Resultado final</p>
              <p className="mt-1.5 text-[2.1rem] font-black tabular-nums leading-none">{score.home} - {score.away}</p>
            </div>
            <TeamMiniPanel team={away} align="left" />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-4 py-3 sm:grid-cols-5">
            <div className="col-span-2 rounded-2xl bg-white/10 px-3 py-2 sm:col-span-5">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">MVP</p>
              <p className="mt-1 text-sm font-black text-white">{mvpPlayers[0] ?? "Sin definir"}</p>
            </div>
          </div>
        </section>

        {!canPublish ? <CompactWarning label={publishWarnings.join(" ")} /> : null}

        <section className="rounded-3xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Carga rápida</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Elegí una acción</h2>
            </div>
            <ClipboardList className="text-slate-300" size={20} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ActionTile type="goal" label="Gol" helper="Suma al marcador" onClick={() => openAction("goal")} />
            <ActionTile type="assist" label="Asistencia" helper="Pase gol" onClick={() => openAction("assist")} />
            <ActionTile type="yellow" label="Amarilla" helper="Tarjeta" onClick={() => openAction("yellow")} />
            <ActionTile type="red" label="Roja" helper="Expulsión" onClick={() => openAction("red")} />
          </div>
        </section>

        {!summaryMode ? (
          <>
            <section className="rounded-3xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Timeline</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Jugadas del partido</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{draftEvents.length}</span>
              </div>
              <div className="space-y-2.5">
                {draftEvents.map((event) => {
                  const player = getPlayer(event.playerId);
                  const team = getTeam(event.teamId);
                  return (
                    <div key={event.id} className="grid grid-cols-[1fr_auto] gap-2.5">
                      <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                        <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black", actionTone(event.type))}>
                          {eventEmoji[event.type]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950">{actionLabel(event.type)}</p>
                          <p className="truncate text-sm font-bold text-slate-500">{formatPlayerDisplay(player, team)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setDraftEvents((current) => current.filter((item) => event.playId ? item.playId !== event.playId : item.id !== event.id))}
                        className="flex h-10 w-10 items-center justify-center self-center rounded-2xl text-slate-400 active:bg-red-50 active:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
                {draftEvents.length === 0 ? <p className="text-sm font-bold text-slate-500">Todavía no cargaste eventos.</p> : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Control de partido</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">Seguí la carga y publicalo al final</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">Los cambios de estado solo ordenan el partido en cancha. El cierre real se hace desde el resumen final.</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                {match.status === "pending" ? (
                  <SecondaryButton onClick={() => void updateMatchStatus(match.id, "live").catch((caught) => window.alert(caught instanceof Error ? caught.message : "No se pudo iniciar el partido."))} className="!h-12 !rounded-2xl !border-green-200 !bg-white !text-green-800">
                    Iniciar partido
                  </SecondaryButton>
                ) : null}
                {match.status !== "suspended" && match.status !== "final" ? (
                  <SecondaryButton onClick={() => void updateMatchStatus(match.id, "suspended").catch((caught) => window.alert(caught instanceof Error ? caught.message : "No se pudo suspender el partido."))} className="!h-12 !rounded-2xl !border-orange-200 !bg-white !text-orange-800">
                    Suspender
                  </SecondaryButton>
                ) : null}
                {match.status === "suspended" ? (
                  <SecondaryButton onClick={() => void updateMatchStatus(match.id, "live").catch((caught) => window.alert(caught instanceof Error ? caught.message : "No se pudo reanudar el partido."))} className="!h-12 !rounded-2xl !border-green-200 !bg-white !text-green-800">
                    Reanudar
                  </SecondaryButton>
                ) : null}
                <PrimaryButton onClick={() => setSummaryMode(true)} className="!min-h-12 !rounded-2xl sm:col-span-2">
                  Revisar y publicar planilla
                </PrimaryButton>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-3xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Revisión previa</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Resumen del partido</h2>
            {!canPublish ? <div className="mt-3"><CompactWarning label={publishWarnings.join(" ")} /></div> : null}
            <div className="mt-3 grid gap-3">
              <SummaryBlock title="Resultado" empty={false}>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <SummaryTeamBadge team={home} score={score.home} align="left" />
                  <div className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-white">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/60">Resultado</p>
                    <p className="mt-1 text-3xl font-black tabular-nums leading-none">{score.home} - {score.away}</p>
                  </div>
                  <SummaryTeamBadge team={away} score={score.away} align="right" />
                </div>
              </SummaryBlock>
              <SummaryBlock title="Goles" empty={summaryGroups.goals.length === 0}>
                {summaryGroups.goals.map((event) => renderSummaryItem(event, getPlayer, getTeam))}
              </SummaryBlock>
              <SummaryBlock title="Asistencias" empty={summaryGroups.assists.length === 0}>
                {summaryGroups.assists.map((event) => renderSummaryItem(event, getPlayer, getTeam))}
              </SummaryBlock>
              <SummaryBlock title="Amarillas" empty={summaryGroups.yellows.length === 0}>
                {summaryGroups.yellows.map((event) => renderSummaryItem(event, getPlayer, getTeam))}
              </SummaryBlock>
              <SummaryBlock title="Rojas" empty={summaryGroups.reds.length === 0}>
                {summaryGroups.reds.map((event) => renderSummaryItem(event, getPlayer, getTeam))}
              </SummaryBlock>
              <SummaryBlock title="Elegir MVP" empty={false}>
                <div className="grid gap-3">
                  {[home, away].map((team) => {
                    const roster = playersByTeam(team.id);
                    return (
                      <div key={team.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="mb-3 flex items-center gap-2">
                          <TeamBadgeInline team={team} />
                          <p className="text-sm font-black text-slate-950">{team.name}</p>
                          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{roster.length} jugadores</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {roster.map((player) => {
                            const isSelected = summaryGroups.mvps.some((event) => event.playerId === player.id);
                            return (
                              <button
                                key={player.id}
                                type="button"
                                onClick={() => addDraftEvent("mvp", team.id, player.id)}
                                className={clsx(
                                  "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition",
                                  isSelected ? "border-amber-300 bg-amber-50 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-700",
                                )}
                              >
                                <AvatarImage src={player.photoUrl} label={teamInitials(player.name)} size="sm" rounded="full" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-black text-slate-950">{player.name}</p>
                                  <p className="truncate text-xs font-bold text-slate-500">{player.number ? `#${player.number} · ` : ""}{normalizePlayerPosition(player.position)}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SummaryBlock>
              <SummaryBlock title="MVP" empty={summaryGroups.mvps.length === 0}>
                {summaryGroups.mvps.map((event) => renderSummaryItem(event, getPlayer, getTeam))}
              </SummaryBlock>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <SecondaryButton onClick={() => setSummaryMode(false)} className="!h-12 !rounded-2xl">
                Editar
              </SecondaryButton>
              <PrimaryButton disabled={saving || (!unsavedChanges && match.status === "final") || !canPublish} onClick={() => void publishDraft()} className="!min-h-12 !rounded-2xl">
                {saving ? "Publicando..." : "Confirmar y publicar"}
              </PrimaryButton>
            </div>
          </section>
        )}

        {sheetType ? (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-950/50 p-3" onClick={closeSheet}>
            <div
              className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200" />
              <div className="flex-1 overflow-y-auto px-3.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] [touch-action:pan-y]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Nueva acción</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-950">{actionLabel(sheetType)}</h3>
                  </div>
                  <button onClick={closeSheet} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-3.5 space-y-3.5">
                <div>
                  <FormLabel>Equipo</FormLabel>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[home, away].map((team) => (
                      <button
                        key={team.id}
                        onClick={() => setTeamId(team.id)}
                        className={clsx(
                          "flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-black transition",
                          teamId === team.id ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700",
                        )}
                      >
                        <TeamBadgeInline team={team} />
                        <span className="min-w-0">
                          <span className="block break-words leading-tight">{team.name}</span>
                          <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{team.id === home.id ? "Local" : "Visitante"}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <FormLabel>{sheetType === "assist" ? "Jugador que asistió" : sheetType === "mvp" ? "Jugador MVP" : "Jugador"}</FormLabel>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <TeamBadgeInline team={teamId === away.id ? away : home} />
                      <p className="text-sm font-black text-slate-950">{(teamId === away.id ? away : home).name}</p>
                      <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{selectedPlayers.length} jugadores</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedPlayers.map((player) => {
                        const selected = playerId === player.id;
                        return (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => {
                              setTeamId(teamId);
                              setPlayerId(player.id);
                            }}
                            className={clsx(
                              "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition",
                              selected ? "border-emerald-500 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-700",
                            )}
                          >
                            <AvatarImage src={player.photoUrl} label={teamInitials(player.name)} size="sm" rounded="full" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-slate-950">{player.name}</p>
                              <p className="truncate text-xs font-bold text-slate-500">{player.number ? `#${player.number} · ` : ""}{normalizePlayerPosition(player.position)}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {sheetType === "goal" ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <label className="flex items-center justify-between gap-3">
                      <span>
                        <span className="block text-sm font-black text-slate-950">Tuvo asistencia</span>
                        <span className="block text-xs font-bold text-slate-500">Si la hubo, se carga junto con el gol.</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIncludeAssist((value) => !value)}
                        className={clsx("relative h-8 w-14 rounded-full transition", includeAssist ? "bg-emerald-600" : "bg-slate-300")}
                      >
                        <span className={clsx("absolute top-1 h-6 w-6 rounded-full bg-white shadow transition", includeAssist ? "left-7" : "left-1")} />
                      </button>
                    </label>
                    {includeAssist ? (
                      <div className="mt-3">
                        <FormLabel>Jugador que asistió</FormLabel>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <TeamBadgeInline team={teamId === away.id ? away : home} />
                            <p className="text-sm font-black text-slate-950">{(teamId === away.id ? away : home).name}</p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {selectedPlayers.filter((player) => player.id !== playerId).map((player) => {
                              const selected = assistPlayerId === player.id;
                              return (
                                <button
                                  key={player.id}
                                  type="button"
                                  onClick={() => setAssistPlayerId(player.id)}
                                  className={clsx(
                                    "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition",
                                    selected ? "border-emerald-500 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-slate-50 text-slate-700",
                                  )}
                                >
                                  <AvatarImage src={player.photoUrl} label={teamInitials(player.name)} size="sm" rounded="full" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black text-slate-950">{player.name}</p>
                                    <p className="truncate text-xs font-bold text-slate-500">{player.number ? `#${player.number} · ` : ""}{normalizePlayerPosition(player.position)}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className={clsx("grid gap-3", sheetType === "goal" ? "grid-cols-2" : "grid-cols-1")}>
                  {sheetType === "goal" ? (
                    <SecondaryButton
                      disabled={!teamId || !playerId || (sheetType === "goal" && includeAssist && !assistPlayerId)}
                      onClick={() => submitSheet(true)}
                      className="!h-14 !rounded-2xl"
                    >
                      Agregar y seguir
                    </SecondaryButton>
                  ) : null}
                  <PrimaryButton
                    disabled={!teamId || !playerId || (sheetType === "goal" && includeAssist && !assistPlayerId)}
                    onClick={() => submitSheet(false)}
                    className="w-full !min-h-14 !rounded-2xl"
                  >
                    Agregar {actionLabel(sheetType).toLowerCase()}
                  </PrimaryButton>
                </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!summaryMode ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-3">
              <SecondaryButton disabled={draftEvents.length === 0} onClick={undoLastEvent} className="!h-12 !rounded-2xl">
                Deshacer último
              </SecondaryButton>
              <PrimaryButton onClick={() => setSummaryMode(true)} className="!min-h-12 !flex-1 !rounded-2xl">
                Cerrar planilla y revisar
              </PrimaryButton>
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

function TeamAvatar({ team }: { team: Team }) {
  return <AvatarImage src={team.badgeUrl} label={team.badge || teamInitials(team.name)} size="lg" rounded="lg" />;
}

function AvatarImage({ src, label, size, rounded }: { src?: string; label: string; size: "sm" | "lg"; rounded: "full" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const px = size === "lg" ? 56 : 40;
  const className = clsx(
    "relative shrink-0 overflow-hidden border border-slate-200 bg-slate-50",
    size === "lg" ? "h-14 w-14" : "h-10 w-10",
    rounded === "full" ? "rounded-full" : "rounded-lg",
  );

  if (src && !failed) {
    return (
      <span className={className}>
        <NextImage src={src} alt="" width={px} height={px} unoptimized onError={() => setFailed(true)} className="h-full w-full object-contain p-1" />
      </span>
    );
  }

  return (
    <span className={clsx(className, "flex items-center justify-center text-xs font-black text-slate-500")}>
      {label || <Camera size={18} />}
    </span>
  );
}

function TeamBadgeInline({ team }: { team: { badge: string; badgeUrl?: string } }) {
  if (team.badgeUrl) {
    return <NextImage src={team.badgeUrl} alt="" width={40} height={40} unoptimized className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  }
  return <Badge label={team.badge} />;
}

function TeamMiniPanel({ team, align }: { team: Team; align: "left" | "right" }) {
  return (
    <div className={clsx("min-w-0", align === "right" ? "text-right" : "text-left")}>
      <div className={clsx("flex items-center gap-2", align === "right" ? "justify-end" : "justify-start")}>
        {align === "left" ? <TeamBadgeInline team={team} /> : null}
        <p className="max-w-[150px] whitespace-normal break-words text-sm font-black leading-tight sm:max-w-none sm:text-base">{team.name}</p>
        {align === "right" ? <TeamBadgeInline team={team} /> : null}
      </div>
    </div>
  );
}

function ActionTile({
  type,
  label,
  helper,
  onClick,
  wide = false,
}: {
  type: EventType;
  label: string;
  helper: string;
  onClick: () => void;
  wide?: boolean;
}) {
  const Icon = actionIcon(type);
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-[24px] border p-4 text-left shadow-sm transition active:scale-[0.99]",
        actionTileTone(type),
        wide && "flex items-center justify-between",
      )}
    >
      <div className={clsx("flex items-start gap-3", wide && "items-center")}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70">
          <Icon size={22} />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-black">{label}</span>
          <span className="mt-1 block text-xs font-bold opacity-80">{helper}</span>
        </span>
      </div>
    </button>
  );
}

function SummaryBlock({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
        {!empty ? <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{Array.isArray(children) ? children.length : ""}</span> : null}
      </div>
      <div className="mt-2 space-y-2">
        {empty ? <p className="text-sm font-bold text-slate-500">Sin registros.</p> : children}
      </div>
    </section>
  );
}

function renderSummaryItem(
  event: DraftEvent,
  getPlayer: (id: string) => Player | undefined,
  getTeam: (id: string) => Team | undefined,
) {
  const player = getPlayer(event.playerId);
  const team = getTeam(event.teamId);

  return (
    <div key={event.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700">
      <AvatarImage src={player?.photoUrl} label={teamInitials(player?.name ?? "J")} size="sm" rounded="full" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950">{player?.name ?? "Jugador"}</p>
        <p className="truncate text-xs font-bold text-slate-500">{player?.number ? `#${player.number} · ` : ""}{team?.name ?? "Equipo"}</p>
      </div>
      {team ? <TeamBadgeInline team={team} /> : null}
    </div>
  );
}

function SummaryTeamBadge({ team, score, align }: { team: Team; score: number; align: "left" | "right" }) {
  return (
    <div className={clsx("rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm", align === "right" ? "text-right" : "text-left")}>
      <div className={clsx("flex items-center gap-2", align === "right" ? "justify-end" : "justify-start")}>
        {align === "left" ? <TeamBadgeInline team={team} /> : null}
        <p className="max-w-[150px] whitespace-normal break-words text-sm font-black leading-tight text-slate-950 sm:max-w-none">{team.name}</p>
        {align === "right" ? <TeamBadgeInline team={team} /> : null}
      </div>
      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Escudo y resultado</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{score}</p>
    </div>
  );
}

function formatPlayerDisplay(player?: Player, team?: Team) {
  if (!player) return team?.name ?? "Jugador";
  const parts = [player.name];
  if (player.number) parts.push(`#${player.number}`);
  parts.push(normalizePlayerPosition(player.position));
  if (team?.name) parts.push(team.name);
  return parts.join(" · ");
}

function CompactEmpty({ label, action, onClick }: { label: string; action?: string; onClick?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-black text-slate-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{label}</span>
        {action && onClick ? <SecondaryButton onClick={onClick} className="!h-10 !rounded-lg">{action}</SecondaryButton> : null}
      </div>
    </div>
  );
}

function CompactWarning({ label }: { label: string }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900">{label}</div>;
}

function CompactAlertRow({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" }) {
  return (
    <div className={clsx("flex items-center justify-between gap-3 rounded-xl border px-3 py-3", tone === "warning" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50")}>
      <span className={clsx("text-sm font-black", tone === "warning" ? "text-amber-900" : "text-emerald-900")}>{label}</span>
      <span className={clsx("rounded-full px-3 py-1 text-xs font-black", tone === "warning" ? "bg-white text-amber-900 ring-1 ring-amber-200" : "bg-white text-emerald-800 ring-1 ring-emerald-200")}>{value}</span>
    </div>
  );
}

function FormLabel({ children }: { children: string }) {
  return <p className="mb-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-500">{children}</p>;
}

function teamInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "EQ";
}

function parseCsvBlock(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[;,]/).map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase();
}

function dayNameFromDate(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long" }).format(new Date(`${date}T12:00:00-03:00`));
}

function actionLabel(type: EventType) {
  if (type === "goal") return "Gol";
  if (type === "assist") return "Asistencia";
  if (type === "yellow") return "Amarilla";
  if (type === "red") return "Roja";
  return "MVP";
}

function actionTone(type: EventType) {
  if (type === "goal") return "bg-emerald-50 text-emerald-800";
  if (type === "assist") return "bg-sky-50 text-sky-800";
  if (type === "yellow") return "bg-amber-50 text-amber-800";
  if (type === "red") return "bg-red-50 text-red-700";
  return "bg-fuchsia-50 text-fuchsia-800";
}

function actionTileTone(type: EventType) {
  if (type === "goal") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (type === "assist") return "border-sky-200 bg-sky-50 text-sky-900";
  if (type === "yellow") return "border-amber-200 bg-amber-50 text-amber-900";
  if (type === "red") return "border-red-200 bg-red-50 text-red-900";
  return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900";
}

function actionIcon(type: EventType) {
  if (type === "goal") return Award;
  if (type === "assist") return Star;
  if (type === "yellow") return ShieldAlert;
  if (type === "red") return X;
  return ClipboardList;
}

function createDraftEvent(matchId: string, playerId: string, teamId: string, type: EventType, playId?: string): DraftEvent {
  return {
    id: `draft-${type}-${playerId}-${Math.random().toString(36).slice(2, 9)}`,
    matchId,
    playId,
    playerId,
    teamId,
    type,
    minute: 1,
    isDraft: true,
  };
}

function createPlayId() {
  return `play-${Math.random().toString(36).slice(2, 10)}`;
}

function computeDraftScore(events: DraftEvent[], homeTeamId: string, awayTeamId: string) {
  return events.reduce((score, event) => {
    if (event.type !== "goal") return score;
    if (event.teamId === homeTeamId) score.home += 1;
    if (event.teamId === awayTeamId) score.away += 1;
    return score;
  }, { home: 0, away: 0 });
}

function areDraftEventsEqual(a: MatchEvent[], b: DraftEvent[]) {
  if (a.length !== b.length) return false;
  return a.every((event, index) => {
    const other = b[index];
    return other
      && event.id === other.id
      && event.playerId === other.playerId
      && event.teamId === other.teamId
      && event.type === other.type
      && event.minute === other.minute;
  });
}

function parseDateInput(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const cleaned = dateStr.trim();
  if (!cleaned || cleaned === "-") return undefined;

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmMatch = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmMatch) {
    const [, day, month, year] = dmMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // YYYY-MM-DD
  const ymMatch = cleaned.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymMatch) {
    const [, year, month, day] = ymMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return cleaned;
}

function normalizePlayerPosition(value?: string) {
  const cleaned = (value ?? "").trim().toLowerCase();
  if (!cleaned) return "Jugador";
  if (cleaned === "arquero" || cleaned === "portero" || cleaned === "golero") return "Arquero";
  return "Jugador";
}
