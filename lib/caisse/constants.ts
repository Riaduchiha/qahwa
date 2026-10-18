export type View = "encaissements" | "commandes" | "livraison";
export type NoticeType = "success" | "error" | "info";
export type OrderFilter = "actives" | "a_confirmer" | "terminees" | "toutes";

export const ACTIVE_STATUSES: readonly string[] = [
  "recue",
  "preparation",
  "prete",
  "servi",
  "livraison",
];

export const FINISHED_STATUSES: readonly string[] = [
  "livree",
  "refusee",
  "annulee",
];

export const CASH_NOTES = [200, 500, 1000, 2000];

export const MAX_TABLES = 22;

export const STATUS_LABELS: Record<string, string> = {
  recue: "À confirmer",
  preparation: "En préparation",
  prete: "Prête",
  servi: "Servie",
  livraison: "En livraison",
  livree: "Terminée",
  refusee: "Refusée",
  annulee: "Annulée",
};
