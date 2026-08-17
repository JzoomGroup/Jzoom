import { adminAccessCopy } from "../../i18n/admin-access";
import type { AdminAccessUser } from "../../lib/admin-access-types";
import type { SupportedLocale } from "../../lib/i18n";
import { date, number, userTypeLabel } from "./admin-access-formatters";

export function UserAccessActivityPanel({
  locale,
  user,
}: {
  locale: SupportedLocale;
  user: AdminAccessUser;
}) {
  const t = adminAccessCopy[locale];

  return (
    <div className="user-access-band">
      <header>
        <div>
          <span>{t.activity}</span>
          <h3>{t.userDetails}</h3>
        </div>
      </header>
      <dl className="access-definition-grid compact">
        <div>
          <dt>{t.lastLogin}</dt>
          <dd>{date(user.lastLoginAt, locale, t.never)}</dd>
        </div>
        <div>
          <dt>{t.created}</dt>
          <dd>{date(user.createdAt, locale, "-")}</dd>
        </div>
        <div>
          <dt>{t.updated}</dt>
          <dd>{date(user.updatedAt, locale, "-")}</dd>
        </div>
        <div>
          <dt>{t.sessionVersion}</dt>
          <dd>{number(user.sessionVersion, locale)}</dd>
        </div>
        <div>
          <dt>{t.type}</dt>
          <dd>{userTypeLabel(user.userType, locale)}</dd>
        </div>
        <div>
          <dt>{t.passwordChangeRequired}</dt>
          <dd>{user.mustChangePassword ? t.required : t.notRequired}</dd>
        </div>
      </dl>
    </div>
  );
}
