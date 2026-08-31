"use client";

import { adminAccessCopy } from "../../i18n/admin-access";
import type { AdminAccessPermission, AdminAccessRole } from "../../lib/admin-access-types";
import { BentoGrid, EmptyState, MetricCard, PageHeader, SectionCard } from "../premium-os";
import {
  formatCode,
  language,
  localizedAdminText,
  number,
  permissionLabel,
  roleLabel,
  statusLabel,
} from "./admin-access-formatters";
import { usePermissionCenter } from "./use-permission-center";

export function AdminPermissionsPageContent({
  currentUserRoleCodes = [],
  locale,
  permissions,
  roles,
}: {
  currentUserRoleCodes?: string[];
  locale: string;
  permissions: AdminAccessPermission[];
  roles: AdminAccessRole[];
}) {
  const lang = language(locale);
  const t = adminAccessCopy[lang];
  const center = usePermissionCenter({
    currentUserRoleCodes,
    initialRoles: roles,
    locale: lang,
    permissions,
  });

  return (
    <>
      <PageHeader
        eyebrow={t.access}
        title={t.permissionCenter}
        description={t.permissionCenterDescription}
      />

      {center.feedback ? (
        <div className={`access-feedback ${center.feedback.type}`} role="status">
          {center.feedback.text}
        </div>
      ) : null}

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.roles}
          value={number(center.roles.length, lang)}
          detail={t.selectRole}
        />
        <MetricCard
          label={t.permissions}
          value={number(permissions.length, lang)}
          detail={t.total}
        />
        <MetricCard
          label={t.moduleCoverage}
          value={number(center.modules.length, lang)}
          detail={t.module}
        />
        <MetricCard
          label={t.affectedUsers}
          value={number(center.selectedRole?.usersCount ?? 0, lang)}
          detail={center.selectedRole ? roleLabel(center.selectedRole, lang) : t.selectRole}
        />
      </BentoGrid>

      {permissions.length === 0 || roles.length === 0 ? (
        <SectionCard title={t.permissions}>
          <EmptyState title={permissions.length === 0 ? t.emptyPermissions : t.emptyRoles}>
            {t.permissionsDescription}
          </EmptyState>
        </SectionCard>
      ) : (
        <SectionCard title={t.permissionMap} eyebrow={t.access}>
          <div className="permission-center-layout">
            <aside className="permission-role-list" aria-label={t.selectRole}>
              {center.roles.map((role) => {
                const active = role.code === center.selectedRoleCode;
                return (
                  <button
                    key={role.code}
                    type="button"
                    className={active ? "active" : undefined}
                    aria-pressed={active}
                    onClick={() => center.selectRole(role.code)}
                  >
                    <span>
                      <strong>{roleLabel(role, lang)}</strong>
                      <small>{role.code}</small>
                    </span>
                    <span className="permission-role-count">
                      {number(role.permissions.length, lang)}
                    </span>
                  </button>
                );
              })}
            </aside>

            <div className="permission-matrix-panel">
              <header className="permission-matrix-heading">
                <div>
                  <span>{t.role}</span>
                  <h2>
                    {center.selectedRole ? roleLabel(center.selectedRole, lang) : t.selectRole}
                  </h2>
                  <p>
                    {center.selectedRole?.description
                      ? localizedAdminText(
                          center.selectedRole.description,
                          lang,
                          t.rolesDescription,
                        )
                      : t.rolesDescription}
                  </p>
                </div>
                <div className="access-chip-list">
                  <span className="dark">
                    {number(center.draftSet.size, lang)} {t.assignedPermissions}
                  </span>
                  {center.dirty ? <span className="attention">{t.unsavedChanges}</span> : null}
                </div>
              </header>

              <div className="permission-toolbar">
                <label>
                  <span>{t.searchPermissions}</span>
                  <input
                    type="search"
                    value={center.query}
                    placeholder={t.searchPermissions}
                    onChange={(event) => center.setQuery(event.target.value)}
                  />
                </label>
                <label>
                  <span>{t.module}</span>
                  <select
                    value={center.moduleFilter}
                    onChange={(event) => center.setModuleFilter(event.target.value)}
                  >
                    <option value="all">{t.allModules}</option>
                    {center.modules.map((module) => (
                      <option key={module} value={module}>
                        {formatCode(module, lang)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {center.visiblePermissions.length === 0 ? (
                <EmptyState title={t.noMatchingPermissions}>{t.permissionsDescription}</EmptyState>
              ) : (
                <div className="permission-matrix-list">
                  {center.visiblePermissions.map((permission) => {
                    const checked = center.draftSet.has(permission.code);
                    const protectedPermission = center.isProtected(permission.code);
                    return (
                      <label
                        key={permission.code}
                        className={`permission-matrix-row${checked ? " selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={protectedPermission || permission.status !== "ACTIVE"}
                          onChange={() => center.togglePermission(permission.code)}
                        />
                        <span className="permission-matrix-copy">
                          <strong>{permissionLabel(permission, lang)}</strong>
                          <small>{permission.code}</small>
                          <p>
                            {permission.description
                              ? localizedAdminText(
                                  permission.description,
                                  lang,
                                  permissionLabel(permission, lang),
                                )
                              : `${formatCode(permission.module, lang)} · ${formatCode(permission.action, lang)}`}
                          </p>
                        </span>
                        <span className="permission-matrix-meta">
                          <b>{formatCode(permission.module, lang)}</b>
                          <small>{formatCode(permission.action, lang)}</small>
                          <small>{statusLabel(permission.status, lang)}</small>
                          {permission.scopeRule ? (
                            <small>{formatCode(permission.scopeRule, lang)}</small>
                          ) : null}
                          {protectedPermission ? <em>{t.protectedAdminPermission}</em> : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="permission-save-bar">
                <div>
                  <strong>{center.dirty ? t.unsavedChanges : t.assignedPermissions}</strong>
                  <span>
                    {number(center.selectedRole?.usersCount ?? 0, lang)} {t.affectedUsers}
                  </span>
                </div>
                <div className="operating-user-actions">
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={!center.dirty || center.saving}
                    onClick={center.resetDraft}
                  >
                    {t.cancel}
                  </button>
                  <button
                    className="button-primary"
                    type="button"
                    disabled={!center.dirty || center.saving}
                    onClick={() => void center.saveRolePermissions()}
                  >
                    {center.saving ? t.saving : t.saveRolePermissions}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </>
  );
}
