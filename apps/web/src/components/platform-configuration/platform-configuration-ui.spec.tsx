import { render, screen } from "@testing-library/react";
import type { PlatformConfigurationSnapshot } from "../../lib/platform-configuration-types";
import { PlatformConfigurationManager } from "./platform-configuration-manager";

function snapshot(): PlatformConfigurationSnapshot {
  return {
    settingValueTypes: ["STRING", "NUMBER", "BOOLEAN", "JSON", "SECRET_REFERENCE"],
    revisionStatuses: ["DRAFT", "ACTIVE", "ARCHIVED"],
    translationStatuses: ["DRAFT", "PUBLISHED", "ARCHIVED"],
    settings: [
      {
        id: "setting-1",
        key: "platform.name",
        category: "platform",
        valueType: "STRING",
        isSensitive: false,
        status: "ACTIVE",
        sortOrder: 0,
        current: {
          id: "setting-revision-1",
          version: 1,
          status: "ACTIVE",
          value: "Jzoom Operating Platform",
          masked: false,
          reason: null,
          effectiveFrom: "2026-06-23T00:00:00.000Z",
          effectiveTo: null,
        },
        revisionCount: 1,
        updatedAt: "2026-06-23T00:00:00.000Z",
      },
      {
        id: "setting-2",
        key: "pricing.tax.default_pct",
        category: "pricing",
        valueType: "NUMBER",
        isSensitive: false,
        status: "ACTIVE",
        sortOrder: 1,
        current: {
          id: "setting-revision-2",
          version: 1,
          status: "ACTIVE",
          value: 15,
          masked: false,
          reason: "Default VAT",
          effectiveFrom: "2026-06-23T00:00:00.000Z",
          effectiveTo: null,
        },
        revisionCount: 1,
        updatedAt: "2026-06-23T00:00:00.000Z",
      },
    ],
    notificationTemplates: [
      {
        id: "notification-1",
        code: "REQUEST_OUTPUT_SHARED",
        event: "REQUEST_OUTPUT_SHARED_WITH_CLIENT",
        status: "ACTIVE",
        sortOrder: 0,
        current: {
          id: "notification-version-1",
          version: 1,
          status: "ACTIVE",
          recipients: ["client"],
          messageAr: "تمت مشاركة مخرج جديد.",
          messageEn: "A new output is ready.",
          description: "Client output notification",
          deepLink: "/client/requests",
          channels: ["inApp"],
          cadence: null,
          reminderRule: null,
          placeholders: { requestNumber: "REQ-1" },
          effectiveFrom: "2026-06-23T00:00:00.000Z",
          effectiveTo: null,
        },
        revisionCount: 1,
        updatedAt: "2026-06-23T00:00:00.000Z",
      },
    ],
    pdfTemplates: [
      {
        id: "pdf-1",
        code: "QUOTE",
        name: "Quote PDF",
        documentType: "QUOTE",
        status: "ACTIVE",
        sortOrder: 0,
        current: {
          id: "pdf-version-1",
          version: 1,
          status: "ACTIVE",
          audience: "client",
          mustInclude: ["client", "totals"],
          mustExclude: ["internalCosts"],
          languageDirection: "rtl",
          technicalRule: "Use quote snapshot only.",
          contentSchema: { footerNote: "Thank you." },
          fieldMappings: [],
          effectiveFrom: "2026-06-23T00:00:00.000Z",
          effectiveTo: null,
        },
        revisionCount: 1,
        updatedAt: "2026-06-23T00:00:00.000Z",
      },
    ],
    workflows: [
      {
        id: "workflow-1",
        code: "REQUEST",
        name: "Request checklist",
        type: "request",
        status: "ACTIVE",
        sortOrder: 0,
        current: {
          id: "workflow-version-1",
          version: 1,
          status: "ACTIVE",
          configuration: { checklistTemplate: [{ code: "review", label: "Review" }] },
          states: [
            {
              code: "new",
              labelAr: "جديد",
              labelEn: "New",
              isInitial: true,
              isTerminal: false,
            },
          ],
          transitions: [],
          effectiveFrom: "2026-06-23T00:00:00.000Z",
          effectiveTo: null,
        },
        revisionCount: 1,
        updatedAt: "2026-06-23T00:00:00.000Z",
      },
    ],
    localization: { revisions: [] },
  };
}

describe("Admin platform configuration UI", () => {
  it("renders configurable settings, templates, labels, and workflow foundations", () => {
    render(<PlatformConfigurationManager initialSnapshot={snapshot()} />);

    expect(screen.getByRole("heading", { name: "Platform configuration" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create setting" })).toBeInTheDocument();
    expect(screen.getAllByText("platform.name").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { name: "Operating configuration readiness" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Pricing defaults" })).toBeInTheDocument();
    expect(screen.getAllByText("pricing.tax.default_pct").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Configured").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Needs setting").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Notification templates" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PDF template settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Localization labels" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Workflow/checklist templates" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/immutable quote\/invoice snapshots/i).length).toBeGreaterThan(0);
  });
});
