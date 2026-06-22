export function sar(value: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function dateLabel(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-SA") : "—";
}
