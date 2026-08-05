"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { alertError, alertSuccess, confirmDialog } from "@/lib/alert";
import { NotifBell } from "@/components/ui/notif-bell";

interface PlatformBankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  swiftCode: string | null;
  isActive: boolean;
}

const EMPTY_FORM = { bankName: "", accountHolder: "", accountNumber: "", swiftCode: "" };

export default function PlatformSettingsPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<PlatformBankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refresh() {
    if (!token) return;
    try {
      const data = await api.get<PlatformBankAccount[]>("/platform-bank-accounts", token);
      setAccounts(data);
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec du chargement.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreate() {
    if (!form.bankName.trim() || !form.accountHolder.trim() || !form.accountNumber.trim()) {
      alertError("Banque, titulaire et numéro de compte sont requis.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(
        "/platform-bank-accounts",
        {
          bankName: form.bankName.trim(),
          accountHolder: form.accountHolder.trim(),
          accountNumber: form.accountNumber.trim(),
          swiftCode: form.swiftCode.trim() || undefined,
        },
        token!,
      );
      alertSuccess("Compte bancaire ajouté.");
      setForm(EMPTY_FORM);
      setShowForm(false);
      refresh();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la création.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(account: PlatformBankAccount) {
    try {
      await api.patch(`/platform-bank-accounts/${account.id}`, { isActive: !account.isActive }, token!);
      refresh();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la mise à jour.");
    }
  }

  async function handleDelete(account: PlatformBankAccount) {
    if (!(await confirmDialog(`Supprimer le compte "${account.bankName}" ? Cette action est définitive.`, { confirmText: "Supprimer" }))) return;
    try {
      await api.delete(`/platform-bank-accounts/${account.id}`, token!);
      alertSuccess("Compte supprimé.");
      refresh();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la suppression.");
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Plateforme</p>
          <p className="text-xs text-slate-500">Comptes bancaires LeFinancier</p>
        </div>
        <NotifBell href="/admin/notifications" />
      </header>

      <div className="p-8 pb-16">
        <div className="mb-5 rounded-[14px] bg-blue-50 px-4 py-3 text-[12px] text-blue-700">
          Ce sont les comptes vers lesquels les investisseurs virent leurs fonds une fois un engagement confirmé
        </div>

        <div className="rounded-[18px] border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <p className="text-[16px] font-bold text-slate-900">Comptes bancaires</p>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-blue-700 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-800"
            >
              {showForm ? "Annuler" : "+ Ajouter un compte"}
            </button>
          </div>

          {showForm && (
            <div className="space-y-3 border-b border-slate-100 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-slate-700">Banque</label>
                  <input
                    value={form.bankName}
                    onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                    placeholder="Ex : Ecobank Côte d'Ivoire"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-slate-700">Titulaire du compte</label>
                  <input
                    value={form.accountHolder}
                    onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
                    placeholder="Ex : LeFinancier SAS"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-slate-700">Numéro de compte / IBAN</label>
                  <input
                    value={form.accountNumber}
                    onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                    placeholder="Ex : CI93 CI135 01023 00456789012 34"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-slate-700">Code SWIFT/BIC (optionnel)</label>
                  <input
                    value={form.swiftCode}
                    onChange={(e) => setForm((f) => ({ ...f, swiftCode: e.target.value }))}
                    placeholder="Ex : ECOCCIAB"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                  />
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="rounded-lg bg-blue-700 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer le compte"}
              </button>
            </div>
          )}

          {isLoading && <p className="p-8 text-center text-[13px] text-slate-400">Chargement...</p>}

          {!isLoading && accounts.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-[13px] text-slate-400">Aucun compte bancaire configuré.</p>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-slate-900">{acc.bankName}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        acc.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {acc.isActive ? "Actif" : "Désactivé"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {acc.accountHolder} · {acc.accountNumber}
                    {acc.swiftCode && ` · ${acc.swiftCode}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(acc)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {acc.isActive ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    onClick={() => handleDelete(acc)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
