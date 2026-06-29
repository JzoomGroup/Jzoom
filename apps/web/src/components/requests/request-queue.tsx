"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { refreshRequestQueue, requestErrorMessage } from "../../lib/request-client";
import type { RequestQueueResponse } from "../../lib/request-types";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  PriorityChip,
  SectionCard,
  StatusChip,
} from "../premium-os";

const queues: RequestQueueResponse["queue"][] = [
  "all",
  "specialist",
  "supervisor",
  "account-manager",
];

const statuses = [
  "",
  "NEW",
  "TRIAGE",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_SUPERVISOR",
  "COMPLETED",
  "RETURNED",
] as const;

const priorities = ["", "LOW", "NORMAL", "HIGH", "URGENT"] as const;

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-SA") : "Not set";
}

export function RequestQueue({ initialQueue }: { initialQueue: RequestQueueResponse }) {
  const [queue, setQueue] = useState(initialQueue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    assigneeId: "",
    clientId: "",
    dueTo: "",
    priority: "",
    serviceId: "",
    status: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value.trim().length > 0),
      );
      if (activeFilters.dueTo) {
        activeFilters.dueTo = new Date(activeFilters.dueTo).toISOString();
      }
      setQueue(await refreshRequestQueue(queue.queue, activeFilters));
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function switchQueue(nextQueue: RequestQueueResponse["queue"]) {
    setLoading(true);
    setError(null);
    try {
      setQueue(await refreshRequestQueue(nextQueue));
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Internal execution"
        title="Request work queues"
        description="Track specialist, supervisor, and account-manager work from backend-scoped request queues."
        actions={[{ href: "/requests", label: "All requests", variant: "secondary" }]}
      />

      <BentoGrid>
        <MetricCard label="Open" value={queue.counters.open} detail="Visible active work" accent />
        <MetricCard label="Specialist" value={queue.counters.specialist} detail="Execution queue" />
        <MetricCard label="Supervisor" value={queue.counters.supervisor} detail="Review queue" />
        <MetricCard label="Account manager" value={queue.counters.accountManager} detail="Client follow-up" />
        <MetricCard label="Overdue" value={queue.counters.overdue} detail="Needs attention" />
      </BentoGrid>

      <SectionCard eyebrow="Queue filters" title="Segment and refine work">
        <div className="row-actions">
          {queues.map((item) => (
            <button
              className={item === queue.queue ? "os-button os-button-primary" : "os-button os-button-secondary"}
              disabled={loading}
              key={item}
              type="button"
              onClick={() => void switchQueue(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <form className="catalog-form wide-form" onSubmit={submit}>
          <label>
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            >
              {statuses.map((status) => (
                <option key={status || "any"} value={status}>
                  {status || "Any status"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={filters.priority}
              onChange={(event) => setFilters({ ...filters, priority: event.target.value })}
            >
              {priorities.map((priority) => (
                <option key={priority || "any"} value={priority}>
                  {priority || "Any priority"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Client ID
            <input
              value={filters.clientId}
              onChange={(event) => setFilters({ ...filters, clientId: event.target.value })}
            />
          </label>
          <label>
            Service ID
            <input
              value={filters.serviceId}
              onChange={(event) => setFilters({ ...filters, serviceId: event.target.value })}
            />
          </label>
          <label>
            Assignee ID
            <input
              value={filters.assigneeId}
              onChange={(event) => setFilters({ ...filters, assigneeId: event.target.value })}
            />
          </label>
          <label>
            Due before
            <input
              type="datetime-local"
              value={filters.dueTo}
              onChange={(event) => setFilters({ ...filters, dueTo: event.target.value })}
            />
          </label>
          <button className="os-button os-button-primary" disabled={loading} type="submit">
            Apply filters
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </SectionCard>

      <SectionCard eyebrow="Queue results" title={`${queue.queue} queue`}>
        {queue.requests.length === 0 ? (
          <EmptyState>No requests match this queue.</EmptyState>
        ) : (
          <div className="quote-list-grid">
            {queue.requests.map((request) => (
              <article className="quote-list-card" key={request.id}>
                <Link className="quote-list-main" href={`/requests/${request.id}`}>
                  <div>
                    <small>{request.requestNumber}</small>
                    <h2>{request.title}</h2>
                    <p>
                      {request.client.name} · {request.service.monthlyService.nameEn}
                    </p>
                  </div>
                  <div className="quote-list-meta">
                    <StatusChip status={request.status} />
                    <PriorityChip priority={request.priority} />
                    <small>Due {displayDate(request.dueAt)}</small>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
