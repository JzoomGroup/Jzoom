export type ClientStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface ManagedClient {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  commercialRegistration: string | null;
  sector: string;
  city: string | null;
  employeesCount: number;
  branchesCount: number;
  transactionVolume: string | null;
  operationalComplexity: string | null;
  dataReadiness: string | null;
  urgency: string | null;
  billingContact: string | null;
  authorizedApprover: string;
  status: ClientStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts: {
    assignments: number;
    contacts: number;
    quotes: number;
    requests: number;
  };
  users: ManagedClientUser[];
}

export interface ClientsSnapshot {
  clients: ManagedClient[];
}

export interface ManagedClientUser {
  id: string;
  email: string;
  displayName: string;
  status: "INVITED" | "ACTIVE" | "DISABLED" | "ARCHIVED";
  roleCode: string;
  startsAt: string;
  endsAt: string | null;
}
