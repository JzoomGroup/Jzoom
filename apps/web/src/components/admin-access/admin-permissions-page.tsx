import { adminAccessCopy } from "../../i18n/admin-access";
import type { AdminAccessPermission } from "../../lib/admin-access-types";
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
  moduleGroups,
  number,
  permissionLabel,
  statusLabel,
} from "./admin-access-formatters";

export function AdminPermissionsPageContent({
  locale,
  permissions,
}: {
  locale: string;
  permissions: AdminAccessPermission[];
}) {
  const lang = language(locale);
  const t = adminAccessCopy[lang];
  const grouped = moduleGroups(permissions);
  const activePermissions = permissions.filter(
    (permission) => permission.status === "ACTIVE",
  ).length;

  return (
    <>
      <PageHeader eyebrow={t.access} title={t.permissions} description={t.permissionsDescription} />

      <section className="access-command">
        <div className="access-command-main">
          <p className="eyebrow">{t.permissionMap}</p>
          <h2>{t.permissions}</h2>
          <p>{t.permissionsDescription}</p>
        </div>
      </section>

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.permissions}
          value={number(permissions.length, lang)}
          detail={t.total}
        />
        <MetricCard
          label={t.module}
          value={number(Object.keys(grouped).length, lang)}
          detail={t.moduleCoverage}
        />
        <MetricCard label={t.active} value={number(activePermissions, lang)} detail={t.status} />
      </BentoGrid>

      {permissions.length === 0 ? (
        <SectionCard title={t.permissions}>
          <EmptyState title={t.emptyPermissions}>{t.permissionsDescription}</EmptyState>
        </SectionCard>
      ) : (
        <>
          <SectionCard title={t.moduleCoverage} eyebrow={t.permissions}>
            <div className="access-module-grid">
              {Object.entries(grouped).map(([module, modulePermissions]) => (
                <article className="access-module-card" key={module}>
                  <span>{t.module}</span>
                  <strong>{formatCode(module, lang)}</strong>
                  <small>
                    {number(modulePermissions.length, lang)} {t.permissions}
                  </small>
                </article>
              ))}
            </div>
          </SectionCard>

          {Object.entries(grouped).map(([module, modulePermissions]) => (
            <SectionCard key={module} title={formatCode(module, lang)} eyebrow={t.module}>
              <div className="access-permission-grid">
                {modulePermissions.map((permission) => (
                  <article className="access-permission-card" key={permission.code}>
                    <div>
                      <small>{permission.code}</small>
                      <h3>{permissionLabel(permission, lang)}</h3>
                      {permission.description ? (
                        <p>
                          {localizedAdminText(
                            permission.description,
                            lang,
                            permissionLabel(permission, lang),
                          )}
                        </p>
                      ) : null}
                    </div>
                    <dl className="access-definition-grid compact">
                      <div>
                        <dt>{t.event}</dt>
                        <dd>{formatCode(permission.action, lang)}</dd>
                      </div>
                      <div>
                        <dt>{t.status}</dt>
                        <dd>
                          <StatusChip
                            status={permission.status}
                            label={statusLabel(permission.status, lang)}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>{t.scopes}</dt>
                        <dd>{formatCode(permission.scopeRule, lang)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </SectionCard>
          ))}
        </>
      )}
    </>
  );
}
