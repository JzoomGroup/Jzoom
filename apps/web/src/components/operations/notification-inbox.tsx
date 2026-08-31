"use client";

import { notificationInboxCopy as copy } from "../../i18n/dictionaries/operations";

import { Bell, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  operationsErrorMessage,
} from "../../lib/operations-client";
import type { AppNotification, NotificationListResponse } from "../../lib/operations-types";
import { normalizeLocale, platformTimeZone, type SupportedLocale } from "../../lib/i18n";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";

function displayDate(value: string, locale: SupportedLocale): string {
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: platformTimeZone,
  });
}

function notificationMessage(notification: AppNotification, locale: SupportedLocale): string {
  if (locale === "ar") {
    return notification.messageAr?.trim() || "يوجد تحديث جديد يحتاج إلى مراجعتك داخل المنصة.";
  }
  return notification.messageEn ?? notification.messageAr ?? notification.event;
}

const notificationEventLabels: Record<SupportedLocale, Record<string, string>> = {
  ar: {
    REQUEST_ATTACHMENT_METADATA_ADDED: "إضافة مرفق",
    REQUEST_ATTACHMENT_ARCHIVED: "أرشفة مرفق",
    REQUEST_ASSIGNMENT_CHANGED: "تغيير الإسناد",
    REQUEST_CLIENT_COMMENT_ADDED: "تعليق من العميل",
    REQUEST_CLIENT_DOCUMENT_REQUESTED: "طلب مستند من العميل",
    REQUEST_CLIENT_DOCUMENT_REQUEST_CANCELLED: "إلغاء طلب مستند",
    REQUEST_CLIENT_DOCUMENT_UPLOADED: "رفع مستند من العميل",
    REQUEST_COMMENT_ADDED: "إضافة تعليق",
    REQUEST_CREATED: "إنشاء طلب",
    REQUEST_OUTPUT_CLIENT_ACCEPTED: "اعتماد العميل للمخرج",
    REQUEST_OUTPUT_CLIENT_RETURNED: "إعادة العميل للمخرج",
    REQUEST_OUTPUT_REVIEWED: "مراجعة مخرج",
    REQUEST_OUTPUT_SHARED_WITH_CLIENT: "مشاركة مخرج مع العميل",
    REQUEST_OUTPUT_SUBMITTED: "إرسال مخرج للمراجعة",
    REQUEST_STATUS_CHANGED: "تغيير حالة الطلب",
    REQUEST_TIME_ENTRY_REVIEWED: "مراجعة سجل ساعات",
    CLIENT_MONTHLY_REPORT_PUBLISHED: "نشر التقرير الشهري",
  },
  en: {
    REQUEST_ATTACHMENT_METADATA_ADDED: "Attachment added",
    REQUEST_ATTACHMENT_ARCHIVED: "Attachment archived",
    REQUEST_ASSIGNMENT_CHANGED: "Assignment changed",
    REQUEST_CLIENT_COMMENT_ADDED: "Client comment added",
    REQUEST_CLIENT_DOCUMENT_REQUESTED: "Client document requested",
    REQUEST_CLIENT_DOCUMENT_REQUEST_CANCELLED: "Document request cancelled",
    REQUEST_CLIENT_DOCUMENT_UPLOADED: "Client document uploaded",
    REQUEST_COMMENT_ADDED: "Comment added",
    REQUEST_CREATED: "Request created",
    REQUEST_OUTPUT_CLIENT_ACCEPTED: "Output accepted by client",
    REQUEST_OUTPUT_CLIENT_RETURNED: "Output returned by client",
    REQUEST_OUTPUT_REVIEWED: "Output reviewed",
    REQUEST_OUTPUT_SHARED_WITH_CLIENT: "Output shared with client",
    REQUEST_OUTPUT_SUBMITTED: "Output submitted for review",
    REQUEST_STATUS_CHANGED: "Request status changed",
    REQUEST_TIME_ENTRY_REVIEWED: "Time entry reviewed",
    CLIENT_MONTHLY_REPORT_PUBLISHED: "Monthly report published",
  },
};

const notificationTargetLabels: Record<SupportedLocale, Record<string, string>> = {
  ar: { ClientMonthlyReport: "تقرير شهري", Project: "مشروع", Request: "طلب خدمة" },
  en: { ClientMonthlyReport: "Monthly report", Project: "Project", Request: "Service request" },
};

function notificationEventLabel(event: string, locale: SupportedLocale): string {
  return (
    notificationEventLabels[locale][event] ??
    (locale === "ar" ? "تحديث تشغيلي" : event.toLowerCase().replaceAll("_", " "))
  );
}

function notificationTargetLabel(targetType: string, locale: SupportedLocale): string {
  return (
    notificationTargetLabels[locale][targetType] ?? (locale === "ar" ? "عنصر مرتبط" : targetType)
  );
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

      <div className="notification-summary">
        <BentoGrid compact>
          <MetricCard accent label={t.unread} value={unreadCount} detail={t.unreadDetail} />
          <MetricCard label={t.total} value={notifications.length} detail={t.totalDetail} />
        </BentoGrid>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <SectionCard title={t.stream}>
        {notifications.length === 0 ? (
          <EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <article
                className={`notification-row${notification.readAt ? "" : " unread"}`}
                key={notification.id}
              >
                <span className="notification-row-icon" aria-hidden="true">
                  <Bell size={18} strokeWidth={1.8} />
                </span>
                <div className="notification-row-content">
                  <div className="notification-row-heading">
                    <div>
                      <h3>{notificationMessage(notification, locale)}</h3>
                      <div className="notification-row-meta">
                        <span>{notificationEventLabel(notification.event, locale)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{notificationTargetLabel(notification.targetType, locale)}</span>
                      </div>
                    </div>
                    <time dateTime={notification.createdAt}>
                      {displayDate(notification.createdAt, locale)}
                    </time>
                  </div>
                  {!notification.readAt ? <StatusChip status="NEW" label={t.unread} /> : null}
                </div>
                <div className="notification-row-actions">
                  <Link className="os-button os-button-secondary" href={notification.deepLink}>
                    <ExternalLink aria-hidden="true" size={15} strokeWidth={1.8} />
                    {t.open}
                  </Link>
                  {!notification.readAt && (
                    <button
                      className="os-button os-button-secondary"
                      type="button"
                      onClick={() => readOne(notification)}
                    >
                      <Check aria-hidden="true" size={15} strokeWidth={1.8} />
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
