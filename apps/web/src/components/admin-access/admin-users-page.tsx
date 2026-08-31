"use client";

import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { adminAccessCopy } from "../../i18n/admin-access";
import type {
  AdminAccessPermission,
  AdminAccessRole,
  AdminAccessSetup,
  AdminAccessUser,
} from "../../lib/admin-access-types";
import {
  BentoGrid,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusChip,
} from "../premium-os";
import { AppDialog } from "../app-dialog";
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
  serviceLabel,
  toggleValue,
} from "./operating-user-scope";
import { useOperatingUsers } from "./use-operating-users";
import { UserAccessEditor } from "./user-access-editor";

export function AdminUsersPageContent({
  canModifyPermissions = false,
  currentUserId,
  locale,
  permissions = [],
  roles = [],
  setup = emptySetup,
  users,
}: {
  canModifyPermissions?: boolean;
  currentUserId?: string;
  locale: string;
  permissions?: AdminAccessPermission[];
  roles?: AdminAccessRole[];
  setup?: AdminAccessSetup;
  users: AdminAccessUser[];
}) {
  const lang = language(locale);
  const t = adminAccessCopy[lang];
  const [userEditorBusy, setUserEditorBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const {
    applySnapshot,
    closeOperatingForm,
    closeUserManager,
    currentSetup,
    currentUsers,
    feedback,
    form,
    isEditingScope,
    metrics,
    openCreateForm,
    openScopeEditor,
    openUserManager,
    resetPassword,
    resettingUserId,
    saving,
    selectedUser,
    setForm,
    showCreator,
    specialists,
    submitOperatingUser,
    supervisors,
    visibleServiceItems,
  } = useOperatingUsers({ currentUserId, initialSetup: setup, initialUsers: users, locale: lang });
  const { activeUsers, disabledUsers, lockedUsers, usersWithOverrides } = metrics;
  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(lang === "ar" ? "ar" : "en");
    return currentUsers.filter((user) => {
      if (statusFilter !== "ALL" && userStatus(user) !== statusFilter) return false;
      if (typeFilter !== "ALL" && user.userType !== typeFilter) return false;
      if (roleFilter !== "ALL" && !user.roles.some((role) => role.code === roleFilter)) {
        return false;
      }
      if (!normalizedQuery) return true;

      return [
        user.displayName,
        user.email,
        ...user.roles.flatMap((role) => [role.code, roleLabel(role, lang)]),
        scopesLabel(user, lang),
        ...operatingScopeLabels(user, lang),
      ].some((value) =>
        value.toLocaleLowerCase(lang === "ar" ? "ar" : "en").includes(normalizedQuery),
      );
    });
  }, [currentUsers, lang, query, roleFilter, statusFilter, typeFilter]);
  const usersPerPage = 12;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage,
  );

  function resetDirectory() {
    setQuery("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setPage(1);
  }

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

      {feedback ? (
        <div className={`access-feedback ${feedback.type}`} role="status">
          {feedback.text}
        </div>
      ) : null}

      {selectedUser ? (
        <AppDialog
          busy={userEditorBusy || resettingUserId === selectedUser.id}
          closeLabel={t.closeUserManager}
          description={selectedUser.email}
          eyebrow={t.userDetails}
          headerAside={
            <StatusChip
              status={userStatus(selectedUser)}
              label={statusLabel(userStatus(selectedUser), lang)}
            />
          }
          onClose={closeUserManager}
          size="full"
          title={selectedUser.displayName}
        >
          <UserAccessEditor
            key={selectedUser.id}
            canModifyPermissions={canModifyPermissions}
            isCurrentUser={selectedUser.id === currentUserId}
            locale={lang}
            onEditScope={(user) => {
              closeUserManager();
              openScopeEditor(user);
            }}
            onBusyChange={setUserEditorBusy}
            onResetPassword={resetPassword}
            onSnapshot={applySnapshot}
            permissions={permissions}
            resettingPassword={resettingUserId === selectedUser.id}
            roles={roles}
            user={selectedUser}
          />
        </AppDialog>
      ) : null}

      {showCreator ? (
        <AppDialog
          busy={saving}
          closeLabel={t.cancel}
          onClose={closeOperatingForm}
          size="full"
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
              <button
                className="button-secondary"
                disabled={saving}
                type="button"
                onClick={closeOperatingForm}
              >
                {t.cancel}
              </button>
              <button className="button-primary" type="submit" disabled={saving}>
                {saving ? t.saving : isEditingScope ? t.saveScope : t.createAndScope}
              </button>
            </div>
          </form>
        </AppDialog>
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
        <div className="access-user-toolbar">
          <label className="access-user-search">
            <span>{t.searchUsers}</span>
            <span className="access-search-input">
              <Search aria-hidden="true" size={16} />
              <input
                type="search"
                value={query}
                placeholder={t.searchUsersPlaceholder}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </span>
          </label>
          <label>
            <span>{t.status}</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">{t.allStatuses}</option>
              <option value="ACTIVE">{t.active}</option>
              <option value="DISABLED">{t.disabled}</option>
              <option value="LOCKED">{t.locked}</option>
              <option value="INVITED">{t.invited}</option>
              <option value="ARCHIVED">{t.archived}</option>
            </select>
          </label>
          <label>
            <span>{t.role}</span>
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">{t.allRoles}</option>
              {roles.map((role) => (
                <option key={role.code} value={role.code}>
                  {roleLabel(role, lang)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.type}</span>
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">{t.allTypes}</option>
              <option value="INTERNAL">{t.internal}</option>
              <option value="EXTERNAL">{t.external}</option>
            </select>
          </label>
          <button className="os-button os-button-secondary" type="button" onClick={resetDirectory}>
            <RotateCcw aria-hidden="true" size={15} />
            {t.resetFilters}
          </button>
        </div>

        <div className="access-user-results" aria-live="polite">
          <span>
            {t.filteredResults}: {number(filteredUsers.length, lang)}
          </span>
        </div>

        {currentUsers.length === 0 ? (
          <EmptyState title={t.emptyUsers}>{t.usersDescription}</EmptyState>
        ) : filteredUsers.length === 0 ? (
          <EmptyState title={t.noMatchingUsers}>{t.adjustUserFilters}</EmptyState>
        ) : (
          <>
            <div className="access-user-grid">
              {visibleUsers.map((user) => (
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
                          <article
                            key={`${user.id}-${override.permission.code}-${override.effect}`}
                          >
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
                    <button
                      className="button-primary"
                      type="button"
                      onClick={() => openUserManager(user)}
                    >
                      {t.manageUser}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {totalPages > 1 ? (
              <nav className="access-pagination" aria-label={t.userPagination}>
                <button
                  className="os-button os-button-secondary"
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  {lang === "ar" ? (
                    <ChevronRight aria-hidden="true" size={16} />
                  ) : (
                    <ChevronLeft aria-hidden="true" size={16} />
                  )}
                  {t.previousPage}
                </button>
                <strong>{t.pageOf(number(currentPage, lang), number(totalPages, lang))}</strong>
                <button
                  className="os-button os-button-secondary"
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
                  {t.nextPage}
                  {lang === "ar" ? (
                    <ChevronLeft aria-hidden="true" size={16} />
                  ) : (
                    <ChevronRight aria-hidden="true" size={16} />
                  )}
                </button>
              </nav>
            ) : null}
          </>
        )}
      </SectionCard>
    </>
  );
}
