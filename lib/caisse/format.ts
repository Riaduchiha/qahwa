export const money = (value: number | string | null | undefined) =>
  `${Number(value ?? 0).toLocaleString("fr-FR")} DA`;
