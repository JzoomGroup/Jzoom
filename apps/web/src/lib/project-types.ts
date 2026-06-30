import type { RequestUser } from "./request-types";

export type ProjectStatus =
  | "DRAFT"
  | "ACTIVE"
  | "CLIENT_REVIEW"
  | "COMPLETED"
  | "CLOSED"
  | "ARCHIVED";

export type ProjectTaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "CANCELLED";

export type ProjectOutputStatus =
  | "DRAFT"
  | "INTERNAL_REVIEW"
  | "APPROVED_INTERNAL"
  | "SHARED_WITH_CLIENT"
  | "ACCEPTED_BY_CLIENT"
  | "RETURNED_BY_CLIENT"
  | "CLOSED";

export interface ProjectSummary {
  id: string;
  projectNumber: string;
  name: string;
  status: ProjectStatus;
  startsAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; code: string; name: string };
  quote: { id: string; quoteNumber: string; status: string } | null;
  service: {
    id: string;
    code: string;
    serviceLine: string;
    category: { id: string; code: string; nameAr: string; nameEn: string };
    revisionId: string;
    nameAr: string;
    nameEn: string;
    description: string;
    durationDays: number;
    estimatedHours: number;
  };
  phases: ProjectPhase[];
  deliverables: ProjectDeliverable[];
  progress: {
    tasksDone: number;
    tasksTotal: number;
    outputsShared: number;
    outputsTotal: number;
  };
  tasks: ProjectTask[];
  outputs: ProjectOutput[];
  activity: ProjectActivity[];
  serviceSnapshot: unknown;
}

export interface ProjectPhase {
  id: string;
  code: string;
  nameAr: string | null;
  nameEn: string;
  description: string | null;
  sortOrder: number;
  isRequired: boolean;
}

export interface ProjectDeliverable {
  id: string;
  code: string;
  nameAr: string | null;
  nameEn: string;
  description: string | null;
  sortOrder: number;
  isRequired: boolean;
  requiresClientApproval: boolean;
  phaseCode: string | null;
  taskCount: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string | null;
  status: ProjectTaskStatus;
  priority: string;
  dueAt: string | null;
  sortOrder: number;
  assignee: RequestUser | null;
}

export interface ProjectOutput {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: ProjectOutputStatus;
  dueAt: string | null;
  sharedAt: string | null;
  approvedAt: string | null;
  lockedAt: string | null;
  revision: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectActivity {
  id: string;
  actorRole: string;
  reason: string | null;
  occurredAt: string;
  metadata: unknown;
}
