import { SetMetadata } from "@nestjs/common";
import { IS_PUBLIC_KEY, REQUIRED_PERMISSIONS_KEY, REQUIRED_SCOPE_KEY } from "./auth.constants.js";
import type { ScopeRequirement } from "./auth.types.js";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const RequirePermissions = (...permissionCodes: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissionCodes);

export const RequireScope = (requirement: ScopeRequirement) =>
  SetMetadata(REQUIRED_SCOPE_KEY, requirement);
