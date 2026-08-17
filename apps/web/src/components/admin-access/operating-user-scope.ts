import type {
  CreateOperatingUserPayload,
  OperatingUserScopePayload,
} from "../../lib/admin-access-client";
import type { AdminAccessSetup, AdminAccessUser } from "../../lib/admin-access-types";
import type { SupportedLocale } from "../../lib/i18n";
import { formatCode } from "./admin-access-formatters";

export const emptySetup: AdminAccessSetup = {
  clients: [],
  roles: [],
  monthlyServices: [],
  serviceItems: [],
  oneTimeServices: [],
};

export const operatingRoleLabels: Record<string, Record<SupportedLocale, string>> = {
  "ROLE-ADMIN": { ar: "أدمن", en: "Admin" },
  "ROLE-AM": { ar: "مدير حساب", en: "Account Manager" },
  "ROLE-MGMT": { ar: "الإدارة", en: "Management" },
  "ROLE-SPECIALIST": { ar: "مختص", en: "Specialist" },
  "ROLE-PROJECT-SPECIALIST": { ar: "مختص مشاريع", en: "Project Specialist" },
  "ROLE-SUPERVISOR": { ar: "مشرف", en: "Supervisor" },
};

export function hasRole(user: AdminAccessUser, roleCode: string): boolean {
  return user.roles.some((role) => role.code === roleCode);
}

export function isSpecialistScopeRole(roleCode: string): boolean {
  return roleCode === "ROLE-SPECIALIST" || roleCode === "ROLE-PROJECT-SPECIALIST";
}

export function operatingRoleLabel(roleCode: string, locale: SupportedLocale): string {
  return operatingRoleLabels[roleCode]?.[locale] ?? formatCode(roleCode, locale);
}

export function serviceLabel(
  value: { code: string; nameAr: string; nameEn: string },
  locale: SupportedLocale,
): string {
  const name = locale === "ar" ? value.nameAr : value.nameEn;
  return `${name || value.code} (${value.code})`;
}

export function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

export function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function primaryOperatingRoleCode(user: AdminAccessUser): string | null {
  return user.roles.find((role) => Boolean(operatingRoleLabels[role.code]))?.code ?? null;
}

export function emptyOperatingUserForm(): CreateOperatingUserPayload {
  return {
    clientIds: [],
    displayName: "",
    email: "",
    monthlyServiceIds: [],
    oneTimeServiceIds: [],
    roleCode: "ROLE-SPECIALIST",
    serviceItemIds: [],
    specialistIds: [],
  };
}

export function operatingFormFromUser(user: AdminAccessUser): CreateOperatingUserPayload {
  const roleCode = primaryOperatingRoleCode(user) ?? "ROLE-SPECIALIST";
  return {
    clientIds: uniqueStrings([
      ...user.clientAssignments.map((assignment) => assignment.client.id),
      ...user.specialistServiceScopes.map((scope) => scope.client?.id),
      ...user.assignedSupervisors.map((assignment) => assignment.client?.id),
      ...user.supervisedSpecialists.map((assignment) => assignment.client?.id),
      ...user.scopes.map((scope) => scope.client?.id),
    ]),
    displayName: user.displayName,
    email: user.email,
    monthlyServiceIds: uniqueStrings(
      user.specialistServiceScopes.map((scope) => scope.monthlyService?.id),
    ),
    oneTimeServiceIds: uniqueStrings(
      user.specialistServiceScopes.map((scope) => scope.oneTimeService?.id),
    ),
    roleCode,
    serviceItemIds: uniqueStrings(
      user.specialistServiceScopes.map((scope) => scope.serviceItem?.id),
    ),
    specialistIds: uniqueStrings(
      user.supervisedSpecialists.map((assignment) => assignment.specialist.id),
    ),
    supervisorId: user.assignedSupervisors[0]?.supervisor.id,
  };
}

export function scopePayloadFromForm(
  form: CreateOperatingUserPayload,
  roleCode: string,
): OperatingUserScopePayload {
  return {
    clientIds: form.clientIds,
    monthlyServiceIds: roleCode === "ROLE-SPECIALIST" ? form.monthlyServiceIds : [],
    oneTimeServiceIds: isSpecialistScopeRole(roleCode) ? form.oneTimeServiceIds : [],
    serviceItemIds: roleCode === "ROLE-SPECIALIST" ? form.serviceItemIds : [],
    specialistIds: roleCode === "ROLE-SUPERVISOR" ? form.specialistIds : [],
    ...(isSpecialistScopeRole(roleCode) && form.supervisorId
      ? { supervisorId: form.supervisorId }
      : {}),
  };
}

export function operatingScopeLabels(user: AdminAccessUser, locale: SupportedLocale): string[] {
  const labels: string[] = [];
  for (const assignment of user.clientAssignments) {
    labels.push(`${assignment.client.name} (${assignment.roleCode})`);
  }
  for (const scope of user.specialistServiceScopes) {
    const client = scope.client ? `${scope.client.name} / ` : "";
    if (scope.serviceItem) {
      labels.push(`${client}${serviceLabel(scope.serviceItem, locale)}`);
    } else if (scope.monthlyService) {
      labels.push(`${client}${serviceLabel(scope.monthlyService, locale)}`);
    } else if (scope.oneTimeService) {
      labels.push(`${client}${serviceLabel(scope.oneTimeService, locale)}`);
    }
  }
  for (const assignment of user.assignedSupervisors) {
    labels.push(
      locale === "ar"
        ? `مشرف: ${assignment.supervisor.displayName}`
        : `Supervisor: ${assignment.supervisor.displayName}`,
    );
  }
  for (const assignment of user.supervisedSpecialists) {
    labels.push(
      locale === "ar"
        ? `مختص: ${assignment.specialist.displayName}`
        : `Specialist: ${assignment.specialist.displayName}`,
    );
  }
  return labels;
}
