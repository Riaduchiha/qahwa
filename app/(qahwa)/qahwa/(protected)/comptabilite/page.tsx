"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

type FormState = {
  title: string;
  category: string;
  amount: string;
  expenseDate: string;
  paymentMethod: string;
  supplierId: string;
  receiptUrl: string;
  notes: string;
};

type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

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

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_desc", label: "Plus récentes d’abord" },
  { value: "date_asc", label: "Plus anciennes d’abord" },
  { value: "amount_desc", label: "Montant décroissant" },
  { value: "amount_asc", label: "Montant croissant" },
];

const PAGE_SIZE = 30;
const BUDGET_KEY = "qahwa_budget_mensuel";
const ACCENT = "#FF6B00";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#111111] px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#FF6B00]/70 disabled:cursor-not-allowed disabled:opacity-40";

const panelClass = "rounded-2xl border border-white/10 bg-[#1B1B1B]";

const ghostButton =
  "rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";

/* ------------------------------------------------------------------ */
/*  Fonctions utilitaires                                              */
/* ------------------------------------------------------------------ */

function formatMoney(value: number) {
  return (
    new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 2,
    }).format(value) + " DA"
  );
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Date(value + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDayHeader(value: string) {
  if (!value) return "Sans date";

  const label = new Date(value + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Date locale au format AAAA-MM-JJ (évite le décalage UTC de toISOString). */
function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function currentMonth() {
  return todayISO().slice(0, 7);
}

/** Découpe "AAAA-MM" en [année, mois] (toujours des nombres). */
function parseMonth(month: string): [number, number] {
  const parts = month.split("-");
  return [Number(parts[0]), Number(parts[1])];
}

function shiftMonth(month: string, delta: number) {
  const [year, m] = parseMonth(month);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, m] = parseMonth(month);
  const label = new Date(year, m - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shortMonthLabel(month: string) {
  const [year, m] = parseMonth(month);
  return new Date(year, m - 1, 1)
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "");
}

function categoryLabel(value: string) {
  return CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

function paymentLabel(value: string) {
  return PAYMENT_METHODS.find((item) => item.value === value)?.label ?? value;
}

function emptyForm(): FormState {
  return {
    title: "",
    category: "autre",
    amount: "",
    expenseDate: todayISO(),
    paymentMethod: "especes",
    supplierId: "",
    receiptUrl: "",
    notes: "",
  };
}

/* ------------------------------------------------------------------ */
/*  Petits composants                                                  */
/* ------------------------------------------------------------------ */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm text-white/70">{label}</span>
      {children}
      {hint && <span className="block text-xs text-white/35">{hint}</span>}
    </label>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  size = "lg",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "lg";
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
      />

      <div
        className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#1B1B1B] p-5 shadow-2xl sm:rounded-2xl sm:p-6 ${
          size === "sm" ? "sm:max-w-md" : "sm:max-w-2xl"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-white/45">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  footer,
  badge,
}: {
  label: string;
  value: string;
  footer?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className={`${panelClass} p-5`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-white/50">{label}</p>
        {badge}
      </div>
      <p className="mt-3 truncate text-2xl font-bold tracking-tight">{value}</p>
      {footer && <p className="mt-2 truncate text-xs text-white/40">{footer}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function QahwaComptabilitePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient() as any, []);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filtres
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [onlyWithoutReceipt, setOnlyWithoutReceipt] = useState(false);
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Formulaire (ajout / modification)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  // Suppression
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Budget mensuel (enregistré sur cet appareil)
  const [budget, setBudget] = useState(0);
  const [budgetEditing, setBudgetEditing] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");

  /* ---------------------------- Chargement ---------------------------- */

  const loadData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
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
    },
    [supabase]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Budget : lecture au démarrage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BUDGET_KEY);
      if (raw) setBudget(Number(raw) || 0);
    } catch {
      /* stockage indisponible : on ignore */
    }
  }, []);

  // Le message de succès disparaît tout seul
  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  // On revient à la première page quand les filtres changent
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    search,
    selectedMonth,
    showAllMonths,
    filterCategory,
    filterPayment,
    filterSupplier,
    onlyWithoutReceipt,
    sort,
  ]);

  /* ---------------------------- Calculs ---------------------------- */

  const supplierMap = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach((supplier) => map.set(supplier.id, supplier.name));
    return map;
  }, [suppliers]);

  const sumOf = (list: Expense[]) =>
    list.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const monthTotals = useMemo(() => {
    const totals = new Map<string, number>();
    expenses.forEach((expense) => {
      const key = expense.expense_date?.slice(0, 7);
      if (!key) return;
      totals.set(key, (totals.get(key) ?? 0) + Number(expense.amount || 0));
    });
    return totals;
  }, [expenses]);

  const allTotal = useMemo(() => sumOf(expenses), [expenses]);
  const monthTotal = monthTotals.get(selectedMonth) ?? 0;
  const previousMonthTotal = monthTotals.get(shiftMonth(selectedMonth, -1)) ?? 0;

  const variation =
    !showAllMonths && previousMonthTotal > 0
      ? ((monthTotal - previousMonthTotal) / previousMonthTotal) * 100
      : null;

  const headlineTotal = showAllMonths ? allTotal : monthTotal;

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    const list = expenses.filter((expense) => {
      if (!showAllMonths && !expense.expense_date?.startsWith(selectedMonth)) {
        return false;
      }
      if (filterCategory && expense.category !== filterCategory) return false;
      if (filterPayment && expense.payment_method !== filterPayment) {
        return false;
      }
      if (filterSupplier && expense.supplier_id !== filterSupplier) {
        return false;
      }
      if (onlyWithoutReceipt && expense.receipt_url) return false;

      if (!query) return true;

      const supplierName = expense.supplier_id
        ? supplierMap.get(expense.supplier_id) ?? ""
        : "";

      return (
        expense.title.toLowerCase().includes(query) ||
        categoryLabel(expense.category).toLowerCase().includes(query) ||
        supplierName.toLowerCase().includes(query) ||
        (expense.notes ?? "").toLowerCase().includes(query)
      );
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return (a.expense_date ?? "").localeCompare(b.expense_date ?? "");
        case "amount_desc":
          return Number(b.amount) - Number(a.amount);
        case "amount_asc":
          return Number(a.amount) - Number(b.amount);
        default:
          return (b.expense_date ?? "").localeCompare(a.expense_date ?? "");
      }
    });

    return sorted;
  }, [
    expenses,
    showAllMonths,
    selectedMonth,
    filterCategory,
    filterPayment,
    filterSupplier,
    onlyWithoutReceipt,
    search,
    sort,
    supplierMap,
  ]);

  const totalFiltered = useMemo(
    () => sumOf(filteredExpenses),
    [filteredExpenses]
  );

  // Moyenne par jour (mois sélectionné)
  const dailyAverage = useMemo(() => {
    if (showAllMonths) return null;
    const [year, m] = parseMonth(selectedMonth);
    const days =
      selectedMonth === currentMonth()
        ? new Date().getDate()
        : new Date(year, m, 0).getDate();
    return days > 0 ? monthTotal / days : 0;
  }, [showAllMonths, selectedMonth, monthTotal]);

  // Répartition par catégorie (sur les dépenses filtrées)
  const breakdown = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    filteredExpenses.forEach((expense) => {
      const current = map.get(expense.category) ?? { total: 0, count: 0 };
      current.total += Number(expense.amount || 0);
      current.count += 1;
      map.set(expense.category, current);
    });

    return Array.from(map.entries())
      .map(([value, data]) => ({
        value,
        label: categoryLabel(value),
        total: data.total,
        count: data.count,
        percent: totalFiltered > 0 ? (data.total / totalFiltered) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, totalFiltered]);

  const topCategory = breakdown[0];

  // Tendance sur 6 mois
  const trend = useMemo(() => {
    const base = showAllMonths ? currentMonth() : selectedMonth;
    const months = Array.from({ length: 6 }, (_, index) =>
      shiftMonth(base, index - 5)
    );
    const values = months.map((month) => ({
      month,
      total: monthTotals.get(month) ?? 0,
    }));
    const max = Math.max(...values.map((item) => item.total), 1);
    return { values, max };
  }, [monthTotals, selectedMonth, showAllMonths]);

  // Budget
  const budgetPercent =
    budget > 0 ? Math.min((monthTotal / budget) * 100, 100) : 0;
  const budgetRatio = budget > 0 ? monthTotal / budget : 0;
  const budgetColor =
    budgetRatio >= 1 ? "#EF4444" : budgetRatio >= 0.8 ? "#F59E0B" : ACCENT;

  // Liste paginée et groupée par jour
  const visibleExpenses = filteredExpenses.slice(0, visibleCount);
  const groupByDay = sort === "date_desc" || sort === "date_asc";

  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((expense) => {
      const key = expense.expense_date ?? "";
      map.set(key, (map.get(key) ?? 0) + Number(expense.amount || 0));
    });
    return map;
  }, [filteredExpenses]);

  const groups = useMemo(() => {
    if (!groupByDay) {
      return [{ key: "all", label: "", total: 0, items: visibleExpenses }];
    }

    const result: {
      key: string;
      label: string;
      total: number;
      items: Expense[];
    }[] = [];

    visibleExpenses.forEach((expense) => {
      const key = expense.expense_date ?? "";
      let group = result.find((item) => item.key === key);
      if (!group) {
        group = {
          key,
          label: formatDayHeader(key),
          total: dayTotals.get(key) ?? 0,
          items: [],
        };
        result.push(group);
      }
      group.items.push(expense);
    });

    return result;
  }, [visibleExpenses, groupByDay, dayTotals]);

  const activeFilters = [
    search.trim() !== "",
    filterCategory !== "",
    filterPayment !== "",
    filterSupplier !== "",
    onlyWithoutReceipt,
  ].filter(Boolean).length;

  /* ---------------------------- Actions ---------------------------- */

  function resetFilters() {
    setSearch("");
    setFilterCategory("");
    setFilterPayment("");
    setFilterSupplier("");
    setOnlyWithoutReceipt(false);
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setModalOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditingId(expense.id);
    setForm({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      expenseDate: expense.expense_date,
      paymentMethod: expense.payment_method,
      supplierId: expense.supplier_id ?? "",
      receiptUrl: expense.receipt_url ?? "",
      notes: expense.notes ?? "",
    });
    setError("");
    setModalOpen(true);
  }

  function openDuplicate(expense: Expense) {
    setEditingId(null);
    setForm({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      expenseDate: todayISO(),
      paymentMethod: expense.payment_method,
      supplierId: expense.supplier_id ?? "",
      receiptUrl: "",
      notes: expense.notes ?? "",
    });
    setError("");
    setModalOpen(true);
  }

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const numericAmount = Number(form.amount.replace(",", "."));

    if (!form.title.trim()) {
      setError("Saisis le nom de la dépense.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Saisis un montant supérieur à zéro.");
      return;
    }

    if (!form.expenseDate) {
      setError("Choisis la date de la dépense.");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      category: form.category,
      amount: numericAmount,
      expense_date: form.expenseDate,
      payment_method: form.paymentMethod,
      supplier_id: form.supplierId || null,
      receipt_url: form.receiptUrl.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", editingId);

        if (updateError) throw updateError;
        setSuccess("Dépense modifiée avec succès.");
      } else {
        const { error: insertError } = await supabase
          .from("expenses")
          .insert(payload);

        if (insertError) throw insertError;
        setSuccess("Dépense enregistrée avec succès.");
      }

      // On se place sur le mois de la dépense pour la voir tout de suite
      if (!showAllMonths) setSelectedMonth(form.expenseDate.slice(0, 7));

      closeModal();
      await loadData(false);
    } catch (err) {
      console.error(err);
      setError(
        "Enregistrement impossible. Vérifie les droits Supabase et les champs saisis."
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", toDelete.id);

    setDeleting(false);

    if (deleteError) {
      console.error(deleteError);
      setError("Impossible de supprimer cette dépense.");
      setToDelete(null);
      return;
    }

    setExpenses((previous) =>
      previous.filter((item) => item.id !== toDelete.id)
    );
    setToDelete(null);
    setSuccess("Dépense supprimée.");
  }

  function saveBudget() {
    const value = Number(budgetDraft.replace(",", "."));
    const next = Number.isFinite(value) && value > 0 ? value : 0;

    setBudget(next);
    setBudgetEditing(false);

    try {
      if (next > 0) window.localStorage.setItem(BUDGET_KEY, String(next));
      else window.localStorage.removeItem(BUDGET_KEY);
    } catch {
      /* stockage indisponible : on ignore */
    }
  }

  function exportCsv() {
    if (filteredExpenses.length === 0) return;

    const header = [
      "Date",
      "Nom",
      "Catégorie",
      "Montant (DA)",
      "Paiement",
      "Fournisseur",
      "Notes",
      "Lien du reçu",
    ];

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const rows = filteredExpenses.map((expense) => [
      expense.expense_date ?? "",
      expense.title,
      categoryLabel(expense.category),
      String(expense.amount).replace(".", ","),
      paymentLabel(expense.payment_method),
      expense.supplier_id ? supplierMap.get(expense.supplier_id) ?? "" : "",
      expense.notes ?? "",
      expense.receipt_url ?? "",
    ]);

    const csv =
      "\uFEFF" +
      [header, ...rows]
        .map((row) => row.map((cell) => escape(String(cell))).join(";"))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `depenses-qahwa-${showAllMonths ? "toutes" : selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /* ---------------------------- Rendu ---------------------------- */

  return (
    <main className="min-w-0 space-y-6 pb-10 text-white">
      {/* En-tête */}
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            Gestion financière
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Comptabilité
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Suis les dépenses et les sorties d’argent de Qahwa.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className={ghostButton}
          >
            ↻ Actualiser
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredExpenses.length === 0}
            className={ghostButton}
          >
            ↓ Exporter (CSV)
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl px-5 py-3 text-sm font-bold text-black transition hover:brightness-110"
            style={{ backgroundColor: ACCENT }}
          >
            + Nouvelle dépense
          </button>
        </div>
      </header>

      {/* Messages */}
      {error && !modalOpen && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Masquer le message"
            className="text-red-300/70 hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          {success}
        </div>
      )}

      {/* Sélecteur de mois */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
            disabled={showAllMonths}
            aria-label="Mois précédent"
            className="rounded-xl border border-white/10 bg-[#1B1B1B] px-4 py-2.5 text-lg leading-none transition hover:bg-white/10 disabled:opacity-30"
          >
            ‹
          </button>

          <div className="min-w-[10rem] rounded-xl border border-white/10 bg-[#1B1B1B] px-4 py-2.5 text-center text-sm font-semibold">
            {showAllMonths ? "Toutes les périodes" : monthLabel(selectedMonth)}
          </div>

          <button
            type="button"
            onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
            disabled={showAllMonths}
            aria-label="Mois suivant"
            className="rounded-xl border border-white/10 bg-[#1B1B1B] px-4 py-2.5 text-lg leading-none transition hover:bg-white/10 disabled:opacity-30"
          >
            ›
          </button>

          {!showAllMonths && selectedMonth !== currentMonth() && (
            <button
              type="button"
              onClick={() => setSelectedMonth(currentMonth())}
              className="rounded-xl px-3 py-2.5 text-xs font-semibold text-white/60 underline underline-offset-4 hover:text-white"
            >
              Ce mois-ci
            </button>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={showAllMonths}
            onChange={(event) => setShowAllMonths(event.target.checked)}
            className="h-4 w-4 accent-[#FF6B00]"
          />
          Afficher tous les mois
        </label>
      </section>

      {/* Indicateurs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={
            showAllMonths
              ? "Total de toutes les dépenses"
              : `Dépenses de ${monthLabel(selectedMonth).toLowerCase()}`
          }
          value={formatMoney(headlineTotal)}
          footer={
            variation === null
              ? showAllMonths
                ? `${expenses.length} dépense(s) enregistrée(s)`
                : "Pas de mois précédent à comparer"
              : `Mois précédent : ${formatMoney(previousMonthTotal)}`
          }
          badge={
            variation !== null && (
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  variation > 0
                    ? "bg-red-500/15 text-red-300"
                    : variation < 0
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-white/10 text-white/60"
                }`}
              >
                {variation > 0 ? "▲" : variation < 0 ? "▼" : "="}{" "}
                {Math.abs(variation).toFixed(0)} %
              </span>
            )
          }
        />

        <StatCard
          label="Total selon les filtres"
          value={formatMoney(totalFiltered)}
          footer={`${filteredExpenses.length} dépense(s) affichée(s)`}
        />

        <StatCard
          label={showAllMonths ? "Dépense moyenne" : "Moyenne par jour"}
          value={formatMoney(
            showAllMonths
              ? expenses.length > 0
                ? allTotal / expenses.length
                : 0
              : (dailyAverage ?? 0)
          )}
          footer={
            showAllMonths ? "Par dépense enregistrée" : "Sur le mois sélectionné"
          }
        />

        <StatCard
          label="Catégorie principale"
          value={topCategory ? topCategory.label : "—"}
          footer={
            topCategory
              ? `${formatMoney(topCategory.total)} · ${topCategory.percent.toFixed(0)} %`
              : "Aucune dépense dans la sélection"
          }
        />
      </section>

      {/* Budget mensuel */}
      <section className={`${panelClass} p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold">Budget mensuel</h2>
            <p className="mt-1 text-xs text-white/40">
              Fixe une limite de dépenses et suis ta consommation. Enregistré
              sur cet appareil.
            </p>
          </div>

          {budgetEditing ? (
            <div className="flex w-full gap-2 sm:w-auto">
              <input
                className={`${inputClass} sm:w-44`}
                type="number"
                min="0"
                step="100"
                inputMode="decimal"
                value={budgetDraft}
                onChange={(event) => setBudgetDraft(event.target.value)}
                placeholder="Ex. 150000"
                autoFocus
              />
              <button
                type="button"
                onClick={saveBudget}
                className="rounded-xl px-4 py-3 text-sm font-bold text-black"
                style={{ backgroundColor: ACCENT }}
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setBudgetEditing(false)}
                className="rounded-xl border border-white/15 px-4 py-3 text-sm text-white/70 hover:bg-white/10"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setBudgetDraft(budget > 0 ? String(budget) : "");
                setBudgetEditing(true);
              }}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
            >
              {budget > 0 ? "Modifier le budget" : "Définir un budget"}
            </button>
          )}
        </div>

        {budget > 0 && (
          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="text-white/70">
                {formatMoney(monthTotal)} sur {formatMoney(budget)} ·{" "}
                {monthLabel(selectedMonth).toLowerCase()}
              </span>
              <span
                className="font-semibold"
                style={{ color: budgetColor }}
              >
                {budgetRatio >= 1
                  ? `Dépassé de ${formatMoney(monthTotal - budget)}`
                  : `Reste ${formatMoney(budget - monthTotal)}`}
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${budgetPercent}%`,
                  backgroundColor: budgetColor,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-white/40">
              {(budgetRatio * 100).toFixed(0)} % du budget utilisé
            </p>
          </div>
        )}
      </section>

      {/* Graphiques */}
      <section className="grid gap-4 lg:grid-cols-5">
        <div className={`${panelClass} p-5 lg:col-span-3`}>
          <h2 className="text-base font-bold">Évolution sur 6 mois</h2>
          <p className="mt-1 text-xs text-white/40">
            Clique sur une barre pour afficher ce mois.
          </p>

          <div className="mt-6 flex h-44 items-end gap-2 sm:gap-4">
            {trend.values.map((item) => {
              const selected = !showAllMonths && item.month === selectedMonth;
              const height = Math.max((item.total / trend.max) * 100, 3);

              return (
                <button
                  key={item.month}
                  type="button"
                  onClick={() => {
                    setShowAllMonths(false);
                    setSelectedMonth(item.month);
                  }}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                  title={`${monthLabel(item.month)} : ${formatMoney(item.total)}`}
                >
                  <span className="text-[10px] font-medium text-white/50 sm:text-xs">
                    {item.total > 0
                      ? new Intl.NumberFormat("fr-FR", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(item.total)
                      : ""}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg transition-all duration-500 group-hover:brightness-125"
                      style={{
                        height: `${height}%`,
                        backgroundColor: selected
                          ? ACCENT
                          : "rgba(255,255,255,0.18)",
                      }}
                    />
                  </div>
                  <span
                    className={`text-xs capitalize ${
                      selected ? "font-bold text-white" : "text-white/45"
                    }`}
                  >
                    {shortMonthLabel(item.month)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${panelClass} p-5 lg:col-span-2`}>
          <h2 className="text-base font-bold">Répartition par catégorie</h2>
          <p className="mt-1 text-xs text-white/40">
            Clique sur une catégorie pour filtrer la liste.
          </p>

          {breakdown.length === 0 ? (
            <p className="mt-8 text-center text-sm text-white/40">
              Aucune donnée à afficher.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {breakdown.slice(0, 6).map((item) => {
                const active = filterCategory === item.value;

                return (
                  <li key={item.value}>
                    <button
                      type="button"
                      onClick={() =>
                        setFilterCategory(active ? "" : item.value)
                      }
                      className="block w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span
                          className={
                            active ? "font-bold text-white" : "text-white/75"
                          }
                        >
                          {item.label}
                        </span>
                        <span className="whitespace-nowrap text-xs text-white/50">
                          {formatMoney(item.total)} ·{" "}
                          {item.percent.toFixed(0)} %
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percent}%`,
                            backgroundColor: active
                              ? ACCENT
                              : "rgba(255,255,255,0.55)",
                          }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {breakdown.length > 6 && (
            <p className="mt-4 text-xs text-white/35">
              + {breakdown.length - 6} autre(s) catégorie(s)
            </p>
          )}
        </div>
      </section>

      {/* Historique */}
      <section className={`${panelClass} overflow-hidden`}>
        <div className="space-y-4 border-b border-white/10 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold">Historique des dépenses</h2>
              <p className="mt-1 text-sm text-white/45">
                Recherche, filtre et consulte les dépenses enregistrées.
              </p>
            </div>

            {activeFilters > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="self-start rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 sm:self-auto"
              >
                Réinitialiser les filtres ({activeFilters})
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className={`${inputClass} sm:col-span-2 lg:col-span-4`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par nom, catégorie, fournisseur ou note..."
            />

            <select
              className={inputClass}
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
              aria-label="Filtrer par catégorie"
            >
              <option value="">Toutes les catégories</option>
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              className={inputClass}
              value={filterPayment}
              onChange={(event) => setFilterPayment(event.target.value)}
              aria-label="Filtrer par mode de paiement"
            >
              <option value="">Tous les paiements</option>
              {PAYMENT_METHODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              className={inputClass}
              value={filterSupplier}
              onChange={(event) => setFilterSupplier(event.target.value)}
              aria-label="Filtrer par fournisseur"
            >
              <option value="">Tous les fournisseurs</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>

            <select
              className={inputClass}
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Trier les dépenses"
            >
              {SORT_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={onlyWithoutReceipt}
              onChange={(event) => setOnlyWithoutReceipt(event.target.checked)}
              className="h-4 w-4 accent-[#FF6B00]"
            />
            Afficher seulement les dépenses sans reçu
          </label>
        </div>

        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse p-5">
                <div className="h-4 w-1/3 rounded bg-white/10" />
                <div className="mt-3 h-3 w-1/2 rounded bg-white/5" />
              </div>
            ))}
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl">
              —
            </div>
            <p className="mt-4 font-semibold">Aucune dépense trouvée</p>
            <p className="mt-2 text-sm text-white/45">
              {activeFilters > 0
                ? "Modifie ou réinitialise les filtres."
                : "Enregistre ta première dépense pour cette période."}
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-5 rounded-xl px-5 py-3 text-sm font-bold text-black"
              style={{ backgroundColor: ACCENT }}
            >
              + Nouvelle dépense
            </button>
          </div>
        ) : (
          <>
            <div>
              {groups.map((group) => (
                <div key={group.key}>
                  {groupByDay && (
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-5 py-2.5 sm:px-6">
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                        {group.label}
                      </span>
                      <span className="text-xs font-semibold text-white/55">
                        {formatMoney(group.total)}
                      </span>
                    </div>
                  )}

                  <div className="divide-y divide-white/10">
                    {group.items.map((expense) => {
                      const supplierName = expense.supplier_id
                        ? supplierMap.get(expense.supplier_id)
                        : undefined;

                      return (
                        <article
                          key={expense.id}
                          className="flex flex-col gap-4 p-5 transition hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{expense.title}</h3>
                              <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/65">
                                {categoryLabel(expense.category)}
                              </span>
                              {!expense.receipt_url && (
                                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300/80">
                                  Sans reçu
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
                              {!groupByDay && (
                                <span>{formatDate(expense.expense_date)}</span>
                              )}
                              <span>{paymentLabel(expense.payment_method)}</span>
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

                          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                            <p className="whitespace-nowrap text-lg font-bold">
                              {formatMoney(Number(expense.amount))}
                            </p>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(expense)}
                                aria-label={`Modifier ${expense.title}`}
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => openDuplicate(expense)}
                                aria-label={`Dupliquer ${expense.title}`}
                                title="Créer une nouvelle dépense à partir de celle-ci"
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                              >
                                Dupliquer
                              </button>
                              <button
                                type="button"
                                onClick={() => setToDelete(expense)}
                                aria-label={`Supprimer ${expense.title}`}
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {filteredExpenses.length > visibleCount && (
              <div className="border-t border-white/10 p-4 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className={ghostButton}
                >
                  Afficher plus ({filteredExpenses.length - visibleCount}{" "}
                  restante(s))
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-white/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="text-sm text-white/50">
                Total des dépenses affichées ({filteredExpenses.length})
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
        fournisseurs détaillés, les mouvements de stock et le calcul des marges
        seront reliés dans les prochaines étapes. Ce total ne représente pas à
        lui seul le bénéfice réel de Qahwa.
      </p>

      {/* Fenêtre : ajout / modification */}
      {modalOpen && (
        <Modal
          title={editingId ? "Modifier la dépense" : "Nouvelle dépense"}
          subtitle="Enregistre un achat, une facture ou une autre sortie d’argent."
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nom de la dépense *">
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    placeholder="Ex. Facture d'électricité"
                    maxLength={150}
                    required
                    autoFocus
                  />
                </Field>
              </div>

              <Field label="Montant en DA *">
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) => updateForm("amount", event.target.value)}
                  placeholder="Ex. 2500"
                  required
                />
              </Field>

              <Field label="Date *">
                <input
                  className={inputClass}
                  type="date"
                  value={form.expenseDate}
                  onChange={(event) =>
                    updateForm("expenseDate", event.target.value)
                  }
                  required
                />
              </Field>

              <Field label="Catégorie *">
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(event) =>
                    updateForm("category", event.target.value)
                  }
                  required
                >
                  {CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Mode de paiement">
                <select
                  className={inputClass}
                  value={form.paymentMethod}
                  onChange={(event) =>
                    updateForm("paymentMethod", event.target.value)
                  }
                >
                  {PAYMENT_METHODS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <Field label="Fournisseur (facultatif)">
                  <select
                    className={inputClass}
                    value={form.supplierId}
                    onChange={(event) =>
                      updateForm("supplierId", event.target.value)
                    }
                  >
                    <option value="">Aucun fournisseur</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field
                  label="Lien vers la facture ou le reçu (facultatif)"
                  hint="Pour le moment, ajoute un lien accessible vers le document."
                >
                  <input
                    className={inputClass}
                    type="url"
                    value={form.receiptUrl}
                    onChange={(event) =>
                      updateForm("receiptUrl", event.target.value)
                    }
                    placeholder="https://..."
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Notes (facultatif)">
                  <textarea
                    className={`${inputClass} min-h-[90px] resize-y`}
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    placeholder="Détails supplémentaires..."
                    maxLength={2000}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className={ghostButton}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl px-6 py-3 font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                {saving
                  ? "Enregistrement..."
                  : editingId
                    ? "Enregistrer les modifications"
                    : "Enregistrer la dépense"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Fenêtre : confirmation de suppression */}
      {toDelete && (
        <Modal
          title="Supprimer cette dépense ?"
          subtitle="Cette action est définitive."
          onClose={() => (deleting ? undefined : setToDelete(null))}
          size="sm"
        >
          <div className="rounded-xl border border-white/10 bg-[#111111] p-4">
            <p className="font-semibold">{toDelete.title}</p>
            <p className="mt-1 text-sm text-white/50">
              {formatDate(toDelete.expense_date)} ·{" "}
              {formatMoney(Number(toDelete.amount))}
            </p>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setToDelete(null)}
              disabled={deleting}
              className={ghostButton}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className="rounded-xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
