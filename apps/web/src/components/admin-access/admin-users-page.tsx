"use client";

import { adminAccessCopy } from "../../i18n/admin-access";
import type { AdminAccessSetup, AdminAccessUser } from "../../lib/admin-access-types";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";
import {
  date,
  formatCode,
  initials,
  language,
  localizedAdminText,
  number,
  permissionLabel,
  roleLabel,
  scopesLabel,
  statusLabel,
  userStatus,
  userTypeLabel,
} from "./admin-access-formatters";
import {
  emptySetup,
  isSpecialistScopeRole,
  operatingRoleLabel,
  operatingScopeLabels,
  primaryOperatingRoleCode,
  serviceLabel,
  toggleValue,
} from "./operating-user-scope";
import { useOperatingUsers } from "./use-operating-users";

export function AdminUsersPageContent({
  locale,
  setup = emptySetup,
  users,
}: {
  locale: string;
  setup?: AdminAccessSetup;
  users: AdminAccessUser[];
}) {
  const lang = language(locale);
  const t = adminAccessCopy[lang];
  const {
    closeOperatingForm,
    currentSetup,
    currentUsers,
    feedback,
    form,
    isEditingScope,
    metrics,
    openCreateForm,
    openScopeEditor,
    resetPassword,
    resettingUserId,
    saving,
    setForm,
    showCreator,
    specialists,
    submitOperatingUser,
    supervisors,
    visibleServiceItems,
  } = useOperatingUsers({ initialSetup: setup, initialUsers: users, locale: lang });
  const { activeUsers, disabledUsers, lockedUsers, usersWithOverrides } = metrics;

  return (
    <>
      <PageHeader
        eyebrow={t.access}
        title={t.portalUsers}
        description={t.usersDescription}
        actions={[
          {
            label: showCreator ? t.closeCreator : t.addOperatingUser,
            onClick: () => {
              if (showCreator) {
                closeOperatingForm();
              } else {
                openCreateForm();
              }
            },
            variant: showCreator ? "secondary" : "primary",
          },
        ]}
      />

      <section className="access-command">
        <div className="access-command-main">
          <p className="eyebrow">{t.accessCenter}</p>
          <h2>{t.portalUsers}</h2>
          <p>{t.accessCenterDescription}</p>
        </div>
      </section>

      {feedback ? (
        <div className={`access-feedback ${feedback.type}`} role="status">
          {feedback.text}
        </div>
      ) : null}

      {showCreator ? (
        <SectionCard
          title={isEditingScope ? t.editOperatingScope : t.createOperatingUser}
          eyebrow={t.operatingScope}
        >
          <form className="operating-user-form" noValidate onSubmit={submitOperatingUser}>
            <div className="operating-user-grid">
              <label>
                <span>{t.name}</span>
                <input
                  required
                  minLength={2}
                  value={form.displayName}
                  disabled={isEditingScope}
                  onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                />
              </label>
              <label>
                <span>{t.emailAddress}</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  disabled={isEditingScope}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
              <label>
                <span>{t.role}</span>
                <select
                  value={form.roleCode}
                  disabled={isEditingScope}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      roleCode: event.target.value,
                      monthlyServiceIds: [],
                      oneTimeServiceIds: [],
                      serviceItemIds: [],
                      specialistIds: [],
                      supervisorId: undefined,
                    })
                  }
                >
                  {currentSetup.roles.map((role) => (
                    <option key={role.code} value={role.code}>
                      {operatingRoleLabel(role.code, lang)}
                    </option>
                  ))}
                </select>
              </label>
              {isSpecialistScopeRole(form.roleCode) ? (
                <label>
                  <span>{t.supervisor}</span>
                  <select
                    value={form.supervisorId ?? ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        supervisorId: event.target.value || undefined,
                      })
                    }
                  >
                    <option value="">{t.noSupervisor}</option>
                    {supervisors.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName} - {user.email}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="operating-scope-grid">
              <fieldset>
                <legend>{t.clients}</legend>
                <p>{t.clientsScopeHelp}</p>
                <div className="scope-picker-grid">
                  {currentSetup.clients.map((client) => (
                    <label key={client.id}>
                      <input
                        type="checkbox"
                        checked={form.clientIds.includes(client.id)}
                        onChange={() =>
                          setForm({ ...form, clientIds: toggleValue(form.clientIds, client.id) })
                        }
                      />
                      <span>
                        {client.name}
                        <small>{client.code}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {form.roleCode === "ROLE-SPECIALIST" ? (
                <>
                  <fieldset>
                    <legend>{t.monthlyServices}</legend>
                    <p>{t.monthlyServicesScopeHelp}</p>
                    <div className="scope-picker-grid">
                      {currentSetup.monthlyServices.map((service) => (
                        <label key={service.id}>
                          <input
                            type="checkbox"
                            checked={form.monthlyServiceIds.includes(service.id)}
                            onChange={() =>
                              setForm({
                                ...form,
                                monthlyServiceIds: toggleValue(form.monthlyServiceIds, service.id),
                              })
                            }
                          />
                          <span>{serviceLabel(service, lang)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>{t.serviceItems}</legend>
                    <p>{t.serviceItemsScopeHelp}</p>
                    <div className="scope-picker-grid">
                      {visibleServiceItems.map((item) => (
                        <label key={item.id}>
                          <input
                            type="checkbox"
                            checked={form.serviceItemIds.includes(item.id)}
                            onChange={() =>
                              setForm({
                                ...form,
                                serviceItemIds: toggleValue(form.serviceItemIds, item.id),
                              })
                            }
                          />
                          <span>
                            {serviceLabel(item, lang)}
                            <small>{item.monthlyServiceCode}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </>
              ) : null}

              {isSpecialistScopeRole(form.roleCode) ? (
                <fieldset>
                  <legend>{t.oneTimeServices}</legend>
                  <p>{t.oneTimeServicesScopeHelp}</p>
                  <div className="scope-picker-grid">
                    {currentSetup.oneTimeServices.map((service) => (
                      <label key={service.id}>
                        <input
                          type="checkbox"
                          checked={form.oneTimeServiceIds.includes(service.id)}
                          onChange={() =>
                            setForm({
                              ...form,
                              oneTimeServiceIds: toggleValue(form.oneTimeServiceIds, service.id),
                            })
                          }
                        />
                        <span>{serviceLabel(service, lang)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {form.roleCode === "ROLE-SUPERVISOR" ? (
                <fieldset>
                  <legend>{t.supervisedSpecialists}</legend>
                  <p>{t.supervisedSpecialistsScopeHelp}</p>
                  <div className="scope-picker-grid">
                    {specialists.map((user) => (
                      <label key={user.id}>
                        <input
                          type="checkbox"
                          checked={form.specialistIds.includes(user.id)}
                          onChange={() =>
                            setForm({
                              ...form,
                              specialistIds: toggleValue(form.specialistIds, user.id),
                            })
                          }
                        />
                        <span>
                          {user.displayName}
                          <small>{user.email}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </div>

            <div className="operating-user-actions">
              <button className="button-secondary" type="button" onClick={closeOperatingForm}>
                {t.cancel}
              </button>
              <button className="button-primary" type="submit" disabled={saving}>
                {saving ? t.saving : isEditingScope ? t.saveScope : t.createAndScope}
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <BentoGrid compact>
        <MetricCard
          accent
          label={t.total}
          value={number(currentUsers.length, lang)}
          detail={t.portalUsers}
        />
        <MetricCard label={t.active} value={number(activeUsers, lang)} detail={t.status} />
        <MetricCard label={t.disabled} value={number(disabledUsers, lang)} detail={t.security} />
        <MetricCard label={t.lockedUsers} value={number(lockedUsers, lang)} detail={t.security} />
        <MetricCard
          label={t.usersWithOverrides}
          value={number(usersWithOverrides, lang)}
          detail={t.permissions}
        />
      </BentoGrid>

      <SectionCard title={t.portalUsers} eyebrow={t.access}>
        {currentUsers.length === 0 ? (
          <EmptyState title={t.emptyUsers}>{t.usersDescription}</EmptyState>
        ) : (
          <div className="access-user-grid">
            {currentUsers.map((user) => (
              <article className="access-user-card" key={user.id}>
                <div className="access-user-top">
                  <span className="access-avatar" aria-hidden="true">
                    {initials(user.displayName)}
                  </span>
                  <div>
                    <h3>{user.displayName}</h3>
                    <p>{user.email}</p>
                  </div>
                  <StatusChip
                    status={userStatus(user)}
                    label={statusLabel(userStatus(user), lang)}
                  />
                </div>

                <dl className="access-definition-grid">
                  <div>
                    <dt>{t.type}</dt>
                    <dd>{userTypeLabel(user.userType, lang)}</dd>
                  </div>
                  <div>
                    <dt>{t.lastLogin}</dt>
                    <dd>{date(user.lastLoginAt, lang, t.never)}</dd>
                  </div>
                  <div>
                    <dt>{t.roles}</dt>
                    <dd>{user.roles.map((role) => roleLabel(role, lang)).join(", ") || "-"}</dd>
                  </div>
                  <div>
                    <dt>{t.scopes}</dt>
                    <dd>{scopesLabel(user, lang)}</dd>
                  </div>
                </dl>

                <div className="access-chip-list">
                  {user.roles.map((role) => (
                    <span key={role.code}>{roleLabel(role, lang)}</span>
                  ))}
                  {user.permissionOverrides.length > 0 ? (
                    <span className="attention">{t.usersWithOverrides}</span>
                  ) : null}
                  {user.mustChangePassword ? (
                    <span className="attention">{t.passwordChangeRequired}</span>
                  ) : null}
                </div>

                {operatingScopeLabels(user, lang).length > 0 ? (
                  <div className="operating-scope-summary">
                    <strong>{t.operatingScope}</strong>
                    <div className="access-chip-list">
                      {operatingScopeLabels(user, lang)
                        .slice(0, 8)
                        .map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      {operatingScopeLabels(user, lang).length > 8 ? (
                        <span>+{number(operatingScopeLabels(user, lang).length - 8, lang)}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <details className="access-details">
                  <summary>{t.overrides}</summary>
                  {user.permissionOverrides.length === 0 ? (
                    <p>{t.noOverrides}</p>
                  ) : (
                    <div className="access-override-list">
                      {user.permissionOverrides.map((override) => (
                        <article key={`${user.id}-${override.permission.code}-${override.effect}`}>
                          <strong>
                            {formatCode(override.effect, lang)} -{" "}
                            {permissionLabel(override.permission, lang)}
                          </strong>
                          <small>{override.permission.code}</small>
                          <p>{localizedAdminText(override.reason, lang, t.reason)}</p>
                          {override.expiresAt ? (
                            <span>
                              {t.expires}: {date(override.expiresAt, lang, "-")}
                            </span>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </details>
                <div className="operating-user-actions">
                  {primaryOperatingRoleCode(user) ? (
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => openScopeEditor(user)}
                    >
                      {t.editScope}
                    </button>
                  ) : null}
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={resettingUserId === user.id}
                    onClick={() => void resetPassword(user)}
                  >
                    {resettingUserId === user.id ? t.resetting : t.resetDefaultPassword}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
