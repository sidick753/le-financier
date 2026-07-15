"use client";

import { useState } from "react";
import { useInstitutionSettings } from "@/lib/use-institution-settings";
import { NotifBell } from "@/components/ui/notif-bell";
import { useSortableRows } from "@/lib/use-sortable-rows";
import { SortableTh } from "@/components/ui/sortable-th";

const AVATAR_COLORS = [
  "bg-blue-200 text-blue-700",
  "bg-purple-200 text-purple-700",
  "bg-green-200 text-green-700",
  "bg-orange-200 text-orange-700",
];

function formatMontant(amount: number) {
  if (amount === 0) return null;
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} Md FCFA`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)} M FCFA`;
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function initiales(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ANALYST: "Analyste",
  COMPLIANCE: "Conformité",
};

export default function EquipePage() {
  const { members, isLoading, inviteMember, removeMember } = useInstitutionSettings();

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("ANALYST");
  const [specialty, setSpecialty] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  const actifs = members.filter((m) => m.status === "ACTIVE").length;
  const dossiersTotaux = members.reduce((s, m) => s + m.dossiersActifs, 0);
  const analystes = members.filter((m) => m.role === "ANALYST" && m.status === "ACTIVE").length;
  const encoursTotal = members.reduce((s, m) => s + m.encoursGere, 0);

  const { sortedRows: sortedMembers, sortKey, direction, toggleSort } = useSortableRows(members, {
    name: (m) => `${m.firstName} ${m.lastName}`,
    email: (m) => m.email,
    dossiers: (m) => m.dossiersActifs,
    encours: (m) => m.encoursGere,
    specialty: (m) => m.specialty ?? "",
    status: (m) => m.status,
  });

  async function handleInvite() {
    setInviteError(null);
    try {
      const result = await inviteMember({ email, firstName, lastName, role, specialty: specialty || undefined });
      if (result) setTemporaryPassword(result.temporaryPassword);
      setEmail("");
      setFirstName("");
      setLastName("");
      setSpecialty("");
      setShowInviteForm(false);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Erreur inconnue.");
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await removeMember(memberId);
    } catch {
      // Le backend renvoie 403 si l'utilisateur courant n'est pas propriétaire — ignoré silencieusement dans l'UI.
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-15 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Équipe</p>
          <p className="text-xs text-slate-500">Gestion des membres de votre équipe</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInviteForm((v) => !v)}
            className="flex items-center gap-2 rounded-[10px] bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-800"
          >
            👥 Inviter un membre
          </button>
          <NotifBell href="/institution/notifications" />
        </div>
      </header>

      <div className="p-8 pb-16">
        {temporaryPassword && (
        <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-xs text-orange-800">
            ⚠ Membre invité. Mot de passe temporaire (communiquez-le hors-ligne, il ne sera plus affiché) :{" "}
            <span className="font-mono font-semibold">{temporaryPassword}</span>
          </p>
        </div>
      )}

      {showInviteForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-900">Inviter un nouveau membre</p>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-md border border-gray-200 px-3 py-2 text-sm" />
            <input placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-md border border-gray-200 px-3 py-2 text-sm" />
            <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-md border border-gray-200 px-3 py-2 text-sm" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border border-gray-200 px-3 py-2 text-sm">
              <option value="ANALYST">Analyste</option>
              <option value="COMPLIANCE">Conformité</option>
              <option value="OWNER">Propriétaire</option>
            </select>
            <input placeholder="Spécialité (optionnel)" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="col-span-2 rounded-md border border-gray-200 px-3 py-2 text-sm" />
          </div>
          {inviteError && <p className="mt-2 text-xs text-red-600">{inviteError}</p>}
          <button
            onClick={handleInvite}
            className="mt-3 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Envoyer l'invitation
          </button>
        </div>
      )}

      {/* 4 KPI */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "Membres actifs", value: actifs },
          { label: "Dossiers en cours", value: dossiersTotaux },
          { label: "Analystes disponibles", value: analystes },
          { label: "Encours total géré", value: formatMontant(encoursTotal) ?? "—", green: true },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className={`mt-2 text-2xl font-bold ${kpi.green ? "text-green-600" : "text-gray-900"}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tableau membres */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading && <p className="p-5 text-center text-sm text-gray-400">Chargement...</p>}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <SortableTh label="Membre" sortKey="name" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Email" sortKey="email" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Dossiers actifs" sortKey="dossiers" currentKey={sortKey} direction={direction} onSort={toggleSort} align="center" />
                  <SortableTh label="Encours géré" sortKey="encours" currentKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                  <SortableTh label="Spécialité" sortKey="specialty" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Statut" sortKey="status" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <th className="px-5 py-3 text-left font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedMembers.map((membre, i) => (
                  <tr key={membre.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                          {initiales(membre.firstName, membre.lastName)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{membre.firstName} {membre.lastName}</p>
                          <p className="text-xs text-gray-400">{ROLE_LABELS[membre.role] ?? membre.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{membre.email}</td>
                    <td className="px-5 py-4 text-center text-xs font-medium text-gray-900">
                      {membre.dossiersActifs}
                    </td>
                    <td className="px-5 py-4 text-right text-xs font-medium text-gray-900">
                      {formatMontant(membre.encoursGere) ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600">{membre.specialty ?? "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        membre.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {membre.status === "ACTIVE" ? "Actif" : "Formation"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {membre.role !== "OWNER" && (
                        <button
                          onClick={() => handleRemove(membre.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Retirer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-gray-100 p-3 text-center">
          <p className="text-xs text-gray-400">
            Seul le propriétaire de l'institution peut inviter ou retirer des membres.
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
