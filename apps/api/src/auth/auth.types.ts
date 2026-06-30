import type { ApiEnvironment } from "@jzoom/config";

export interface AuthRuntimeEnvironment {
  nodeEnvironment: ApiEnvironment["nodeEnvironment"];
  auth: ApiEnvironment["auth"];
}

export interface PrincipalScope {
  type: "OWN_CLIENT" | "ASSIGNED_CLIENTS" | "ASSIGNED_WORK" | "TEAM_DOMAIN" | "GLOBAL";
  clientId?: string;
  domain?: string;
  teamCode?: string;
}

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
  sessionVersion: number;
  csrfTokenHash: string;
  email: string;
  displayName: string;
  preferredLocale: string;
  userType: "INTERNAL" | "EXTERNAL";
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
  scopes: PrincipalScope[];
  assignedClientIds: string[];
}

export interface RequestMetadata {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IssuedSession {
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
  principal: AuthenticatedPrincipal;
}

export type ScopeRequirement =
  | { type: "GLOBAL" }
  | { type: "CLIENT"; clientParam?: string }
  | { type: "ASSIGNED_WORK"; requestParam?: string; projectParam?: string }
  | { type: "TEAM_DOMAIN"; domainParam?: string; teamParam?: string };
