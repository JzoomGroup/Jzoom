import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProjectDetail, ProjectList } from "./project-board";
import {
  changeClientProjectOutputStatus,
  changeProjectOutputStatus,
  updateProjectTaskStatus,
} from "../../lib/project-client";
import type { ProjectSummary } from "../../lib/project-types";

jest.mock("../../lib/project-client", () => ({
  changeClientProjectOutputStatus: jest.fn(),
  changeProjectOutputStatus: jest.fn(),
  changeProjectStatus: jest.fn(),
  createProjectOutput: jest.fn(),
  projectErrorMessage: () => "تعذر حفظ الإجراء. حاول مرة أخرى.",
  updateProjectTaskStatus: jest.fn(),
  uploadProjectOutputFile: jest.fn(),
}));

const mockedChangeClientProjectOutputStatus = jest.mocked(changeClientProjectOutputStatus);
const mockedChangeProjectOutputStatus = jest.mocked(changeProjectOutputStatus);
const mockedUpdateProjectTaskStatus = jest.mocked(updateProjectTaskStatus);

function project(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    projectNumber: "PRJ-20260630-00001",
    name: "مشروع الرؤية والرسالة",
    status: "ACTIVE",
    startsAt: "2026-06-30T00:00:00.000Z",
    dueAt: "2026-07-14T00:00:00.000Z",
    completedAt: null,
    closedAt: null,
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
    client: { id: "client-1", code: "CLIENT-009", name: "شركة المرعبين المحدودة" },
    quote: { id: "quote-1", quoteNumber: "QT-20260630-00001", status: "ACCEPTED" },
    service: {
      id: "service-1",
      code: "OT-BLD-002",
      serviceLine: "Build",
      category: {
        id: "category-1",
        code: "BUILD",
        nameAr: "البناء والتأسيس",
        nameEn: "Build",
      },
      revisionId: "revision-1",
      nameAr: "الرؤية والرسالة والقيم",
      nameEn: "Vision, mission, and values",
      description: "إعداد حزمة التأسيس الاستراتيجي للعميل.",
      durationDays: 14,
      estimatedHours: 24,
    },
    phases: [
      {
        id: "phase-1",
        code: "DISCOVERY",
        nameAr: "الاكتشاف",
        nameEn: "Discovery",
        description: null,
        sortOrder: 1,
        isRequired: true,
      },
    ],
    deliverables: [
      {
        id: "deliverable-1",
        code: "DEL-STRATEGY",
        nameAr: "ملف الاستراتيجية",
        nameEn: "Strategy file",
        description: "مخرج قابل للمراجعة من العميل.",
        sortOrder: 1,
        isRequired: true,
        requiresClientApproval: true,
        phaseCode: "DISCOVERY",
        taskCount: 1,
      },
    ],
    progress: {
      tasksDone: 0,
      tasksTotal: 1,
      outputsShared: 1,
      outputsTotal: 2,
    },
    tasks: [
      {
        id: "task-1",
        title: "إعداد المسودة",
        description: "تجهيز المسودة الأولى.",
        status: "TODO",
        priority: "HIGH",
        dueAt: null,
        sortOrder: 1,
        assignee: {
          id: "user-1",
          email: "project.specialist@example.com",
          displayName: "مختص المشاريع",
        },
      },
    ],
    outputs: [
      {
        id: "output-shared",
        code: "OUT-01",
        title: "المسودة الأولى",
        description: "جاهزة لمراجعة العميل.",
        status: "SHARED_WITH_CLIENT",
        dueAt: null,
        sharedAt: "2026-06-30T00:00:00.000Z",
        approvedAt: null,
        lockedAt: null,
        revision: 1,
        sortOrder: 1,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
        decisionReason: null,
        files: [],
      },
      {
        id: "output-draft",
        code: "OUT-02",
        title: "مخرج داخلي",
        description: "غير مشارك مع العميل.",
        status: "DRAFT",
        dueAt: null,
        sharedAt: null,
        approvedAt: null,
        lockedAt: null,
        revision: 1,
        sortOrder: 2,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
        decisionReason: null,
        files: [
          {
            id: "file-1",
            originalName: "draft.pdf",
            mimeType: "application/pdf",
            sizeBytes: 1024,
            visibility: "CLIENT_VISIBLE",
            version: 1,
            downloadUrl: "/api/v1/projects/project-1/files/file-1/download",
            createdAt: "2026-06-30T00:00:00.000Z",
            uploadedBy: null,
          },
        ],
      },
    ],
    activity: [
      {
        id: "event-1",
        actorRole: "ROLE-PROJECT-SPECIALIST",
        reason: "Project created",
        occurredAt: "2026-06-30T00:00:00.000Z",
        metadata: {},
      },
    ],
    serviceSnapshot: {},
    capabilities: {
      canDeliver: true,
      canSupervise: false,
      canClientDecide: false,
    },
    ...overrides,
  };
}

describe("project delivery UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a premium Arabic project list with scoped project links", () => {
    render(<ProjectList locale="ar" projects={[project()]} />);

    expect(screen.getByRole("heading", { name: "مشاريع العملاء" })).toBeInTheDocument();
    expect(screen.getByText(/شركة المرعبين المحدودة/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "فتح المشروع" })).toHaveAttribute(
      "href",
      "/projects/project-1",
    );
  });

  it("keeps client project views focused on review decisions, not internal operations", () => {
    render(<ProjectDetail clientMode locale="ar" project={project()} />);

    expect(screen.getByRole("heading", { name: "مشروع الرؤية والرسالة" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "اعتماد المخرج" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "طلب تعديل" })).toBeInTheDocument();
    expect(screen.queryByText("مخرج داخلي")).not.toBeInTheDocument();
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "تعليم كمكتمل" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "حفظ المخرج" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "النشاط" })).toBeInTheDocument();
  });

  it("does not expose legacy English project copy in Arabic workspaces", () => {
    render(
      <ProjectDetail
        locale="ar"
        project={project({
          tasks: [
            {
              ...project().tasks[0]!,
              description: "Kickoff one-time project delivery.",
            },
          ],
          outputs: [
            {
              ...project().outputs[1]!,
              code: "OUT-UI",
              title: "UI design",
              description: "Legacy English output description.",
            },
          ],
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: "تصميم الواجهات" })).toBeInTheDocument();
    expect(screen.queryByText("Kickoff one-time project delivery.")).not.toBeInTheDocument();
    expect(screen.queryByText("Legacy English output description.")).not.toBeInTheDocument();
  });

  it("lets project specialists update assigned work without exposing client decisions", async () => {
    const updatedProject = project({
      status: "CLIENT_REVIEW",
      tasks: [{ ...project().tasks[0]!, status: "IN_PROGRESS" }],
    });
    mockedUpdateProjectTaskStatus.mockResolvedValue(updatedProject);
    mockedChangeProjectOutputStatus.mockResolvedValue(updatedProject);
    render(<ProjectDetail locale="ar" project={project()} />);

    expect(screen.queryByRole("button", { name: "اعتماد المخرج" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "طلب تعديل" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "إرسال للعميل" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "بدء المهمة" }));
    await waitFor(() =>
      expect(mockedUpdateProjectTaskStatus).toHaveBeenCalledWith(
        "project-1",
        "task-1",
        "IN_PROGRESS",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "إرسال للمراجعة" }));
    await waitFor(() =>
      expect(mockedChangeProjectOutputStatus).toHaveBeenCalledWith(
        "project-1",
        "output-draft",
        "INTERNAL_REVIEW",
      ),
    );
  });

  it("keeps a selected replacement file visible for a returned project output", () => {
    const returnedOutput = {
      ...project().outputs[0]!,
      status: "RETURNED_BY_CLIENT" as const,
    };
    render(<ProjectDetail locale="ar" project={project({ outputs: [returnedOutput] })} />);

    const file = new File(["revision"], "project-output-v2.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText(/ملف المخرج - /), {
      target: { files: [file] },
    });

    expect(screen.getByText("project-output-v2.pdf")).toBeInTheDocument();
  });

  it("shows internal review controls only to project supervisors", async () => {
    const supervisorProject = project({
      capabilities: { canDeliver: false, canSupervise: true, canClientDecide: false },
      outputs: [{ ...project().outputs[1]!, status: "INTERNAL_REVIEW" }],
    });
    mockedChangeProjectOutputStatus.mockResolvedValue(supervisorProject);

    render(<ProjectDetail locale="ar" project={supervisorProject} />);
    fireEvent.click(screen.getByRole("button", { name: "اعتماد داخلي" }));

    await waitFor(() =>
      expect(mockedChangeProjectOutputStatus).toHaveBeenCalledWith(
        "project-1",
        "output-draft",
        "APPROVED_INTERNAL",
        "",
      ),
    );
    expect(screen.queryByRole("button", { name: "اعتماد المخرج" })).not.toBeInTheDocument();
  });

  it("lets clients accept shared outputs through the client-safe endpoint", async () => {
    mockedChangeClientProjectOutputStatus.mockResolvedValue(
      project({
        outputs: [{ ...project().outputs[0]!, status: "ACCEPTED_BY_CLIENT" }],
      }),
    );

    render(<ProjectDetail clientMode locale="ar" project={project()} />);
    fireEvent.click(screen.getByRole("button", { name: "اعتماد المخرج" }));

    await waitFor(() =>
      expect(mockedChangeClientProjectOutputStatus).toHaveBeenCalledWith(
        "project-1",
        "output-shared",
        "ACCEPTED_BY_CLIENT",
      ),
    );
  });
});
