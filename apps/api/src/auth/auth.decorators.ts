import { SetMetadata } from "@nestjs/common";
import {
  ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
  REQUIRED_ROLES_KEY,
  REQUIRED_SCOPE_KEY,
} from "./auth.constants.js";
import type { ScopeRequirement } from "./auth.types.js";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const AllowPasswordChangeRequired = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_REQUIRED_KEY, true);

export const RequirePermissions = (...permissionCodes: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissionCodes);

export const RequireRoles = (...roleCodes: string[]) => SetMetadata(REQUIRED_ROLES_KEY, roleCodes);

export const RequireScope = (requirement: ScopeRequirement) =>
  SetMetadata(REQUIRED_SCOPE_KEY, requirement);
