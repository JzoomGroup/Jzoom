"use client";

import { catalogRequest } from "./catalog-client";
import type { OneTimeCatalogExport, OneTimeCatalogSnapshot } from "./one-time-catalog-types";

export function refreshOneTimeCatalog(): Promise<OneTimeCatalogSnapshot> {
  return catalogRequest<OneTimeCatalogSnapshot>("admin/catalog/one-time");
}

export function exportOneTimeCatalog(): Promise<OneTimeCatalogExport> {
  return catalogRequest<OneTimeCatalogExport>("services/one-time/export");
}

export function importOneTimeCatalog(input: unknown): Promise<OneTimeCatalogSnapshot> {
  return catalogRequest<OneTimeCatalogSnapshot>("services/one-time/import", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
