"use client";

import { adminAccessCopy } from "../../i18n/admin-access";
import type { AdminAccessUser } from "../../lib/admin-access-types";
import type { SupportedLocale } from "../../lib/i18n";
import { operatingScopeLabels, primaryOperatingRoleCode } from "./operating-user-scope";

export function UserAccessScopePanel({
  locale,
  onEditScope,
  user,
}: {
  locale: SupportedLocale;
  onEditScope: (user: AdminAccessUser) => void;
  user: AdminAccessUser;
}) {
  const t = adminAccessCopy[locale];
  const labels = operatingScopeLabels(user, locale);

  return (
    <div className="user-access-band">
      <header>
        <div>
          <span>{t.operatingScope}</span>
          <h3>{t.assignments}</h3>
        </div>
      </header>
      {labels.length === 0 ? (
        <p className="user-access-empty">{t.noAssignments}</p>
      ) : (
        <div className="access-chip-list">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
      {primaryOperatingRoleCode(user) ? (
        <div className="operating-user-actions">
          <button className="button-primary" type="button" onClick={() => onEditScope(user)}>
            {t.editScope}
          </button>
        </div>
      ) : null}
    </div>
  );
}
