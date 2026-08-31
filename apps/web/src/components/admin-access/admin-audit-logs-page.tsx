"use client";

import { useMemo, useState } from "react";
import { adminAccessCopy } from "../../i18n/admin-access";
import type { AdminAuditLog } from "../../lib/admin-access-types";
import { replaceCurrentUrlQuery } from "../../lib/url-state";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";
import {
  auditCategory,
  date,
  eventLabel,
  isDeniedEvent,
  language,
  localizedAdminText,
  number,
  severityLabel,
} from "./admin-access-formatters";

export function AdminAuditLogsPageContent({
  initialFilters,
  locale,
  logs,
}: {
  initialFilters?: {
    category: string;
    eventCode: string;
    query: string;
    severity: string;
  };
  locale: string;
  logs: AdminAuditLog[];
}) {
  const lang = language(locale);
  const t = adminAccessCopy[lang];
  const criticalLogs = logs.filter((log) => log.severity === "CRITICAL");
  const highLogs = logs.filter((log) => log.severity === "HIGH");
  const deniedLogs = logs.filter(isDeniedEvent);
  const sensitiveLogs = logs.filter(
    (log) => log.severity === "CRITICAL" || log.severity === "HIGH",
  );
  const [filters, setFilters] = useState(
    initialFilters ?? {
      category: "all",
      eventCode: "all",
      query: "",
      severity: "all",
    },
  );
  function updateFilters(next: typeof filters) {
    setFilters(next);
    replaceCurrentUrlQuery(
      {
        category: next.category === "all" ? undefined : next.category,
        event: next.eventCode === "all" ? undefined : next.eventCode,
        q: next.query.trim() || undefined,
        severity: next.severity === "all" ? undefined : next.severity,
      },
      ["category", "event", "q", "severity"],
    );
  }
  const eventOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.eventCode))).sort(),
    [logs],
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => auditCategory(log, lang)))).sort(),
    [logs, lang],
  );
  const filteredLogs = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return logs.filter((log) => {
      if (filters.severity !== "all" && log.severity !== filters.severity) return false;
      if (filters.eventCode !== "all" && log.eventCode !== filters.eventCode) return false;
      if (filters.category !== "all" && auditCategory(log, lang) !== filters.category) {
        return false;
      }
      if (!query) return true;
      const actor = log.actor ? `${log.actor.displayName} ${log.actor.email}` : "";
      return [
        actor,
        auditCategory(log, lang),
        eventLabel(log.eventCode, lang),
        log.entityId,
        log.entityType,
        log.eventCode,
        log.reason,
        log.requestId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [filters, lang, logs]);

  return (
    <>
      <PageHeader eyebrow={t.security} title={t.auditLogs} description={t.auditDescription} />

      <section className="access-command">
        <div className="access-command-main">
          <p className="eyebrow">{t.auditCenter}</p>
          <h2>{t.auditTrail}</h2>
          <p>{t.auditCenterDescription}</p>
        </div>
      </section>

      <BentoGrid compact>
        <MetricCard accent label={t.auditLogs} value={number(logs.length, lang)} detail={t.total} />
        <MetricCard
          label={t.critical}
          value={number(criticalLogs.length, lang)}
          detail={t.severity}
        />
        <MetricCard label={t.high} value={number(highLogs.length, lang)} detail={t.severity} />
        <MetricCard
          label={t.unauthorized}
          value={number(deniedLogs.length, lang)}
          detail={t.security}
        />
        <MetricCard
          label={t.sensitiveEvents}
          value={number(sensitiveLogs.length, lang)}
          detail={t.auditTrail}
        />
      </BentoGrid>
      <SectionCard title={t.auditTrail} eyebrow={t.security} description={t.auditDescription}>
        <div className="catalog-form compact">
          <label>
            {t.auditSearch}
            <input
              placeholder={t.auditSearch}
              value={filters.query}
              onChange={(event) => updateFilters({ ...filters, query: event.target.value })}
            />
          </label>
          <label>
            {t.severity}
            <select
              value={filters.severity}
              onChange={(event) => updateFilters({ ...filters, severity: event.target.value })}
            >
              <option value="all">{t.allSeverities}</option>
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((severity) => (
                <option key={severity} value={severity}>
                  {severityLabel(severity, lang)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.auditCategoryFilter}
            <select
              value={filters.category}
              onChange={(event) => updateFilters({ ...filters, category: event.target.value })}
            >
              <option value="all">{t.auditCategoryFilter}</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.auditEventFilter}
            <select
              value={filters.eventCode}
              onChange={(event) => updateFilters({ ...filters, eventCode: event.target.value })}
            >
              <option value="all">{t.allEvents}</option>
              {eventOptions.map((eventCode) => (
                <option key={eventCode} value={eventCode}>
                  {eventLabel(eventCode, lang)}
                </option>
              ))}
            </select>
          </label>
          <p className="eyebrow">
            {t.filteredResults}: {number(filteredLogs.length, lang)} / {number(logs.length, lang)}
          </p>
        </div>
        {logs.length === 0 ? (
          <EmptyState title={t.emptyAudit}>{t.auditDescription}</EmptyState>
        ) : filteredLogs.length === 0 ? (
          <EmptyState title={t.noFilteredAudit}>{t.auditDescription}</EmptyState>
        ) : (
          <div className="access-audit-list">
            {filteredLogs.map((log) => (
              <article
                className={`access-audit-card severity-${log.severity.toLowerCase()}`}
                key={log.id}
              >
                <div className="access-audit-summary">
                  <div>
                    <small>{auditCategory(log, lang)}</small>
                    <h3>{eventLabel(log.eventCode, lang)}</h3>
                  </div>
                  <StatusChip status={log.severity} label={severityLabel(log.severity, lang)} />
                  <span className="access-audit-code">{log.eventCode}</span>
                  {log.reason ? <p>{localizedAdminText(log.reason, lang, t.reason)}</p> : null}
                </div>
                <dl className="access-definition-grid compact">
                  <div>
                    <dt>{t.actor}</dt>
                    <dd>
                      {log.actor ? `${log.actor.displayName} (${log.actor.email})` : t.noActor}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.auditEntity}</dt>
                    <dd>
                      {log.entityType}
                      {log.entityId ? ` / ${log.entityId}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.severity}</dt>
                    <dd>
                      <StatusChip status={log.severity} label={severityLabel(log.severity, lang)} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t.when}</dt>
                    <dd>{date(log.occurredAt, lang, "-")}</dd>
                  </div>
                  <div>
                    <dt>{t.requestLink}</dt>
                    <dd>{log.requestId ?? t.unknown}</dd>
                  </div>
                  <div>
                    <dt>{t.reason}</dt>
                    <dd>{localizedAdminText(log.reason, lang, t.unknown)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
