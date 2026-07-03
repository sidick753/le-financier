"use client";

const MEMBRES = [
  { initiales: "KA", nom: "Kouamé Assoumou", role: "Analyste Senior", email: "k.assoumou@banque-atlantique.ci", dossiers: 14, encours: "2.1 Md FCFA", specialite: "Affacturage & Prêts", statut: "actif" },
  { initiales: "MT", nom: "Mariame Touré", role: "Analyste Crédit", email: "m.toure@banque-atlantique.ci", dossiers: 12, encours: "1.4 Md FCFA", specialite: "Prêts MLT & Equity", statut: "actif" },
  { initiales: "SB", nom: "Serge Bamba", role: "Responsable Conformité", email: "s.bamba@banque-atlantique.ci", dossiers: 5, encours: "700 M FCFA", specialite: "Conformité & AML", statut: "actif" },
  { initiales: "AK", nom: "Adjoua Koffi", role: "Analyste Junior", email: "a.koffi@banque-atlantique.ci", dossiers: 3, encours: null, specialite: "En formation", statut: "formation" },
];

const AVATAR_COLORS = [
  "bg-blue-200 text-blue-700",
  "bg-purple-200 text-purple-700",
  "bg-green-200 text-green-700",
  "bg-orange-200 text-orange-700",
];

export default function EquipePage() {
  const actifs = MEMBRES.filter((m) => m.statut === "actif").length;
  const dossiersTotaux = MEMBRES.reduce((s, m) => s + m.dossiers, 0);
  const analystes = MEMBRES.filter((m) => m.role.toLowerCase().includes("analyste") && m.statut === "actif").length;
  const rendementMoyen = 9.7;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Équipe</h1>
          <p className="text-sm text-gray-500">Gestion des membres de votre équipe</p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          👥 Inviter un membre
        </button>
      </div>

      {/* 4 KPI */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "Membres actifs", value: actifs },
          { label: "Dossiers en cours", value: dossiersTotaux },
          { label: "Analystes disponibles", value: analystes },
          { label: "Rendement moyen équipe", value: `${rendementMoyen}%`, green: true },
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="px-5 py-3 text-left font-medium">Membre</th>
                <th className="px-5 py-3 text-left font-medium">Email</th>
                <th className="px-5 py-3 text-center font-medium">Dossiers actifs</th>
                <th className="px-5 py-3 text-right font-medium">Encours géré</th>
                <th className="px-5 py-3 text-left font-medium">Spécialité</th>
                <th className="px-5 py-3 text-left font-medium">Statut</th>
                <th className="px-5 py-3 text-left font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MEMBRES.map((membre, i) => (
                <tr key={membre.email} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                        {membre.initiales}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{membre.nom}</p>
                        <p className="text-xs text-gray-400">{membre.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">{membre.email}</td>
                  <td className="px-5 py-4 text-center text-xs font-medium text-gray-900">
                    {membre.dossiers}
                  </td>
                  <td className="px-5 py-4 text-right text-xs font-medium text-gray-900">
                    {membre.encours ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600">{membre.specialite}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      membre.statut === "actif" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {membre.statut === "actif" ? "Actif" : "Formation"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button className="text-xs text-brand-700 hover:underline">Voir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 p-3 text-center">
          <p className="text-xs text-gray-400">
            La gestion complète des membres (invitations, rôles, permissions) sera disponible dans une prochaine version.
          </p>
        </div>
      </div>
    </div>
  );
}
