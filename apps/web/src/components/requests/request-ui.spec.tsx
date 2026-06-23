import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientRequestDetail } from "../client-portal/client-request-detail";
import { RequestDetail } from "./request-detail";
import { RequestList } from "./request-list";
import { RequestQueue } from "./request-queue";
import type { RequestQueueResponse, RequestSummary, ServiceRequest } from "../../lib/request-types";

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
      documentRequests: 1,
      files: 1,
      internalNotes: 1,
      outputs: 1,
      tasks: 1,
      timeEntries: 1,
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
    outputs: [
      {
        id: "output-1",
        code: "SEO_REPORT",
        title: "Internal draft output",
        description: "Internal prepared output",
        contentSnapshot: null,
        status: "DRAFT",
        dueAt: null,
        submittedAt: null,
        reviewedAt: null,
        sharedAt: null,
        clientDecidedAt: null,
        closedAt: null,
        reviewReason: null,
        clientReturnReason: null,
        revision: 1,
        sortOrder: 0,
        createdAt: "2026-06-22T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
        createdBy: { id: "am-1", email: "am@example.com", displayName: "Account Manager" },
        reviewedBy: null,
        sharedBy: null,
        clientDecisionBy: null,
      },
    ],
    documentRequests: [
      {
        id: "document-request-1",
        title: "Bank statement",
        instructions: "Upload the latest statement.",
        status: "REQUESTED",
        dueAt: "2026-06-28T09:00:00.000Z",
        requestedAt: "2026-06-22T00:00:00.000Z",
        fulfilledAt: null,
        closedAt: null,
        cancelledAt: null,
        createdAt: "2026-06-22T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
        requestedBy: { id: "am-1", email: "am@example.com", displayName: "Account Manager" },
        fulfilledBy: null,
        file: null,
      },
    ],
    tasks: [
      {
        id: "task-1",
        title: "Prepare report",
        description: "Internal checklist item",
        status: "TODO",
        priority: "NORMAL",
        assignee: null,
        dueAt: null,
        sortOrder: 0,
        createdAt: "2026-06-22T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
      },
    ],
    timeEntries: [
      {
        id: "time-entry-1",
        user: { id: "am-1", email: "am@example.com", displayName: "Account Manager" },
        workDate: "2026-06-22T00:00:00.000Z",
        hours: 1.5,
        billable: true,
        status: "DRAFT",
        notes: "Initial work",
        decisionReason: null,
        submittedAt: null,
        decidedAt: null,
        decidedBy: null,
        createdAt: "2026-06-22T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
      },
    ],
  };
}

function requestQueue(): RequestQueueResponse {
  return {
    counters: {
      accountManager: 1,
      open: 1,
      overdue: 0,
      specialist: 1,
      supervisor: 1,
    },
    filters: {},
    queue: "all",
    requests: [requestSummary()],
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

  it("renders submitted template answers separately on request detail", () => {
    const request = {
      ...serviceRequest(),
      templateResponse: {
        id: "form-response-1",
        requestTemplateVersionId: "template-version-1",
        requestTemplateVersion: {
          id: "template-version-1",
          version: 1,
          status: "ACTIVE",
          requestTemplateId: "template-1",
        },
        completenessStatus: "COMPLETE" as const,
        templateSnapshot: {},
        fileSnapshot: {},
        submittedBy: { id: "client-user-1", email: "client@example.com", displayName: "Client" },
        submittedAt: "2026-06-22T00:00:00.000Z",
        createdAt: "2026-06-22T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
        answers: [
          {
            id: "answer-1",
            fieldCode: "request_description",
            systemKey: "requestDescription",
            labelAr: "وصف الطلب",
            labelEn: "Request description",
            fieldType: "LONG_TEXT",
            value: "Please prepare the payroll review.",
            clientVisible: true,
            sortOrder: 1,
            createdAt: "2026-06-22T00:00:00.000Z",
            updatedAt: "2026-06-22T00:00:00.000Z",
          },
        ],
      },
    };

    render(<RequestDetail initialRequest={request} />);

    expect(screen.getByRole("heading", { name: "Template answers" })).toBeInTheDocument();
    expect(screen.getByText("Request description")).toBeInTheDocument();
    expect(screen.getByText("Please prepare the payroll review.")).toBeInTheDocument();
    expect(screen.getByText("SEO operations")).toBeInTheDocument();
  });

  it("loads filtered internal work queues through the backend API", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        ...requestQueue(),
        requests: [],
      }),
    );

    render(<RequestQueue initialQueue={requestQueue()} />);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "IN_PROGRESS" } });
    fireEvent.change(screen.getByLabelText("Due before"), {
      target: { value: "2026-06-30T09:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const calledUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(calledUrl.pathname).toBe("/api/v1/requests/queues");
    expect(calledUrl.searchParams.get("queue")).toBe("all");
    expect(calledUrl.searchParams.get("status")).toBe("IN_PROGRESS");
    expect(calledUrl.searchParams.get("dueTo")).toBe(new Date("2026-06-30T09:00").toISOString());
    expect(await screen.findByText("No requests match this queue.")).toBeInTheDocument();
  });

  it("shares an internally approved output through the backend API", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() => jsonResponse(serviceRequest()));
    const request = serviceRequest();
    request.outputs[0] = {
      ...request.outputs[0]!,
      status: "APPROVED_INTERNAL",
      title: "Approved internal output",
    };

    render(<RequestDetail initialRequest={request} />);
    fireEvent.click(screen.getByRole("button", { name: "Share with client" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/requests/request-1/outputs/output-1/share",
    );
  });

  it("lets client users accept only shared outputs through the backend API", async () => {
    const fetchMock = jest.mocked(fetch);
    const request = serviceRequest();
    request.outputs[0] = {
      ...request.outputs[0]!,
      status: "SHARED_WITH_CLIENT",
      title: "Shared SEO output",
      sharedAt: "2026-06-23T00:00:00.000Z",
      createdBy: null,
    };
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        ...request,
        outputs: [{ ...request.outputs[0]!, status: "ACCEPTED_BY_CLIENT" }],
      }),
    );

    render(<ClientRequestDetail request={request} />);
    expect(screen.getByText("Shared SEO output")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept output" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/client-portal/requests/request-1/outputs/output-1/accept",
    );
  });

  it("does not render internal notes in the client request view", () => {
    render(<ClientRequestDetail request={serviceRequest()} />);

    expect(screen.getByText("Visible update")).toBeInTheDocument();
    expect(screen.queryByText("Internal note that clients must never see")).not.toBeInTheDocument();
    expect(screen.queryByText("Internal draft output")).not.toBeInTheDocument();
    expect(screen.queryByText("Prepare report")).not.toBeInTheDocument();
  });
});
