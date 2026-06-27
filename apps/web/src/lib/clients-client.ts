"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type { ClientsSnapshot } from "./clients-types";

export function refreshClients(): Promise<ClientsSnapshot> {
  return catalogRequest<ClientsSnapshot>("admin/clients");
}

export { catalogRequest as clientsRequest, catalogErrorMessage as clientsErrorMessage };
