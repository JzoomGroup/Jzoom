export const AUTH_ENVIRONMENT = Symbol("AUTH_ENVIRONMENT");
export const IS_PUBLIC_KEY = "jzoom.auth.public";
export const ALLOW_PASSWORD_CHANGE_REQUIRED_KEY = "jzoom.auth.allow_password_change_required";
export const REQUIRED_PERMISSIONS_KEY = "jzoom.auth.permissions";
export const REQUIRED_ROLES_KEY = "jzoom.auth.roles";
export const REQUIRED_SCOPE_KEY = "jzoom.auth.scope";

export const ADMIN_ROLE_CODE = "ROLE-ADMIN";
export const MANAGEMENT_ROLE_CODE = "ROLE-MGMT";
export const MANAGE_USERS_PERMISSION = "PERM-MANAGE-USERS";
export const MODIFY_PERMISSIONS_PERMISSION = "PERM-MODIFY-USER-PERMISSIONS";
export const PROJECT_SPECIALIST_ROLE_CODE = "ROLE-PROJECT-SPECIALIST";
export const DEFAULT_TEMPORARY_PASSWORD = "AbC#12345678";
export const CRITICAL_ADMIN_PERMISSIONS = [
  MANAGE_USERS_PERMISSION,
  MODIFY_PERMISSIONS_PERMISSION,
] as const;
