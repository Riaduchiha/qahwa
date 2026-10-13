
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  supplier_id: string | null;
  receipt_url: string | null;
  notes: string | null;
};

type Supplier = {
  id: string;
  name: string;
};

const CATEGORIES = [
  { value: "loyer", label: "Loyer" },
  { value: "electricite", label: "Électricité" },
  { value: "eau", label: "Eau" },
  { value: "internet", label: "Internet" },
  { value: "salaires", label: "Salaires" },
  { value: "entretien", label: "Entretien" },
  { value: "transport", label: "Transport" },
  { value: "materiel", label: "Matériel" },
  { value: "marketing", label: "Marketing" },
  { value: "impots", label: "Impôts et taxes" },
  { value: "frais_bancaires", label: "Frais bancaires" },
  { value: "autre", label: "Autre dépense" },
];

const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "carte", label: "Carte bancaire" },
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
  { value: "autre", label: "Autre" },
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#111111] px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/50";

const panelClass =
  "rounded-2xl border border-white/10 bg-[#1B1B1B]";

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-DZ", {
    style: "decimal",
    maximumFractionDigits: 2,
  }).format(value) + " DA";
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Date(value + "T12:00:00").toLocaleDateString("fr-DZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function QahwaComptabilitePage() {
  const supabase = useMemo(
    () => createSupabaseBrowserClient() as any,
    []
  );

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [showAllMonths, setShowAllMonths] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("autre");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [supplierId, setSupplierId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [expensesResult, suppliersResult] = await Promise.all([
        supabase
          .from("expenses")
          .select(
            "id,title,category,amount,expense_date,payment_method,supplier_id,receipt_url,notes"
          )
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("suppliers")
          .select("id,name")
          .order("name", { ascending: true }),
      ]);

      if (expensesResult.error) throw expensesResult.error;

      setExpenses((expensesResult.data ?? []) as Expense[]);
      setSuppliers(
        suppliersResult.error
          ? []
          : ((suppliersResult.data ?? []) as Supplier[])
      );
    } catch (err) {
      console.error(err);
      setError(
        "Impossible de charger les dépenses. Vérifie la connexion à Supabase."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const matchesMonth =
        showAllMonths || expense.expense_date?.startsWith(selectedMonth);

      const categoryLabel =
        CATEGORIES.find((item) => item.value === expense.category)?.label ??
        expense.category;

      const supplierName =
        suppliers.find((supplier) => supplier.id === expense.supplier_id)
          ?.name ?? "";

      const matchesSearch =
        !query ||
        expense.title.toLowerCase().includes(query) ||
        categoryLabel.toLowerCase().includes(query) ||
        supplierName.toLowerCase().includes(query) ||
        (expense.notes ?? "").toLowerCase().includes(query);

      return matchesMonth && matchesSearch;
    });
  }, [expenses, selectedMonth, showAllMonths, search, suppliers]);

  const totalFiltered = filteredExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const totalMonth = expenses
    .filter((expense) => expense.expense_date?.startsWith(currentMonth()))
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    if (!title.trim()) {
      setError("Saisis le nom de la dépense.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Saisis un montant supérieur à zéro.");
      return;
    }

    if (!expenseDate) {
      setError("Choisis la date de la dépense.");
      return;
    }

    setSaving(true);

    try {
      const { error: insertError } = await supabase.from("expenses").insert({
        title: title.trim(),
        category,
        amount: numericAmount,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        supplier_id: supplierId || null,
        receipt_url: receiptUrl.trim() || null,
        notes: notes.trim() || null,
      });

      if (insertError) throw insertError;

      setTitle("");
      setCategory("autre");
      setAmount("");
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod("especes");
      setSupplierId("");
      setReceiptUrl("");
      setNotes("");
      setSuccess("Dépense enregistrée avec succès.");

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        "Enregistrement impossible. Vérifie les droits Supabase et les champs saisis."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(expense: Expense) {
    const confirmed = window.confirm(
      `Supprimer la dépense « ${expense.title} » de ${formatMoney(
        Number(expense.amount)
      )} ?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expense.id);

    if (deleteError) {
      console.error(deleteError);
      setError("Impossible de supprimer cette dépense.");
      return;
    }

    setExpenses((previous) =>
      previous.filter((item) => item.id !== expense.id)
    );
    setSuccess("Dépense supprimée.");
  }

  return (
    <main className="min-h-screen space-y-6 bg-[#0A0A0A] pb-10 text-white">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/45">
            Gestion financière
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Comptabilité
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Suis les dépenses et les sorties d’argent de Qahwa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
        >
          ↻ Actualiser
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-white/20 bg-white/5 p-4 text-sm text-white"
        >
          {success}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className={`${panelClass} p-5`}>
          <p className="text-sm text-white/50">Dépenses du mois en cours</p>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {formatMoney(totalMonth)}
          </p>
          <p className="mt-2 text-xs text-white/40">
            Toutes catégories confondues
          </p>
        </div>

        <div className={`${panelClass} p-5`}>
          <p className="text-sm text-white/50">
            {showAllMonths ? "Total de toutes les dépenses" : "Total filtré"}
          </p>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {formatMoney(totalFiltered)}
          </p>
          <p className="mt-2 text-xs text-white/40">
            {filteredExpenses.length} dépense(s) affichée(s)
          </p>
        </div>
      </section>

      <section className={`${panelClass} p-5 sm:p-6`}>
        <div className="mb-6">
          <h2 className="text-lg font-bold">Nouvelle dépense</h2>
          <p className="mt-1 text-sm text-white/45">
            Enregistre un achat, une facture ou une autre sortie d’argent.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="block text-sm text-white/70">
                Nom de la dépense *
              </span>
              <input
                className={inputClass}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex. Facture d'électricité"
                maxLength={150}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-white/70">Catégorie *</span>
              <select
                className={inputClass}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-white/70">
                Montant en DA *
              </span>
              <input
                className={inputClass}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Ex. 2500"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-white/70">Date *</span>
              <input
                className={inputClass}
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-white/70">
                Mode de paiement
              </span>
              <select
                className={inputClass}
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                {PAYMENT_METHODS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-white/70">
                Fournisseur (facultatif)
              </span>
              <select
                className={inputClass}
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
              >
                <option value="">Aucun fournisseur</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm text-white/70">
                Lien vers la facture ou le reçu (facultatif)
              </span>
              <input
                className={inputClass}
                type="url"
                value={receiptUrl}
                onChange={(event) => setReceiptUrl(event.target.value)}
                placeholder="https://..."
              />
              <span className="block text-xs text-white/35">
                Pour le moment, ajoute un lien accessible vers le document.
              </span>
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-white/70">
                Notes (facultatif)
              </span>
              <textarea
                className={`${inputClass} min-h-[90px] resize-y`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Détails supplémentaires..."
                maxLength={2000}
              />
            </label>
          </div>

          <div className="flex justify-end border-t border-white/10 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Enregistrement..." : "Enregistrer la dépense"}
            </button>
          </div>
        </form>
      </section>

      <section className={`${panelClass} overflow-hidden`}>
        <div className="space-y-4 border-b border-white/10 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold">Historique des dépenses</h2>
            <p className="mt-1 text-sm text-white/45">
              Recherche, filtre et consulte les dépenses enregistrées.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              className={inputClass}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une dépense..."
            />

            <input
              className={inputClass}
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              disabled={showAllMonths}
            />

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white/75">
              <input
                type="checkbox"
                checked={showAllMonths}
                onChange={(event) => setShowAllMonths(event.target.checked)}
                className="h-4 w-4 accent-white"
              />
              Tous les mois
            </label>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-white/45">
            Chargement des dépenses...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl">
              —
            </div>
            <p className="mt-4 font-semibold">Aucune dépense trouvée</p>
            <p className="mt-2 text-sm text-white/45">
              Modifie les filtres ou enregistre ta première dépense.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/10">
              {filteredExpenses.map((expense) => {
                const categoryLabel =
                  CATEGORIES.find(
                    (item) => item.value === expense.category
                  )?.label ?? expense.category;

                const paymentLabel =
                  PAYMENT_METHODS.find(
                    (item) => item.value === expense.payment_method
                  )?.label ?? expense.payment_method;

                const supplierName =
                  suppliers.find(
                    (supplier) => supplier.id === expense.supplier_id
                  )?.name;

                return (
                  <article
                    key={expense.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{expense.title}</h3>
                        <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/65">
                          {categoryLabel}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
                        <span>{formatDate(expense.expense_date)}</span>
                        <span>{paymentLabel}</span>
                        {supplierName && <span>{supplierName}</span>}
                      </div>

                      {expense.notes && (
                        <p className="mt-2 break-words text-sm text-white/50">
                          {expense.notes}
                        </p>
                      )}

                      {expense.receipt_url && (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs text-white underline underline-offset-4 hover:text-white/70"
                        >
                          Consulter le reçu
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <p className="whitespace-nowrap text-lg font-bold">
                        {formatMoney(Number(expense.amount))}
                      </p>

                      <button
                        type="button"
                        onClick={() => void deleteExpense(expense)}
                        aria-label={`Supprimer ${expense.title}`}
                        title="Supprimer cette dépense"
                        className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 border-t border-white/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-white/50">
                Total des dépenses affichées
              </span>
              <span className="text-xl font-bold">
                {formatMoney(totalFiltered)}
              </span>
            </div>
          </>
        )}
      </section>

      <p className="text-xs leading-5 text-white/35">
        Cette page suit les dépenses enregistrées manuellement. Les achats
        fournisseurs détaillés, les mouvements de stock et le calcul des
        marges seront reliés dans les prochaines étapes. Ce total ne représente
        pas à lui seul le bénéfice réel de Qahwa.
      </p>
    </main>
  );
}
