"use client";

import { adminAccessCopy } from "../../i18n/admin-access";
import type { AdminAccessUser } from "../../lib/admin-access-types";
import type { SupportedLocale } from "../../lib/i18n";
import { statusLabel } from "./admin-access-formatters";
import type { UserAccessEditorController } from "./use-user-access-editor";

export function UserAccessSecurityPanel({
  editor,
  locale,
  onResetPassword,
  resettingPassword,
  user,
}: {
  editor: UserAccessEditorController;
  locale: SupportedLocale;
  onResetPassword: (user: AdminAccessUser) => Promise<void>;
  resettingPassword: boolean;
  user: AdminAccessUser;
}) {
  const t = adminAccessCopy[locale];

  return (
    <div className="user-access-stack">
      <section className="user-access-band">
        <header>
          <div>
            <span>{t.accountStatus}</span>
            <h3>{statusLabel(editor.status, locale)}</h3>
          </div>
        </header>
        <div className="security-status-form">
          <label>
            <span>{t.status}</span>
            <select
              value={editor.status}
              onChange={(event) =>
                editor.setStatus(
                  event.target.value as "ACTIVE" | "DISABLED" | "ARCHIVED" | "INVITED",
                )
              }
            >
              {user.status === "INVITED" ? (
                <option value="INVITED" disabled>
                  {t.invited}
                </option>
              ) : null}
              <option value="ACTIVE">{t.active}</option>
              <option value="DISABLED">{t.disabled}</option>
              <option value="ARCHIVED">{t.archived}</option>
            </select>
          </label>
          <button
            className="button-primary"
            type="button"
            disabled={editor.savingAction !== null || editor.status === "INVITED"}
            onClick={() => void editor.saveStatus()}
          >
            {editor.savingAction === "status" ? t.saving : t.saveStatus}
          </button>
        </div>
      </section>

      <section className="user-access-band">
        <header>
          <div>
            <span>{t.authentication}</span>
            <h3>{t.accountSecurity}</h3>
          </div>
        </header>
        <div className="security-action-list">
          <button
            className="button-secondary"
            type="button"
            disabled={resettingPassword || editor.savingAction !== null}
            onClick={() => void onResetPassword(user)}
          >
            {resettingPassword ? t.resetting : t.resetDefaultPassword}
          </button>
          <button
            className="button-secondary"
            type="button"
            disabled={editor.savingAction !== null}
            onClick={() => void editor.invalidateSessions()}
          >
            {editor.savingAction === "sessions" ? t.saving : t.invalidateSessions}
          </button>
        </div>
      </section>
    </div>
  );
}
