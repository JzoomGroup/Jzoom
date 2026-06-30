"use client";

import Link from "next/link";
import { useState } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  operationsErrorMessage,
} from "../../lib/operations-client";
import type { AppNotification, NotificationListResponse } from "../../lib/operations-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";
import { BentoGrid, EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";

const copy = {
  ar: {
    allRead: "تعيين الكل كمقروء",
    createdAt: "وقت التنبيه",
    description:
      "إشعارات الطلبات والمخرجات والمستندات والتقارير والساعات في مكان واحد داخل المنصة.",
    emptyBody: "ستظهر هنا تنبيهات الطلبات والمخرجات عند حدوثها.",
    emptyTitle: "لا توجد تنبيهات",
    event: "الحدث",
    inbox: "سجل التنبيهات",
    latestActivity: "آخر نشاط",
    markRead: "تعيين كمقروء",
    noActivity: "لا يوجد",
    open: "فتح",
    read: "مقروء",
    stream: "مسار التنبيهات",
    streamDescription:
      "كل تنبيه يحتفظ بالرابط العميق والسياق التشغيلي بدون إرسال خارجي.",
    target: "الوجهة",
    title: "التنبيهات",
    total: "إجمالي التنبيهات",
    totalDetail: "داخل النظام",
    unread: "غير مقروء",
    unreadDetail: "تحتاج متابعة",
  },
  en: {
    allRead: "Mark all read",
    createdAt: "Notification time",
    description:
      "Request, output, document, report, and hours notifications in one in-app workspace.",
    emptyBody: "Request and output notifications will appear here as they happen.",
    emptyTitle: "No notifications",
    event: "Event",
    inbox: "Notification log",
    latestActivity: "Latest activity",
    markRead: "Mark read",
    noActivity: "None",
    open: "Open",
    read: "Read",
    stream: "Notification stream",
    streamDescription:
      "Each notification keeps its deep link and operational context without external delivery.",
    target: "Target",
    title: "Notifications",
    total: "Total notifications",
    totalDetail: "In app",
    unread: "Unread",
    unreadDetail: "Needs attention",
  },
} as const;

function displayDate(value: string, locale: SupportedLocale): string {
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-SA");
}

function notificationMessage(notification: AppNotification, locale: SupportedLocale): string {
  if (locale === "ar") {
    return notification.messageAr ?? notification.messageEn ?? notification.event;
  }
  return notification.messageEn ?? notification.messageAr ?? notification.event;
}

export function NotificationInbox({
  initial,
  locale: localeInput,
}: {
  initial: NotificationListResponse;
  locale?: string;
}) {
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
  const [notifications, setNotifications] = useState(initial.notifications);
  const [unreadCount, setUnreadCount] = useState(initial.unreadCount);
  const [error, setError] = useState<string | null>(null);

  async function readOne(notification: AppNotification) {
    setError(null);
    try {
      const updated = await markNotificationRead(notification.id);
      setNotifications((items) =>
        items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setUnreadCount((count) => Math.max(0, count - (notification.readAt ? 0 : 1)));
    } catch (caught) {
      setError(operationsErrorMessage(caught));
    }
  }

  async function readAll() {
    setError(null);
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? now })));
      setUnreadCount(0);
    } catch (caught) {
      setError(operationsErrorMessage(caught));
    }
  }

  return (
    <>
      <PageHeader eyebrow={t.inbox} title={t.title} description={t.description}>
        <div className="os-page-actions">
          <button
            className="os-button os-button-primary"
            type="button"
            onClick={readAll}
            disabled={unreadCount === 0}
          >
            {t.allRead} ({unreadCount})
          </button>
        </div>
      </PageHeader>

      <BentoGrid compact>
        <MetricCard accent label={t.unread} value={unreadCount} detail={t.unreadDetail} />
        <MetricCard label={t.total} value={notifications.length} detail={t.totalDetail} />
        <MetricCard
          label={t.latestActivity}
          value={notifications[0] ? displayDate(notifications[0].createdAt, locale) : t.noActivity}
          detail={t.createdAt}
        />
      </BentoGrid>

      {error && <p className="form-error">{error}</p>}

      <SectionCard eyebrow={t.stream} title={t.inbox} description={t.streamDescription}>
        {notifications.length === 0 ? (
          <EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
        ) : (
          <div className="entity-grid">
            {notifications.map((notification) => (
              <article className="entity-card" key={notification.id}>
                <div className="entity-card-heading">
                  <div>
                    <StatusChip
                      status={notification.readAt ? "CLOSED" : "NEW"}
                      label={notification.readAt ? t.read : t.unread}
                    />
                    <h3>{notificationMessage(notification, locale)}</h3>
                  </div>
                  <span>{displayDate(notification.createdAt, locale)}</span>
                </div>
                <div className="entity-meta">
                  <span>{t.event}</span>
                  <strong>{notification.event}</strong>
                  <span>{t.target}</span>
                  <strong>{notification.targetType}</strong>
                </div>
                <div className="entity-card-actions">
                  <Link className="os-button os-button-secondary" href={notification.deepLink}>
                    {t.open}
                  </Link>
                  {!notification.readAt && (
                    <button
                      className="os-button os-button-secondary"
                      type="button"
                      onClick={() => readOne(notification)}
                    >
                      {t.markRead}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
