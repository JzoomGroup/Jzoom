"use client";

import { adminAccessCopy } from "../../i18n/admin-access";
import type { AdminAccessUser } from "../../lib/admin-access-types";
import type { SupportedLocale } from "../../lib/i18n";
import type { UserAccessEditorController } from "./use-user-access-editor";

export function UserAccessProfilePanel({
  editor,
  locale,
  user,
}: {
  editor: UserAccessEditorController;
  locale: SupportedLocale;
  user: AdminAccessUser;
}) {
  const t = adminAccessCopy[locale];
  const archived = user.status === "ARCHIVED";

  return (
    <form
      className="user-access-form"
      onSubmit={(event) => {
        event.preventDefault();
        void editor.saveProfile();
      }}
    >
      <div className="user-access-form-grid">
        <label>
          <span>{t.name}</span>
          <input
            required
            minLength={2}
            maxLength={120}
            value={editor.profile.displayName}
            disabled={archived}
            onChange={(event) =>
              editor.setProfile({ ...editor.profile, displayName: event.target.value })
            }
          />
        </label>
        <label>
          <span>{t.emailAddress}</span>
          <input
            required
            type="email"
            value={editor.profile.email}
            disabled={archived}
            onChange={(event) =>
              editor.setProfile({ ...editor.profile, email: event.target.value })
            }
          />
        </label>
        <label>
          <span>{t.preferredLanguage}</span>
          <select
            value={editor.profile.preferredLocale}
            disabled={archived}
            onChange={(event) =>
              editor.setProfile({
                ...editor.profile,
                preferredLocale: event.target.value === "en" ? "en" : "ar",
              })
            }
          >
            <option value="ar">{t.arabic}</option>
            <option value="en">{t.english}</option>
          </select>
        </label>
      </div>
      <div className="operating-user-actions">
        <button
          className="button-primary"
          type="submit"
          disabled={editor.savingAction !== null || archived}
        >
          {editor.savingAction === "profile" ? t.saving : t.saveProfile}
        </button>
      </div>
    </form>
  );
}
