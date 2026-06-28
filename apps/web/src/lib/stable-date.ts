const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function riyadhDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getTime() + RIYADH_OFFSET_MS);
}

export function formatRiyadhDateTime(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = riyadhDate(value);
  if (!date) {
    return "Not set";
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour24 = date.getUTCHours();
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? "PM" : "AM";

  return `${month}/${day}/${year}, ${hour12}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds(),
  )} ${period}`;
}

export function riyadhDateInputValue(value: Date = new Date()): string {
  const date = riyadhDate(value);
  if (!date) {
    return "";
  }

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
