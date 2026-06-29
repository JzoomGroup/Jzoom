import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientRequestDetail } from "../client-portal/client-request-detail";
import { RequestDetail } from "./request-detail";
import { RequestList } from "./request-list";
import { RequestQueue } from "./request-queue";
import type { CurrentUser } from "../../lib/auth";
import type {
  RequestAssignmentCandidates,
  RequestQueueResponse,
  RequestSummary,
  ServiceRequest,
} from "../../lib/request-types";

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

function assignmentCandidates(): RequestAssignmentCandidates {
  return {
    accountManagers: [
      {
        id: "am-1",
        email: "am@example.com",
        displayName: "Account Manager",
        roleCodes: ["ROLE-AM"],
      },
    ],
    specialists: [
      {
        id: "specialist-user-1",
        email: "specialist@example.com",
        displayName: "Specialist User",
        roleCodes: ["ROLE-SPECIALIST"],
      },
    ],
    supervisors: [
      {
        id: "supervisor-user-1",
        email: "supervisor@example.com",
        displayName: "Supervisor User",
        roleCodes: ["ROLE-SUPERVISOR"],
      },
    ],
  };
}

function currentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "admin-user-1",
    email: "admin@example.com",
    displayName: "Admin User",
    permissions: [],
    preferredLocale: "en",
    roles: ["ROLE-ADMIN"],
    userType: "INTERNAL",
    ...overrides,
  };
}

function renderRequestDetail(
  request: ServiceRequest = serviceRequest(),
  user: CurrentUser = currentUser(),
  candidates?: RequestAssignmentCandidates,
) {
  const assignmentProps = candidates ? { assignmentCandidates: candidates } : {};
  return render(<RequestDetail {...assignmentProps} currentUser={user} initialRequest={request} />);
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

    renderRequestDetail();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "TRIAGE" } });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/requests/request-1/status",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      status: "TRIAGE",
    });
    expect(await screen.findAllByText("In review")).not.toHaveLength(0);
  });

  it("assigns users through friendly assignment candidate selectors", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        ...serviceRequest(),
        assignments: {
          ...serviceRequest().assignments,
          specialist: {
            id: "specialist-user-1",
            email: "specialist@example.com",
            displayName: "Specialist User",
          },
          supervisor: {
            id: "supervisor-user-1",
            email: "supervisor@example.com",
            displayName: "Supervisor User",
          },
        },
      }),
    );

    renderRequestDetail(serviceRequest(), currentUser(), assignmentCandidates());
    fireEvent.change(screen.getByLabelText("Specialist"), {
      target: { value: "specialist-user-1" },
    });
    fireEvent.change(screen.getByLabelText("Supervisor"), {
      target: { value: "supervisor-user-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/requests/request-1/assignment",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      assignedSpecialistId: "specialist-user-1",
      assignedSupervisorId: "supervisor-user-1",
    });
    expect(await screen.findByText("Specialist User")).toBeInTheDocument();
  });

  it("creates checklist items with a friendly assignee selector", async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockImplementationOnce(() => jsonResponse(serviceRequest()));

    renderRequestDetail(serviceRequest(), currentUser(), assignmentCandidates());
    fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Review draft" } });
    fireEvent.change(screen.getByLabelText("Assignee"), {
      target: { value: "specialist-user-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add checklist item" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:4000/api/v1/requests/request-1/tasks",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      assigneeId: "specialist-user-1",
      priority: "NORMAL",
      title: "Review draft",
    });
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

    renderRequestDetail(request);

    expect(screen.getByRole("heading", { name: "Template answers" })).toBeInTheDocument();
    expect(screen.getByText("Request description")).toBeInTheDocument();
    expect(screen.getByText("Please prepare the payroll review.")).toBeInTheDocument();
    expect(screen.getByText("SEO operations")).toBeInTheDocument();
  });

  it("keeps request detail sections navigable and useful when collaboration records are empty", () => {
    const request = {
      ...serviceRequest(),
      activity: [],
      attachments: [],
      comments: [],
      counts: {
        ...serviceRequest().counts,
        comments: 0,
        files: 0,
        internalNotes: 0,
        workflowEvents: 0,
      },
      internalNotes: [],
    };

    renderRequestDetail(request);

    expect(screen.getByRole("link", { name: "Comments" })).toHaveAttribute(
      "href",
      "#request-comments",
    );
    expect(screen.getByRole("link", { name: "Attachments" })).toHaveAttribute(
      "href",
      "#request-attachments",
    );
    expect(
      screen.getByText("No comments have been added to this request yet."),
    ).toBeInTheDocument();
    expect(screen.getByText("No internal notes have been added yet.")).toBeInTheDocument();
    expect(screen.getByText("No attachments are stored on this request yet.")).toBeInTheDocument();
    expect(screen.getByText("No request activity has been recorded yet.")).toBeInTheDocument();
  });

  it("exposes start work only when the request status can move to in progress", () => {
    const { unmount } = renderRequestDetail();

    expect(screen.queryByRole("button", { name: "Start work" })).not.toBeInTheDocument();

    unmount();
    renderRequestDetail({ ...serviceRequest(), status: "ASSIGNED" });

    expect(screen.getByRole("button", { name: "Start work" })).toBeInTheDocument();
  });

  it("shows assigned specialists an execution workbench without supervisor controls", () => {
    const request = {
      ...serviceRequest(),
      status: "ASSIGNED" as const,
      assignments: {
        ...serviceRequest().assignments,
        specialist: {
          id: "specialist-user-1",
          email: "specialist@example.com",
          displayName: "Specialist User",
        },
      },
    };

    renderRequestDetail(
      request,
      currentUser({
        id: "specialist-user-1",
        email: "specialist@example.com",
        displayName: "Specialist User",
        roles: ["ROLE-SPECIALIST"],
      }),
    );

    expect(screen.getByRole("heading", { name: "Specialist workbench" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Add checklist item/ })).toHaveAttribute(
      "href",
      "#request-checklist",
    );
    expect(screen.getByRole("link", { name: /Create internal output/ })).toHaveAttribute(
      "href",
      "#request-outputs",
    );
    expect(screen.getByRole("button", { name: "Start work" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create internal output" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add time" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve request" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update status" })).not.toBeInTheDocument();
  });

  it("shows assigned supervisors review controls without execution forms", () => {
    const request = {
      ...serviceRequest(),
      assignments: {
        ...serviceRequest().assignments,
        supervisor: {
          id: "supervisor-user-1",
          email: "supervisor@example.com",
          displayName: "Supervisor User",
        },
      },
    };
    request.outputs[0] = {
      ...request.outputs[0]!,
      status: "INTERNAL_REVIEW",
      title: "Submitted output",
    };
    request.timeEntries[0] = {
      ...request.timeEntries[0]!,
      status: "SUBMITTED",
      user: { id: "specialist-user-1", email: "specialist@example.com", displayName: "Specialist" },
    };

    renderRequestDetail(
      request,
      currentUser({
        id: "supervisor-user-1",
        email: "supervisor@example.com",
        displayName: "Supervisor User",
        roles: ["ROLE-SUPERVISOR"],
      }),
    );

    expect(screen.getByRole("heading", { name: "Supervisor review" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Supervisor review/ })).toHaveAttribute(
      "href",
      "#request-outputs",
    );
    expect(screen.getByRole("link", { name: /Submitted hours Approve/ })).toHaveAttribute(
      "href",
      "#request-hours",
    );
    expect(screen.getByRole("button", { name: "Approve request" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Approve" }).length).toBeGreaterThanOrEqual(2);
    expect(
      screen.queryByRole("button", { name: "Create internal output" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add time" })).not.toBeInTheDocument();
  });

  it("keeps account managers in follow-up mode without technical delivery approvals", () => {
    const request = serviceRequest();
    request.outputs[0] = {
      ...request.outputs[0]!,
      status: "APPROVED_INTERNAL",
      title: "Approved output",
    };

    renderRequestDetail(
      request,
      currentUser({
        id: "am-1",
        email: "am@example.com",
        displayName: "Account Manager",
        roles: ["ROLE-AM"],
      }),
    );

    expect(screen.getByRole("heading", { name: "Account manager follow-up" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Request document/ })).toHaveAttribute(
      "href",
      "#request-documents",
    );
    expect(screen.getByRole("button", { name: "Add comment" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Share with client" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve request" })).not.toBeInTheDocument();
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

    renderRequestDetail(request);
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
