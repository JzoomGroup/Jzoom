import type { ApiEnvironment } from "@jzoom/config";

export interface AuthRuntimeEnvironment {
  nodeEnvironment: ApiEnvironment["nodeEnvironment"];
  deploymentEnvironment: ApiEnvironment["deploymentEnvironment"];
  auth: ApiEnvironment["auth"];
}

export interface UatImpersonator {
  userId: string;
  email: string;
  displayName: string;
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
  impersonation?: UatImpersonator;
}

export interface UatImpersonationUser {
  id: string;
  email: string;
  displayName: string;
  userType: "INTERNAL" | "EXTERNAL";
  roles: Array<{ code: string; name: string }>;
  clients: Array<{ id: string; code: string; name: string }>;
  lastLoginAt: string | null;
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
