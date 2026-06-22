import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientRequestDetail } from "../client-portal/client-request-detail";
import { RequestDetail } from "./request-detail";
import { RequestList } from "./request-list";
import type { RequestSummary, ServiceRequest } from "../../lib/request-types";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function requestSummary(): RequestSummary {
  return {
    id: "request-1",
    requestNumber: "REQ-20260622-00001",
    status: "NEW",
    title: "Monthly SEO update",
    description: "Prepare the monthly SEO package.",
    priority: "HIGH",
    dueAt: "2026-06-30T09:00:00.000Z",
    closedAt: null,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
    client: {
      id: "client-1",
      code: "CLIENT-1",
      name: "Acme",
      legalName: "Acme LLC",
      sector: "Technology",
      city: "Riyadh",
    },
    service: {
      subscriptionServiceId: "subscription-service-1",
      subscriptionId: "subscription-1",
      hoursAllocated: 20,
      status: "ACTIVE",
      monthlyService: {
        id: "monthly-service-1",
        code: "SEO",
        revisionId: "monthly-service-revision-1",
        nameAr: "تحسين محركات البحث",
        nameEn: "SEO operations",
        serviceLine: "Operate",
        domain: "Marketing",
      },
      serviceLevel: {
        id: "level-1",
        code: "GROWTH",
        labelAr: "نمو",
        labelEn: "Growth",
      },
    },
    serviceItem: {
      id: "service-item-revision-1",
      code: "SEO-REPORT",
      nameAr: "تقرير SEO",
      nameEn: "SEO report",
      expectedOutput: "Monthly report",
    },
    sourceQuote: null,
    sourceInvoice: null,
    assignments: {
      specialist: null,
      supervisor: null,
      accountManager: {
        id: "am-1",
        email: "am@example.com",
        displayName: "Account Manager",
      },
    },
    counts: {
      comments: 1,
      files: 1,
      internalNotes: 1,
      workflowEvents: 1,
    },
  };
}

function serviceRequest(): ServiceRequest {
  return {
    ...requestSummary(),
    comments: [
      {
        id: "comment-1",
        author: { id: "am-1", email: "am@example.com", displayName: "Account Manager" },
        body: "Visible update",
        isClientVisible: true,
        createdAt: "2026-06-22T01:00:00.000Z",
        updatedAt: "2026-06-22T01:00:00.000Z",
      },
      {
        id: "comment-2",
        author: { id: "am-1", email: "am@example.com", displayName: "Account Manager" },
        body: "Hidden update",
        isClientVisible: false,
        createdAt: "2026-06-22T02:00:00.000Z",
        updatedAt: "2026-06-22T02:00:00.000Z",
      },
    ],
    internalNotes: [
      {
        id: "note-1",
        author: { id: "am-1", email: "am@example.com", displayName: "Account Manager" },
        body: "Internal note that clients must never see",
        createdAt: "2026-06-22T03:00:00.000Z",
        updatedAt: "2026-06-22T03:00:00.000Z",
      },
    ],
    attachments: [
      {
        id: "file-1",
        uploadedBy: { id: "am-1", email: "am@example.com", displayName: "Account Manager" },
        originalName: "brief.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        sha256: "a".repeat(64),
        visibility: "CLIENT_VISIBLE",
        version: 1,
        createdAt: "2026-06-22T04:00:00.000Z",
        updatedAt: "2026-06-22T04:00:00.000Z",
      },
    ],
    activity: [
      {
        id: "activity-1",
        actorId: "am-1",
        actorRole: "ROLE-AM",
        fromState: null,
        toState: { code: "NEW", labelEn: "New", labelAr: "جديد" },
        reason: "Request created",
        metadata: {},
        occurredAt: "2026-06-22T00:00:00.000Z",
      },
    ],
  };
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response);
}

describe("Request lifecycle UI", () => {
  beforeEach(() => {
    pushMock.mockReset();
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  it("renders request list cards from backend data", () => {
    render(<RequestList requests={[requestSummary()]} />);

    expect(screen.getByRole("heading", { name: "Service requests" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Monthly SEO update/ })).toHaveAttribute(
      "href",
      "/requests/request-1",
    );
  });

  it("updates request lifecycle through the backend API", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        ...serviceRequest(),
        status: "TRIAGE",
      }),
    );

    render(<RequestDetail initialRequest={serviceRequest()} />);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "TRIAGE" } });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/requests/request-1/status",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      status: "TRIAGE",
    });
    expect(await screen.findByText("TRIAGE")).toBeInTheDocument();
  });

  it("does not render internal notes in the client request view", () => {
    render(<ClientRequestDetail request={serviceRequest()} />);

    expect(screen.getByText("Visible update")).toBeInTheDocument();
    expect(screen.queryByText("Internal note that clients must never see")).not.toBeInTheDocument();
  });
});
