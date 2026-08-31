import { RequestQueue } from "../../../components/requests/request-queue";
import { QuoteShell } from "../../../components/quotes/quote-shell";
import { getCurrentUser } from "../../../lib/auth";
import { requireRequestIntakeOptions, requireRequestQueue } from "../../../lib/request-server";
import { redirect } from "next/navigation";
import { firstQueryValue, type QueryValue } from "../../../lib/url-state";

const queueCodes = ["all", "specialist", "supervisor", "account-manager"] as const;
const statusCodes = [
  "NEW",
  "TRIAGE",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_SUPERVISOR",
  "COMPLETED",
  "RETURNED",
] as const;
const priorityCodes = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

function member<T extends readonly string[]>(value: string, allowed: T): T[number] | "" {
  return allowed.includes(value as T[number]) ? (value as T[number]) : "";
}

function canUseQueues(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return Boolean(
    user &&
    user.roles.some((role) =>
      ["ROLE-ADMIN", "ROLE-MGMT", "ROLE-AM", "ROLE-SPECIALIST", "ROLE-SUPERVISOR"].includes(role),
    ),
  );
}

export default async function RequestQueuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, QueryValue>>;
}) {
  const params = await searchParams;
  const selectedQueue = member(firstQueryValue(params.queue), queueCodes) || "all";
  const urlFilters = {
    assigneeId: firstQueryValue(params.assigneeId),
    clientId: firstQueryValue(params.clientId),
    dueTo: firstQueryValue(params.dueTo),
    priority: member(firstQueryValue(params.priority), priorityCodes),
    serviceId: firstQueryValue(params.serviceId),
    status: member(firstQueryValue(params.status), statusCodes),
  };
  const apiFilters = Object.fromEntries(
    Object.entries(urlFilters).filter(([, value]) => value.length > 0),
  );
  const [user, queue, intakeOptions] = await Promise.all([
    getCurrentUser(),
    requireRequestQueue(selectedQueue, apiFilters),
    requireRequestIntakeOptions(),
  ]);
  if (!user) {
    redirect("/login");
  }
  if (!canUseQueues(user)) {
    redirect("/403");
  }

  return (
    <QuoteShell
      activePath="/requests/queues"
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      <RequestQueue
        initialQueue={queue}
        initialFilters={urlFilters}
        intakeOptions={intakeOptions}
        locale={user.preferredLocale}
      />
    </QuoteShell>
  );
}
