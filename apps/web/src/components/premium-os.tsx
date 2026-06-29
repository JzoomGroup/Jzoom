import Link from "next/link";
import type { ReactNode } from "react";

type Action = {
  href?: string;
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
};

type ChipTone = "neutral" | "success" | "warning" | "danger" | "accent";

const statusTone: Record<string, ChipTone> = {
  ACTIVE: "success",
  ACCEPTED: "success",
  APPROVED: "success",
  APPROVED_INTERNAL: "success",
  ACCEPTED_BY_CLIENT: "success",
  PAID: "success",
  COMPLETED: "success",
  CLOSED: "success",
  DONE: "success",
  FINALIZED: "success",
  PUBLISHED: "success",
  ISSUED: "accent",
  DRAFT: "accent",
  NEW: "accent",
  TRIAGE: "accent",
  SUBMITTED: "accent",
  INTERNAL_REVIEW: "accent",
  SHARED_WITH_CLIENT: "accent",
  ASSIGNED: "accent",
  CRITICAL: "danger",
  DISABLED: "danger",
  HIGH: "warning",
  IN_PROGRESS: "accent",
  INVITED: "warning",
  LOCKED: "danger",
  LOW: "neutral",
  MEDIUM: "accent",
  WAITING_CLIENT: "warning",
  WAITING_SUPERVISOR: "warning",
  WAITING_MANAGEMENT: "warning",
  PENDING: "warning",
  PREPARED: "warning",
  WATCH: "warning",
  REQUESTED: "warning",
  RETURNED: "warning",
  RETURNED_BY_CLIENT: "warning",
  REVISION_REQUESTED: "warning",
  UPLOADED: "accent",
  COMPLETE: "success",
  COMPLETE_WITH_OPTIONAL_MISSING: "warning",
  INCOMPLETE: "danger",
  BLOCKED: "danger",
  REJECTED: "danger",
  CANCELLED: "danger",
  VOIDED: "danger",
  EXPIRED: "danger",
  ARCHIVED: "danger",
  OVERDUE: "danger",
  INACTIVE: "neutral",
};

const priorityTone: Record<string, ChipTone> = {
  LOW: "neutral",
  NORMAL: "success",
  HIGH: "warning",
  URGENT: "danger",
};

function actionClass(variant: Action["variant"]) {
  return variant === "primary" ? "os-button os-button-primary" : "os-button os-button-secondary";
}

export function PageHeader({
  actions,
  children,
  description,
  eyebrow,
  meta,
  title,
}: {
  actions?: Action[];
  children?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  meta?: ReactNode;
  title: ReactNode;
}) {
  return (
    <header className="os-page-header">
      <div className="os-page-header-copy">
        {eyebrow ? <p className="os-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {meta ? <div className="os-page-meta">{meta}</div> : null}
      </div>
      {children}
      {actions && actions.length > 0 ? (
        <div className="os-page-actions">
          {actions.map((action) =>
            action.href ? (
              <Link className={actionClass(action.variant)} href={action.href} key={action.label}>
                {action.label}
              </Link>
            ) : (
              <button
                className={actionClass(action.variant)}
                key={action.label}
                type="button"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </header>
  );
}

export function BentoGrid({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={compact ? "os-bento-grid compact" : "os-bento-grid"}>{children}</section>
  );
}

export function MetricCard({
  accent = false,
  detail,
  label,
  value,
}: {
  accent?: boolean;
  detail?: ReactNode;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <article className={accent ? "os-metric-card accent" : "os-metric-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

export function SectionCard({
  action,
  children,
  description,
  eyebrow,
  id,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  id?: string;
  title?: ReactNode;
}) {
  return (
    <section className="os-section-card" id={id}>
      {(title || description || eyebrow || action) && (
        <div className="os-section-heading">
          <div>
            {eyebrow ? <p className="os-eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ActionCard({
  description,
  href,
  index,
  title,
}: {
  description: ReactNode;
  href: string;
  index: string;
  title: ReactNode;
}) {
  return (
    <Link className="os-action-card" href={href}>
      <span>{index}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </Link>
  );
}

export function StatusChip({ label, status }: { label?: string; status: string }) {
  const tone = statusTone[status] ?? "neutral";
  return <span className={`os-chip os-chip-${tone}`}>{label ?? status}</span>;
}

export function PriorityChip({ label, priority }: { label?: string; priority: string }) {
  const tone = priorityTone[priority] ?? "neutral";
  return <span className={`os-chip os-chip-${tone}`}>{label ?? priority}</span>;
}

export function EmptyState({
  action,
  children,
  title = "No records yet",
}: {
  action?: ReactNode;
  children?: ReactNode;
  title?: ReactNode;
}) {
  return (
    <div className="os-empty-state">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function SmartTable({ children }: { children: ReactNode }) {
  return <div className="os-table-wrap">{children}</div>;
}

export function ControlDeck({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <section className="os-control-deck">
      {(title || description) && (
        <div className="os-control-deck-heading">
          {title ? <h2>{title}</h2> : null}
          {description ? <p>{description}</p> : null}
        </div>
      )}
      <div className="os-control-grid">{children}</div>
    </section>
  );
}

export function ControlTile({
  description,
  href,
  meta,
  title,
}: {
  description: ReactNode;
  href: string;
  meta?: ReactNode;
  title: ReactNode;
}) {
  return (
    <Link className="os-control-tile" href={href}>
      <span>{meta}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </Link>
  );
}
