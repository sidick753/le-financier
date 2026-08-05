import { formatFullAmount } from "@/lib/admin-ui";
import {
  SECTEURS,
  TAILLE_MARCHE,
  SCALABILITE,
  MOAT,
  PART_MARCHE,
  TRACK_RECORD,
  COMPLETUDE_EQUIPE,
  DROITS_INVESTISSEUR,
  TRANSPARENCE,
  labelFor,
} from "@/lib/credit-profile-options";

// Sous-ensemble d'Organization nécessaire pour donner à l'admin une vue complète
// du profil PME sans quitter la page (détail d'opportunité, détail PME...).
export interface OrganizationProfileSummaryData {
  legalForm: string | null;
  foundedYear: number | null;
  address: string | null;
  city: string | null;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankAccountNumber: string | null;
  bankSwiftCode: string | null;
  dirigeantEstPep: boolean;
  secteurCode: string | null;
  secteurSaisonnalite: boolean | null;
  secteurImportDevises: boolean | null;
  secteurSoutienPublic: boolean | null;
  cashFlowAnnuel: string | null;
  fluxMobileMoneyMensuel: string | null;
  autonomieFinanciere: string | null;
  tauxEndettement: string | null;
  ratioLiquidite: string | null;
  tcamCa3ans: string | null;
  margeBrute: string | null;
  runwayMois: number | null;
  nbClientsActifs: number | null;
  dirigeantExperienceAns: number | null;
  dirigeantAntecedents: string | null;
  dirigeantIncidentsLegaux: string | null;
  experienceSecteurAns: number | null;
  trackRecord: string | null;
  completudeEquipe: string | null;
  droitsInvestisseur: string | null;
  transparence: string | null;
  tailleMarche: string | null;
  scalabilite: string | null;
  moat: string | null;
  partMarcheRelative: string | null;
}

// Le contact (email/téléphone) n'existe pas sur Organization elle-même — une PME
// est toujours représentée par un membre, jamais en son nom propre (cf. le
// propriétaire de l'organisation). Prop séparée plutôt qu'ajoutée à
// OrganizationProfileSummaryData : ce n'est pas un attribut du profil de crédit.
interface OrganizationOwner {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export function OrganizationProfileSummary({
  org,
  owner,
}: {
  org: OrganizationProfileSummaryData;
  owner?: OrganizationOwner | null;
}) {
  return (
    <div className="space-y-4">
      <CreditSection title="Identité">
        <Field label="Forme juridique" value={org.legalForm ?? "—"} />
        <Field label="Année de création" value={org.foundedYear?.toString() ?? "—"} />
        <Field label="Ville" value={org.city ?? "—"} />
        <Field label="Adresse" value={org.address ?? "—"} />
        <Field label="Contact (propriétaire)" value={owner ? `${owner.firstName} ${owner.lastName}` : "—"} />
        <Field label="Email" value={owner?.email ?? "—"} />
        <Field label="Téléphone" value={owner?.phone ?? "—"} />
      </CreditSection>

      <CreditSection title="Coordonnées bancaires">
        <Field label="Banque" value={org.bankName ?? "—"} />
        <Field label="Titulaire du compte" value={org.bankAccountHolder ?? "—"} />
        <Field label="Numéro de compte / IBAN" value={org.bankAccountNumber ?? "—"} />
        <Field label="Code SWIFT / BIC" value={org.bankSwiftCode ?? "—"} />
      </CreditSection>

      <CreditSection title="Secteur & structure">
        <Field label="Secteur d'activité (scoring)" value={labelFor(SECTEURS, org.secteurCode)} />
        <BoolField label="Activité saisonnière" value={org.secteurSaisonnalite} />
        <BoolField label="Import en devises" value={org.secteurImportDevises} />
        <BoolField label="Soutien public au secteur" value={org.secteurSoutienPublic} />
      </CreditSection>

      <CreditSection title="Santé financière">
        <Field label="Cash-flow annuel" value={formatAmount(org.cashFlowAnnuel)} />
        <Field label="Flux Mobile Money mensuel" value={formatAmount(org.fluxMobileMoneyMensuel)} />
        <Field label="Autonomie financière" value={formatPercent(org.autonomieFinanciere)} />
        <Field label="Taux d'endettement" value={formatPercent(org.tauxEndettement)} />
        <Field label="Ratio de liquidité" value={formatPercent(org.ratioLiquidite)} />
        <Field label="Nombre de clients actifs" value={org.nbClientsActifs?.toString() ?? "—"} />
        <Field label="TCAM CA sur 3 ans" value={formatPercent(org.tcamCa3ans)} />
        <Field label="Marge brute" value={formatPercent(org.margeBrute)} />
        <Field label="Runway" value={org.runwayMois != null ? `${org.runwayMois} mois` : "—"} />
      </CreditSection>

      <CreditSection title="Profil du dirigeant">
        <Field label="Expérience du dirigeant" value={org.dirigeantExperienceAns != null ? `${org.dirigeantExperienceAns} ans` : "—"} />
        <Field
          label="Incidents légaux connus"
          value={org.dirigeantIncidentsLegaux === "connu" ? "Incident(s) connu(s)" : org.dirigeantIncidentsLegaux === "aucun" ? "Aucun" : "—"}
        />
        <Field label="Expérience sectorielle" value={org.experienceSecteurAns != null ? `${org.experienceSecteurAns} ans` : "—"} />
        <Field label="Track record du dirigeant" value={labelFor(TRACK_RECORD, org.trackRecord)} />
        <Field label="Antécédents du dirigeant" value={org.dirigeantAntecedents || "—"} span2 />
        <div>
          <p className="text-xs text-gray-500">Personne politiquement exposée (PEP)</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{org.dirigeantEstPep ? "Oui" : "Non"}</p>
          {org.dirigeantEstPep && (
            <p className="mt-1 text-[11px] text-amber-600">Déclenche une alerte AML à chaque virement validé.</p>
          )}
        </div>
      </CreditSection>

      <CreditSection title="Équipe, gouvernance & marché">
        <Field label="Taille du marché" value={labelFor(TAILLE_MARCHE, org.tailleMarche)} />
        <Field label="Scalabilité" value={labelFor(SCALABILITE, org.scalabilite)} />
        <Field label="Avantage concurrentiel (moat)" value={labelFor(MOAT, org.moat)} />
        <Field label="Position sur le marché" value={labelFor(PART_MARCHE, org.partMarcheRelative)} />
        <Field label="Complétude de l'équipe" value={labelFor(COMPLETUDE_EQUIPE, org.completudeEquipe)} />
        <Field label="Droits investisseurs" value={labelFor(DROITS_INVESTISSEUR, org.droitsInvestisseur)} />
        <Field label="Transparence financière" value={labelFor(TRANSPARENCE, org.transparence)} />
      </CreditSection>
    </div>
  );
}

function formatAmount(value: string | null): string {
  if (value === null || value === undefined) return "—";
  return formatFullAmount(Number(value));
}

// Stocké en base sous forme de ratio 0–1, affiché en %.
function formatPercent(value: string | null): string {
  if (value === null || value === undefined) return "—";
  return `${(Number(value) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

function CreditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-5">
        <p className="text-lg font-bold text-gray-900">{title}</p>
      </div>
      <div className="grid grid-cols-4 gap-4 p-5">{children}</div>
    </div>
  );
}

function Field({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
  return (
    <div className={span2 ? "col-span-2" : undefined}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900 break-words">{value}</p>
    </div>
  );
}

function BoolField({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value ? "Oui" : "Non"}</p>
    </div>
  );
}
