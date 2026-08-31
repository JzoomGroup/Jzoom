export type QueryValue = string | string[] | undefined;

export function firstQueryValue(value: QueryValue): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function replaceCurrentUrlQuery(
  values: Record<string, string | undefined>,
  ownedKeys = Object.keys(values),
): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  for (const key of ownedKeys) {
    url.searchParams.delete(key);
  }
  for (const [key, value] of Object.entries(values)) {
    if (value?.trim()) {
      url.searchParams.set(key, value);
    }
  }
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
