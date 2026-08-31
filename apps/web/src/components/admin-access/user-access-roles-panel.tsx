"use client";

import { adminAccessCopy } from "../../i18n/admin-access";
import type {
  AdminAccessPermission,
  AdminAccessRole,
  AdminAccessUser,
} from "../../lib/admin-access-types";
import type { SupportedLocale } from "../../lib/i18n";
import { LocalizedDateInput } from "../localized-date-input";
import { number, permissionLabel, roleLabel } from "./admin-access-formatters";
import type { UserAccessEditorController } from "./use-user-access-editor";

export function UserAccessRolesPanel({
  canModifyPermissions,
  editor,
  locale,
  permissions,
  roles,
  user,
}: {
  canModifyPermissions: boolean;
  editor: UserAccessEditorController;
  locale: SupportedLocale;
  permissions: AdminAccessPermission[];
  roles: AdminAccessRole[];
  user: AdminAccessUser;
}) {
  const t = adminAccessCopy[locale];
  const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission]));

  return (
    <div className="user-access-stack">
      <section className="user-access-band">
        <header>
          <div>
            <span>{t.roleAssignments}</span>
            <h3>{t.roles}</h3>
          </div>
          <div className="access-chip-list">
            <span className="dark">
              {number(editor.effectivePermissions.allowed, locale)} {t.grantedPermissions}
            </span>
            {editor.effectivePermissions.denied > 0 ? (
              <span className="attention">
                {number(editor.effectivePermissions.denied, locale)} {t.deniedPermissions}
              </span>
            ) : null}
          </div>
        </header>
        <div className="user-role-picker">
          {roles
            .filter((role) => role.userType === user.userType)
            .map((role) => (
              <label key={role.code}>
                <input
                  type="checkbox"
                  checked={editor.roleCodes.includes(role.code)}
                  disabled={!canModifyPermissions}
                  onChange={() => editor.toggleRole(role.code)}
                />
                <span>
                  <strong>{roleLabel(role, locale)}</strong>
                  <small>{role.code}</small>
                </span>
              </label>
            ))}
        </div>
        {canModifyPermissions ? (
          <div className="operating-user-actions">
            <button
              className="button-primary"
              type="button"
              disabled={editor.savingAction !== null}
              onClick={() => void editor.saveRoles()}
            >
              {editor.savingAction === "roles" ? t.saving : t.saveRoles}
            </button>
          </div>
        ) : null}
      </section>

      <section className="user-access-band">
        <header>
          <div>
            <span>{t.effectivePermissions}</span>
            <h3>{t.exceptions}</h3>
            <p>{t.exceptionsHelp}</p>
          </div>
        </header>

        {canModifyPermissions ? (
          <div className="permission-exception-creator">
            <label>
              <span>{t.permission}</span>
              <select
                value={editor.selectedPermissionCode}
                onChange={(event) => editor.setSelectedPermissionCode(event.target.value)}
              >
                <option value="">{t.permission}</option>
                {editor.availablePermissions.map((permission) => (
                  <option key={permission.code} value={permission.code}>
                    {permissionLabel(permission, locale)} ({permission.code})
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button-secondary"
              type="button"
              disabled={!editor.selectedPermissionCode}
              onClick={editor.addOverride}
            >
              {t.addException}
            </button>
          </div>
        ) : null}

        {editor.overrides.length === 0 ? (
          <p className="user-access-empty">{t.noOverrides}</p>
        ) : (
          <div className="permission-exception-list">
            {editor.overrides.map((override) => {
              const permission = permissionByCode.get(override.permissionCode);
              return (
                <article key={override.permissionCode}>
                  <div className="permission-exception-heading">
                    <div>
                      <strong>
                        {permission ? permissionLabel(permission, locale) : override.permissionCode}
                      </strong>
                      <small>{override.permissionCode}</small>
                    </div>
                    <button
                      className="button-quiet"
                      type="button"
                      disabled={!canModifyPermissions}
                      onClick={() => editor.removeOverride(override.permissionCode)}
                    >
                      {t.remove}
                    </button>
                  </div>
                  <div className="permission-exception-fields">
                    <label>
                      <span>{t.type}</span>
                      <select
                        value={override.effect}
                        disabled={!canModifyPermissions}
                        onChange={(event) =>
                          editor.updateOverride(override.permissionCode, {
                            effect: event.target.value === "DENY" ? "DENY" : "ALLOW",
                          })
                        }
                      >
                        <option value="ALLOW">{t.allow}</option>
                        <option value="DENY">{t.deny}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t.exceptionReason}</span>
                      <input
                        required
                        minLength={3}
                        maxLength={500}
                        value={override.reason}
                        disabled={!canModifyPermissions}
                        onChange={(event) =>
                          editor.updateOverride(override.permissionCode, {
                            reason: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>{t.expiryOptional}</span>
                      <LocalizedDateInput
                        locale={locale}
                        value={override.expiresOn}
                        min={new Date().toISOString().slice(0, 10)}
                        disabled={!canModifyPermissions}
                        onChange={(event) =>
                          editor.updateOverride(override.permissionCode, {
                            expiresOn: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {canModifyPermissions ? (
          <div className="operating-user-actions">
            <button
              className="button-primary"
              type="button"
              disabled={editor.savingAction !== null}
              onClick={() => void editor.saveOverrides()}
            >
              {editor.savingAction === "overrides" ? t.saving : t.saveExceptions}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
