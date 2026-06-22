"use client";

import { catalogRequest } from "./catalog-client";
import type { OneTimeCatalogSnapshot } from "./one-time-catalog-types";

export function refreshOneTimeCatalog(): Promise<OneTimeCatalogSnapshot> {
  return catalogRequest<OneTimeCatalogSnapshot>("admin/catalog/one-time");
}
