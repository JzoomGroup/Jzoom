export const AUTH_ENVIRONMENT = Symbol("AUTH_ENVIRONMENT");
export const IS_PUBLIC_KEY = "jzoom.auth.public";
export const REQUIRED_PERMISSIONS_KEY = "jzoom.auth.permissions";
export const REQUIRED_ROLES_KEY = "jzoom.auth.roles";
export const REQUIRED_SCOPE_KEY = "jzoom.auth.scope";

export const ADMIN_ROLE_CODE = "ROLE-ADMIN";
export const MANAGEMENT_ROLE_CODE = "ROLE-MGMT";
export const MANAGE_USERS_PERMISSION = "PERM-MANAGE-USERS";
export const MODIFY_PERMISSIONS_PERMISSION = "PERM-MODIFY-USER-PERMISSIONS";
export const CRITICAL_ADMIN_PERMISSIONS = [
  MANAGE_USERS_PERMISSION,
  MODIFY_PERMISSIONS_PERMISSION,
] as const;
