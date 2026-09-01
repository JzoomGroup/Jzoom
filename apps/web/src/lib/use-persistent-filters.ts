"use client";

import { useEffect, useState } from "react";

export function usePersistentFilters<T extends Record<string, string>>(
  storageKey: string,
  initialValue: T,
) {
  const [filters, setFilters] = useState<T>(initialValue);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<T>;
        setFilters((current) => ({ ...current, ...parsed }));
      }
    } catch {
      window.sessionStorage.removeItem(storageKey);
    } finally {
      setRestored(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!restored) return;
    window.sessionStorage.setItem(storageKey, JSON.stringify(filters));
  }, [filters, restored, storageKey]);

  function resetFilters() {
    window.sessionStorage.removeItem(storageKey);
    setFilters(initialValue);
  }

  return { filters, resetFilters, restored, setFilters };
}
