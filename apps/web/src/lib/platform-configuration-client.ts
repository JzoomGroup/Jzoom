"use client";

import { catalogErrorMessage, catalogRequest } from "./catalog-client";
import type { PlatformConfigurationSnapshot } from "./platform-configuration-types";

export const platformConfigurationErrorMessage = catalogErrorMessage;

export function refreshPlatformConfiguration(): Promise<PlatformConfigurationSnapshot> {
  return catalogRequest<PlatformConfigurationSnapshot>("admin/platform-configuration");
}

export function createPlatformSetting(input: Record<string, unknown>) {
  return catalogRequest<PlatformConfigurationSnapshot>("admin/platform-configuration/settings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revisePlatformSetting(key: string, input: Record<string, unknown>) {
  return catalogRequest<PlatformConfigurationSnapshot>(
    `admin/platform-configuration/settings/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export function reviseNotificationTemplate(id: string, input: Record<string, unknown>) {
  return catalogRequest<PlatformConfigurationSnapshot>(
    `admin/platform-configuration/notifications/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export function revisePdfTemplate(id: string, input: Record<string, unknown>) {
  return catalogRequest<PlatformConfigurationSnapshot>(`admin/platform-configuration/pdfs/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function publishTranslations(input: Record<string, unknown>) {
  return catalogRequest<PlatformConfigurationSnapshot>(
    "admin/platform-configuration/localization/publish",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function reviseWorkflowTemplate(id: string, input: Record<string, unknown>) {
  return catalogRequest<PlatformConfigurationSnapshot>(
    `admin/platform-configuration/workflows/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}
