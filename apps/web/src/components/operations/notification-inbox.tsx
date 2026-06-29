"use client";

import Link from "next/link";
import { useState } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  operationsErrorMessage,
} from "../../lib/operations-client";
import type { AppNotification, NotificationListResponse } from "../../lib/operations-types";
import { BentoGrid, EmptyState, MetricCard, PageHeader, SectionCard, StatusChip } from "../premium-os";

function displayDate(value: string): string {
  return new Date(value).toLocaleString("en-SA");
}

export function NotificationInbox({ initial }: { initial: NotificationListResponse }) {
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
      <PageHeader
        eyebrow="مركز التنبيهات"
        title="التنبيهات"
        description="إشارات الطلبات والمخرجات والمستندات والتقارير والساعات في مكان واحد داخل المنصة."
      >
        <div className="os-page-actions">
          <button
            className="os-button os-button-primary"
            type="button"
            onClick={readAll}
            disabled={unreadCount === 0}
          >
            تعيين الكل كمقروء ({unreadCount})
          </button>
        </div>
      </PageHeader>

      <BentoGrid compact>
        <MetricCard accent label="غير مقروءة" value={unreadCount} detail="تحتاج متابعة" />
        <MetricCard label="إجمالي التنبيهات" value={notifications.length} detail="داخل النظام" />
        <MetricCard
          label="آخر نشاط"
          value={notifications[0] ? displayDate(notifications[0].createdAt) : "لا يوجد"}
          detail="حسب أحدث تنبيه"
        />
      </BentoGrid>

      {error && <p className="form-error">{error}</p>}

      <SectionCard
        eyebrow="Notification stream"
        title="سجل التنبيهات"
        description="كل تنبيه يحتفظ بالرابط العميق والسياق التشغيلي بدون إرسال خارجي."
      >
        {notifications.length === 0 ? (
          <EmptyState title="لا توجد تنبيهات">ستظهر هنا تنبيهات الطلبات والمخرجات عند حدوثها.</EmptyState>
        ) : (
          <div className="entity-grid">
            {notifications.map((notification) => (
              <article className="entity-card" key={notification.id}>
                <div className="entity-card-heading">
                  <div>
                    <StatusChip
                      status={notification.readAt ? "CLOSED" : "NEW"}
                      label={notification.readAt ? "مقروء" : "غير مقروء"}
                    />
                    <h3>{notification.messageAr ?? notification.messageEn ?? notification.event}</h3>
                  </div>
                  <span>{displayDate(notification.createdAt)}</span>
                </div>
                {notification.messageEn && <p>{notification.messageEn}</p>}
                <div className="entity-meta">
                  <span>الحدث</span>
                  <strong>{notification.event}</strong>
                  <span>الوجهة</span>
                  <strong>{notification.targetType}</strong>
                </div>
                <div className="entity-card-actions">
                  <Link className="os-button os-button-secondary" href={notification.deepLink}>
                    فتح
                  </Link>
                  {!notification.readAt && (
                    <button
                      className="os-button os-button-secondary"
                      type="button"
                      onClick={() => readOne(notification)}
                    >
                      تعيين كمقروء
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
