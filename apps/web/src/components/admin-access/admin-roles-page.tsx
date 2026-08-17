import { adminAccessCopy } from "../../i18n/admin-access";
import type { AdminAccessPermission, AdminAccessRole } from "../../lib/admin-access-types";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";
import {
  formatCode,
  language,
  localizedAdminText,
  number,
  permissionLabel,
  roleLabel,
  statusLabel,
} from "./admin-access-formatters";

export function AdminRolesPageContent({
  locale,
  permissions,
  roles,
}: {
  locale: string;
  permissions: AdminAccessPermission[];
  roles: AdminAccessRole[];
}) {
  const lang = language(locale);
  const t = adminAccessCopy[lang];
  const systemRoles = roles.filter((role) => role.isSystem).length;
  const customRoles = roles.length - systemRoles;

  return (
    <>
      <PageHeader eyebrow={t.access} title={t.roles} description={t.rolesDescription} />

      <section className="access-command">
        <div className="access-command-main">
          <p className="eyebrow">{t.accessCenter}</p>
          <h2>{t.roles}</h2>
          <p>{t.rolesDescription}</p>
        </div>
      </section>

      <BentoGrid compact>
        <MetricCard accent label={t.roles} value={number(roles.length, lang)} detail={t.total} />
        <MetricCard
          label={t.permissions}
          value={number(permissions.length, lang)}
          detail={t.access}
        />
        <MetricCard label={t.systemRole} value={number(systemRoles, lang)} detail={t.security} />
        <MetricCard label={t.customRoles} value={number(customRoles, lang)} detail={t.access} />
      </BentoGrid>

      <SectionCard title={t.roles} eyebrow={t.access}>
        {roles.length === 0 ? (
          <EmptyState title={t.emptyRoles}>{t.rolesDescription}</EmptyState>
        ) : (
          <div className="access-role-grid">
            {roles.map((role) => {
              const visiblePermissions = role.permissions.slice(0, 10);
              const hiddenCount = Math.max(role.permissions.length - visiblePermissions.length, 0);
              return (
                <article className="access-role-card" key={role.id}>
                  <div className="access-role-heading">
                    <div>
                      <small>{role.code}</small>
                      <h3>{roleLabel(role, lang)}</h3>
                      {role.description ? (
                        <p>{localizedAdminText(role.description, lang, t.rolesDescription)}</p>
                      ) : null}
                    </div>
                    <StatusChip status={role.status} label={statusLabel(role.status, lang)} />
                  </div>

                  <dl className="access-definition-grid compact">
                    <div>
                      <dt>{t.type}</dt>
                      <dd>{role.userType === "INTERNAL" ? t.internal : t.external}</dd>
                    </div>
                    <div>
                      <dt>{t.portalUsers}</dt>
                      <dd>{number(role.usersCount, lang)}</dd>
                    </div>
                    <div>
                      <dt>{t.permissions}</dt>
                      <dd>{number(role.permissions.length, lang)}</dd>
                    </div>
                    <div>
                      <dt>{t.scopes}</dt>
                      <dd>{formatCode(role.dataScope, lang)}</dd>
                    </div>
                  </dl>

                  <div className="access-notes-grid">
                    <div>
                      <span>{t.capabilities}</span>
                      <p>{localizedAdminText(role.capabilities, lang, t.noCapabilities)}</p>
                    </div>
                    <div>
                      <span>{t.restrictions}</span>
                      <p>{localizedAdminText(role.restrictions, lang, t.noRestrictions)}</p>
                    </div>
                  </div>

                  <div className="access-chip-list">
                    {visiblePermissions.map((permission) => (
                      <span key={permission.code}>{permissionLabel(permission, lang)}</span>
                    ))}
                    {hiddenCount > 0 ? <span>+{number(hiddenCount, lang)}</span> : null}
                    {role.isSystem ? <span className="dark">{t.systemRole}</span> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </>
  );
}
