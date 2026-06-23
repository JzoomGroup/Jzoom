import "reflect-metadata";
import { jest } from "@jest/globals";
import type { AuthAuditService } from "../src/auth/audit.service.js";
import type { AuthenticatedPrincipal } from "../src/auth/auth.types.js";
import type { DatabaseService } from "../src/database/database.service.js";
import { HoursLedgerService } from "../src/hours-ledger/hours-ledger.service.js";

function principal(overrides: Partial<AuthenticatedPrincipal> = {}): AuthenticatedPrincipal {
  return {
    userId: "26473c00-5e47-49ec-92fd-583d11b2323f",
    sessionId: "8bebfd84-568f-4ca0-b0cf-06a7fd788e26",
    sessionVersion: 1,
    csrfTokenHash: "hash",
    email: "user@example.com",
    displayName: "User",
    preferredLocale: "en",
    userType: "INTERNAL",
    roles: ["ROLE-ADMIN"],
    permissions: [],
    scopes: [],
    assignedClientIds: [],
    ...overrides,
  };
}

function ledgerEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "time-1",
    requestId: "request-1",
    userId: "specialist-1",
    projectId: null,
    outputId: null,
    hours: 3,
    billable: true,
    deductHours: true,
    status: "APPROVED",
    workDate: new Date("2026-06-10T00:00:00.000Z"),
    notes: null,
    decisionReason: "approved",
    submittedAt: new Date("2026-06-10T10:00:00.000Z"),
    decidedAt: new Date("2026-06-11T10:00:00.000Z"),
    decidedById: "supervisor-1",
    createdAt: new Date("2026-06-10T10:00:00.000Z"),
    updatedAt: new Date("2026-06-11T10:00:00.000Z"),
    user: { id: "specialist-1", email: "sp@example.com", displayName: "Specialist One" },
    decidedBy: { id: "supervisor-1", email: "sv@example.com", displayName: "Supervisor" },
    request: {
      id: "request-1",
      requestNumber: "REQ-1",
      title: "Monthly service request",
      status: "IN_PROGRESS",
      priority: "NORMAL",
      clientId: "client-1",
      assignedSpecialistId: "specialist-1",
      assignedSupervisorId: "supervisor-1",
      accountManagerId: "am-1",
      client: {
        id: "client-1",
        code: "CLIENT-1",
        name: "Client One",
        sector: "Technology",
        city: "Riyadh",
      },
      subscriptionService: {
        id: "subscription-service-1",
        hoursAllocated: 20,
        monthlyServiceRevision: {
          id: "monthly-service-revision-1",
          nameAr: "خدمة شهرية",
          nameEn: "Monthly service",
          monthlyService: { id: "monthly-service-1", code: "M-SVC" },
        },
        serviceLevel: {
          id: "level-1",
          code: "GROWTH",
          labelAr: "نمو",
          labelEn: "Growth",
        },
      },
      serviceItemRevision: null,
    },
    ...overrides,
  };
}

describe("PR 17 hours ledger foundation", () => {
  it("summarizes approved, submitted, and rejected time entries and audits ledger views", async () => {
    const database = {
      prisma: {
        timeEntry: {
          findMany: jest.fn(async () => [
            ledgerEntry(),
            ledgerEntry({ id: "time-2", hours: 2, status: "SUBMITTED" }),
          ]),
        },
      },
    } as unknown as DatabaseService;
    const audit = { record: jest.fn(async () => undefined) } as unknown as AuthAuditService;
    const service = new HoursLedgerService(database, audit);

    const result = await service.list({ period: "2026-06" }, principal(), {
      requestId: "request-id",
    });

    expect(result.totals.entries).toBe(2);
    expect(result.totals.approvedHours).toBe(3);
    expect(result.totals.submittedHours).toBe(2);
    expect(result.byClient[0]?.name).toBe("Client One");
    expect(result.byService[0]?.label).toBe("Monthly service");
    expect(result.entries).toHaveLength(2);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "HOURS_LEDGER_VIEWED" }),
      { requestId: "request-id" },
    );
  });
});
