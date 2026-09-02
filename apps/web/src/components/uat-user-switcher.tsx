"use client";

import {
  ArrowRightLeft,
  Building2,
  LogIn,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { uatUserSwitcherCopy } from "../i18n/uat-user-switcher";
import { clientDateTime } from "./client-portal/client-format";
import { normalizeLocale, type SupportedLocale } from "../lib/i18n";
import { postLoginRoute } from "../lib/route-access";
import {
  loadUatImpersonationUsers,
  loadUatSession,
  startUatImpersonation,
  stopUatImpersonation,
  type UatImpersonationUser,
  type UatSessionUser,
} from "../lib/uat-impersonation-client";
import { profileRoleLabel } from "../i18n/pages";
import { AppDialog } from "./app-dialog";

type SwitcherContextValue = {
  locale: SupportedLocale;
  session: UatSessionUser | null;
  open: () => void;
  returning: boolean;
  returnError: string | null;
  returnToAdmin: () => Promise<void>;
};

const SwitcherContext = createContext<SwitcherContextValue | null>(null);

function useSwitcher() {
  return useContext(SwitcherContext);
}

function roleCodes(user: UatImpersonationUser): string[] {
  return user.roles.map((role) => role.code);
}

function userSearchText(user: UatImpersonationUser, locale: SupportedLocale): string {
  return [
    user.displayName,
    user.email,
    ...user.roles.flatMap((role) => [role.code, role.name, profileRoleLabel(role.code, locale)]),
    ...user.clients.flatMap((client) => [client.code, client.name]),
  ]
    .join(" ")
    .toLocaleLowerCase(locale === "ar" ? "ar" : "en");
}

function UserCard({
  busy,
  locale,
  onSwitch,
  user,
}: {
  busy: boolean;
  locale: SupportedLocale;
  onSwitch: (user: UatImpersonationUser) => void;
  user: UatImpersonationUser;
}) {
  const t = uatUserSwitcherCopy[locale];
  const initials = user.displayName.trim().slice(0, 2).toUpperCase();
  return (
    <article className="uat-switcher-user-card">
      <div className="uat-switcher-user-avatar" aria-hidden="true">
        {initials}
      </div>
      <div className="uat-switcher-user-copy">
        <div className="uat-switcher-user-heading">
          <div>
            <strong>{user.displayName}</strong>
            <span dir="ltr">{user.email}</span>
          </div>
          <span className={`uat-switcher-user-type ${user.userType.toLowerCase()}`}>
            {user.userType === "EXTERNAL" ? t.external : t.internal}
          </span>
        </div>
        <div className="uat-switcher-badges">
          {user.roles.map((role) => (
            <span key={role.code}>{profileRoleLabel(role.code, locale)}</span>
          ))}
        </div>
        <div className="uat-switcher-user-meta">
          <span>
            <Building2 aria-hidden="true" size={14} />
            {user.clients.length > 0
              ? user.clients.map((client) => `${client.name} (${client.code})`).join("، ")
              : t.noClient}
          </span>
          <span>
            {t.lastLogin}:{" "}
            {user.lastLoginAt ? clientDateTime(user.lastLoginAt, locale) : t.neverLoggedIn}
          </span>
        </div>
      </div>
      <button
        className="os-button os-button-secondary uat-switcher-use-button"
        disabled={busy}
        type="button"
        onClick={() => onSwitch(user)}
      >
        <LogIn aria-hidden="true" size={15} />
        <span>{busy ? t.switching : t.useAccount}</span>
      </button>
    </article>
  );
}

function SwitcherDialog({
  busyUserId,
  error,
  loading,
  locale,
  onClose,
  onRetry,
  onSwitch,
  recentUserIds,
  users,
}: {
  busyUserId: string | null;
  error: string | null;
  loading: boolean;
  locale: SupportedLocale;
  onClose: () => void;
  onRetry: () => void;
  onSwitch: (user: UatImpersonationUser) => void;
  recentUserIds: string[];
  users: UatImpersonationUser[];
}) {
  const t = uatUserSwitcherCopy[locale];
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const roleOptions = useMemo(
    () => [...new Set(users.flatMap((user) => roleCodes(user)))].sort(),
    [users],
  );
  const clientOptions = useMemo(() => {
    const clients = new Map<string, UatImpersonationUser["clients"][number]>();
    users.flatMap((user) => user.clients).forEach((client) => clients.set(client.id, client));
    return [...clients.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [users]);
  const recentUsers = useMemo(() => {
    const usersById = new Map(users.map((user) => [user.id, user]));
    return recentUserIds
      .map((userId) => usersById.get(userId))
      .filter((user): user is UatImpersonationUser => Boolean(user))
      .slice(0, 6);
  }, [recentUserIds, users]);
  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale === "ar" ? "ar" : "en");
    return users.filter((user) => {
      if (roleFilter !== "ALL" && !roleCodes(user).includes(roleFilter)) return false;
      if (clientFilter !== "ALL" && !user.clients.some((client) => client.id === clientFilter)) {
        return false;
      }
      return !normalizedQuery || userSearchText(user, locale).includes(normalizedQuery);
    });
  }, [clientFilter, locale, query, roleFilter, users]);

  return (
    <AppDialog
      busy={busyUserId !== null}
      closeLabel={t.close}
      description={t.description}
      eyebrow={t.eyebrow}
      onClose={onClose}
      size="xl"
      title={t.title}
      warnOnUnsavedChanges={false}
    >
      <div className="uat-switcher-dialog-content">
        <div className="uat-switcher-filters">
          <label className="uat-switcher-search">
            <span>{t.search}</span>
            <span className="uat-switcher-input-wrap">
              <Search aria-hidden="true" size={17} />
              <input
                data-dialog-initial-focus
                placeholder={t.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </span>
          </label>
          <label>
            <span>{t.role}</span>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="ALL">{t.allRoles}</option>
              {roleOptions.map((roleCode) => (
                <option key={roleCode} value={roleCode}>
                  {profileRoleLabel(roleCode, locale)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.client}</span>
            <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
              <option value="ALL">{t.allClients}</option>
              {clientOptions.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.code})
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? <div className="uat-switcher-state">{t.loading}</div> : null}
        {error ? (
          <div className="uat-switcher-state error" role="alert">
            <p>{error}</p>
            <button className="os-button os-button-secondary" type="button" onClick={onRetry}>
              <RotateCcw aria-hidden="true" size={15} />
              <span>{t.retry}</span>
            </button>
          </div>
        ) : null}

        {!loading && !error ? (
          <section className="uat-switcher-quick-section">
            <header>
              <div>
                <span>{t.quickAccounts}</span>
                <p>{t.quickAccountsDescription}</p>
              </div>
            </header>
            {recentUsers.length > 0 ? (
              <div className="uat-switcher-quick-grid">
                {recentUsers.map((user) => (
                  <button
                    key={user.id}
                    disabled={busyUserId !== null}
                    type="button"
                    onClick={() => onSwitch(user)}
                  >
                    <span>
                      {user.roles.length > 0
                        ? user.roles.map((role) => profileRoleLabel(role.code, locale)).join("، ")
                        : t.noRole}
                    </span>
                    <strong>{user.displayName}</strong>
                    <small dir="ltr">{user.email}</small>
                    <ArrowRightLeft aria-hidden="true" size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="uat-switcher-recent-empty">{t.recentAccountsEmpty}</p>
            )}
          </section>
        ) : null}

        {!loading && !error ? (
          <section className="uat-switcher-users-section">
            <header>
              <strong>{t.users}</strong>
              <span aria-live="polite">{t.results(filteredUsers.length)}</span>
            </header>
            {filteredUsers.length > 0 ? (
              <div className="uat-switcher-user-list">
                {filteredUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    busy={busyUserId === user.id}
                    locale={locale}
                    onSwitch={onSwitch}
                    user={user}
                  />
                ))}
              </div>
            ) : (
              <div className="uat-switcher-state">{t.empty}</div>
            )}
          </section>
        ) : null}
      </div>
    </AppDialog>
  );
}

export function UatImpersonationProvider({
  children,
  locale: localeInput,
}: {
  children: ReactNode;
  locale: string;
}) {
  const locale = normalizeLocale(localeInput);
  const t = uatUserSwitcherCopy[locale];
  const [session, setSession] = useState<UatSessionUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [users, setUsers] = useState<UatImpersonationUser[]>([]);
  const [recentUserIds, setRecentUserIds] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadUatSession()
      .then((user) => {
        if (active) setSession(user);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function loadUsers() {
    setLoadingUsers(true);
    setLoadError(null);
    try {
      const directory = await loadUatImpersonationUsers();
      setUsers(directory.users);
      setRecentUserIds(directory.recentUserIds);
    } catch {
      setLoadError(t.loadError);
    } finally {
      setLoadingUsers(false);
    }
  }

  function open() {
    setDialogOpen(true);
    if (users.length === 0 && !loadingUsers) void loadUsers();
  }

  async function switchUser(user: UatImpersonationUser) {
    setBusyUserId(user.id);
    setLoadError(null);
    try {
      const nextUser = await startUatImpersonation(user.id);
      window.location.assign(postLoginRoute(nextUser.roles));
    } catch {
      setLoadError(t.switchError);
      setBusyUserId(null);
    }
  }

  async function returnToAdmin() {
    setReturning(true);
    setReturnError(null);
    try {
      await stopUatImpersonation();
      window.location.assign("/admin");
    } catch {
      setReturnError(t.returnError);
      setReturning(false);
    }
  }

  const value: SwitcherContextValue = {
    locale,
    session,
    open,
    returning,
    returnError,
    returnToAdmin,
  };

  return (
    <SwitcherContext.Provider value={value}>
      {children}
      {dialogOpen ? (
        <SwitcherDialog
          busyUserId={busyUserId}
          error={loadError}
          loading={loadingUsers}
          locale={locale}
          onClose={() => setDialogOpen(false)}
          onRetry={() => void loadUsers()}
          onSwitch={(user) => void switchUser(user)}
          recentUserIds={recentUserIds}
          users={users}
        />
      ) : null}
    </SwitcherContext.Provider>
  );
}

export function UatUserSwitcherTrigger() {
  const context = useSwitcher();
  if (!context?.session?.capabilities?.uatUserSwitcher) return null;
  const t = uatUserSwitcherCopy[context.locale];
  return (
    <button className="uat-user-switcher-trigger" type="button" onClick={context.open}>
      <UserRoundCog aria-hidden="true" size={15} />
      <span>{t.triggerCurrent(context.session.displayName)}</span>
    </button>
  );
}

export function UatImpersonationBanner() {
  const context = useSwitcher();
  const impersonation = context?.session?.impersonation;
  if (!context || !impersonation?.active || !context.session) return null;
  const t = uatUserSwitcherCopy[context.locale];
  return (
    <section className="uat-impersonation-banner" aria-label={t.bannerLabel}>
      <div>
        <ShieldCheck aria-hidden="true" size={18} />
        <span>
          <strong>{t.banner(context.session.displayName)}</strong>
          <small>{t.originalAdmin(impersonation.admin.displayName)}</small>
        </span>
      </div>
      <button
        disabled={context.returning}
        type="button"
        onClick={() => void context.returnToAdmin()}
      >
        <RotateCcw aria-hidden="true" size={15} />
        <span>{context.returning ? t.returning : t.returnToAdmin}</span>
      </button>
      {context.returnError ? <p role="alert">{context.returnError}</p> : null}
    </section>
  );
}
