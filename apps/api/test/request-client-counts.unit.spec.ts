import "reflect-metadata";
import { RequestsService } from "../src/requests/requests.service.js";

interface ClientSafeCounts {
  comments: number;
  documentRequests: number;
  files: number;
  internalNotes: number;
  outputs: number;
  tasks: number;
  timeEntries: number;
  workflowEvents: number;
}

function serviceWithPrivateViews() {
  return new RequestsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  ) as unknown as {
    clientSafeSummaryCounts(counts: ClientSafeCounts): ClientSafeCounts;
    clientSafeDetailCounts(request: {
      comments: Array<{ isClientVisible: boolean }>;
      documentRequests: Array<{ status: string }>;
      files: Array<{ visibility: string; archivedAt: Date | null }>;
      outputs: Array<{ status: string }>;
    }): ClientSafeCounts;
  };
}

describe("request client-safe counts", () => {
  it("maps summary counts to client-visible surface only", () => {
    const service = serviceWithPrivateViews();

    expect(
      service.clientSafeSummaryCounts({
        comments: 2,
        documentRequests: 3,
        files: 4,
        internalNotes: 5,
        outputs: 6,
        tasks: 7,
        timeEntries: 8,
        workflowEvents: 9,
      }),
    ).toEqual({
      comments: 2,
      documentRequests: 3,
      files: 4,
      internalNotes: 0,
      outputs: 6,
      tasks: 0,
      timeEntries: 0,
      workflowEvents: 0,
    });
  });

  it("counts only client-visible loaded detail records", () => {
    const service = serviceWithPrivateViews();

    expect(
      service.clientSafeDetailCounts({
        comments: [{ isClientVisible: true }, { isClientVisible: false }],
        documentRequests: [{ status: "REQUESTED" }, { status: "CANCELLED" }],
        files: [
          { visibility: "CLIENT_VISIBLE", archivedAt: null },
          { visibility: "CLIENT_VISIBLE", archivedAt: new Date() },
          { visibility: "INTERNAL", archivedAt: null },
        ],
        outputs: [
          { status: "SHARED_WITH_CLIENT" },
          { status: "ACCEPTED_BY_CLIENT" },
          { status: "DRAFT" },
        ],
      }),
    ).toEqual({
      comments: 1,
      documentRequests: 1,
      files: 1,
      internalNotes: 0,
      outputs: 2,
      tasks: 0,
      timeEntries: 0,
      workflowEvents: 0,
    });
  });
});
