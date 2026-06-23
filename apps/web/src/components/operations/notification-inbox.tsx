"use client";

import Link from "next/link";
import { useState } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  operationsErrorMessage,
} from "../../lib/operations-client";
import type { AppNotification, NotificationListResponse } from "../../lib/operations-types";

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
      <header className="catalog-header">
        <div>
          <p className="eyebrow">In-app notifications</p>
          <h1>Notification center</h1>
          <p>
            Important request, delivery, document, report, and hours events appear here. External
            channels remain future-ready through the outbox.
          </p>
        </div>
        <button
          className="button-primary"
          type="button"
          onClick={readAll}
          disabled={unreadCount === 0}
        >
          Mark all read ({unreadCount})
        </button>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="catalog-panel">
        <div className="entity-grid">
          {notifications.map((notification) => (
            <article className="entity-card" key={notification.id}>
              <div className="entity-card-heading">
                <div>
                  <span
                    className={`status-pill ${notification.readAt ? "status-closed" : "status-new"}`}
                  >
                    {notification.readAt ? "Read" : "Unread"}
                  </span>
                  <h3>{notification.messageEn ?? notification.event}</h3>
                </div>
                <span>{displayDate(notification.createdAt)}</span>
              </div>
              {notification.messageAr && <p dir="rtl">{notification.messageAr}</p>}
              <div className="entity-meta">
                <span>Event</span>
                <strong>{notification.event}</strong>
                <span>Target</span>
                <strong>{notification.targetType}</strong>
              </div>
              <div className="entity-card-actions">
                <Link className="button-secondary" href={notification.deepLink}>
                  Open
                </Link>
                {!notification.readAt && (
                  <button type="button" onClick={() => readOne(notification)}>
                    Mark read
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {notifications.length === 0 && <p>No notifications yet.</p>}
      </section>
    </>
  );
}
