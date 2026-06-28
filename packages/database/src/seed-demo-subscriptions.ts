import "dotenv/config";

import { Client } from "pg";

const demoBatch = process.env.DEMO_SUBSCRIPTION_BATCH ?? "STAGING-DEMO-2026-06-27";
const demoClientCodes = ["DEMO-ACME-001", "DEMO-NOVA-002", "DEMO-ORBIT-003"] as const;

interface DemoClient {
  id: string;
  code: string;
  name: string;
}

interface ServiceCandidate {
  revisionId: string;
  serviceCode: string;
  serviceName: string;
  serviceLevelId: string;
  levelCode: string;
  hours: string;
}

interface DemoSubscriptionServiceRow {
  id: string;
  monthlyServiceRevisionId: string;
  serviceLevelId: string;
  serviceCode: string | null;
  createdAt: Date;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed demo subscriptions.");
  }

  const database = new Client({ connectionString });
  await database.connect();

  try {
    await database.query("begin");
    const clients = await loadDemoClients(database);
    const services = await loadServiceCandidates(database);
    const subscriptions = [];

    for (const [index, client] of clients.entries()) {
      const selected = selectServicesForClient(services, index);

      const subscriptionId = await ensureSubscription(database, client);
      await reconcileDemoServices(database, client, selected);
      const seededServices = [];

      for (const service of selected) {
        seededServices.push(
          await ensureSubscriptionService(database, client, subscriptionId, service),
        );
      }

      subscriptions.push({
        clientCode: client.code,
        subscriptionId,
        services: seededServices,
      });
    }

    await database.query("commit");
    process.stdout.write(`${JSON.stringify({ demoBatch, subscriptions }, null, 2)}\n`);
  } catch (error) {
    await database.query("rollback");
    throw error;
  } finally {
    await database.end();
  }
}

async function loadDemoClients(database: Client): Promise<DemoClient[]> {
  const result = await database.query<DemoClient>(
    `
      select id, code, name
      from clients
      where code = any($1::text[])
      order by code
    `,
    [demoClientCodes],
  );

  if (result.rows.length !== demoClientCodes.length) {
    throw new Error(
      `Expected ${demoClientCodes.length} demo clients, found ${result.rows.length}.`,
    );
  }

  return result.rows;
}

async function loadServiceCandidates(database: Client): Promise<ServiceCandidate[]> {
  const result = await database.query<ServiceCandidate>(`
    with ranked_configs as (
      select
        msr.id as "revisionId",
        ms.code as "serviceCode",
        msr."nameEn" as "serviceName",
        mlc."serviceLevelId" as "serviceLevelId",
        sl.code as "levelCode",
        mlc.hours::text as "hours",
        ms."sortOrder" as "serviceSortOrder",
        row_number() over (
          partition by ms.code
          order by mlc."sortOrder", sl.code
        ) as rn
      from monthly_service_revisions msr
      join monthly_services ms
        on ms.id = msr."monthlyServiceId"
      join monthly_service_level_configs mlc
        on mlc."monthlyServiceRevisionId" = msr.id
        and mlc."isEnabled" = true
      join service_levels sl
        on sl.id = mlc."serviceLevelId"
        and sl.status = 'ACTIVE'
      where ms.status = 'ACTIVE'
        and msr.status = 'ACTIVE'
        and msr."visibleInPricing" = true
        and (msr."effectiveFrom" is null or msr."effectiveFrom" <= now())
        and (msr."effectiveTo" is null or msr."effectiveTo" > now())
    )
    select
      "revisionId",
      "serviceCode",
      "serviceName",
      "serviceLevelId",
      "levelCode",
      "hours"
    from ranked_configs
    where rn = 1
    order by "serviceSortOrder", "serviceCode"
  `);

  if (result.rows.length < 2) {
    throw new Error("Expected at least 2 active monthly services for demo subscriptions.");
  }

  return result.rows;
}

function selectServicesForClient(
  services: ServiceCandidate[],
  clientIndex: number,
): ServiceCandidate[] {
  const selected = [
    services[(clientIndex * 2) % services.length],
    services[(clientIndex * 2 + 1) % services.length],
  ].filter((service): service is ServiceCandidate => Boolean(service));

  const uniqueCodes = new Set(selected.map((service) => service.serviceCode));
  if (selected.length !== 2 || uniqueCodes.size !== 2) {
    throw new Error(`Unable to select 2 unique services for demo client index ${clientIndex}.`);
  }

  return selected;
}

async function ensureSubscription(database: Client, client: DemoClient): Promise<string> {
  const existing = await database.query<{ id: string }>(
    `
      select s.id
      from subscriptions s
      join subscription_services ss
        on ss."subscriptionId" = s.id
      where s."clientId" = $1
        and s.status = 'ACTIVE'
        and ss."scopeSnapshot"->>'demoBatch' = $2
      order by s."createdAt" asc
      limit 1
    `,
    [client.id, demoBatch],
  );

  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const created = await database.query<{ id: string }>(
    `
      insert into subscriptions (id, "clientId", status, "startsAt", "createdAt", "updatedAt")
      values (gen_random_uuid(), $1, 'ACTIVE', now() - interval '1 day', now(), now())
      returning id
    `,
    [client.id],
  );

  return created.rows[0]!.id;
}

async function reconcileDemoServices(
  database: Client,
  client: DemoClient,
  selectedServices: ServiceCandidate[],
): Promise<void> {
  const selectedByCode = new Map(selectedServices.map((service) => [service.serviceCode, service]));
  const existing = await database.query<DemoSubscriptionServiceRow>(
    `
      select
        ss.id,
        ss."monthlyServiceRevisionId" as "monthlyServiceRevisionId",
        ss."serviceLevelId" as "serviceLevelId",
        ss."scopeSnapshot"->>'serviceCode' as "serviceCode",
        ss."createdAt" as "createdAt"
      from subscription_services ss
      join subscriptions s
        on s.id = ss."subscriptionId"
      where s."clientId" = $1
        and s.status = 'ACTIVE'
        and ss.status = 'ACTIVE'
        and ss."scopeSnapshot"->>'demoBatch' = $2
      order by ss."createdAt" asc, ss.id asc
    `,
    [client.id, demoBatch],
  );

  const keptCodes = new Set<string>();
  const idsToArchive: string[] = [];

  for (const row of existing.rows) {
    const selected = row.serviceCode ? selectedByCode.get(row.serviceCode) : undefined;
    const matchesSelected =
      selected &&
      selected.revisionId === row.monthlyServiceRevisionId &&
      selected.serviceLevelId === row.serviceLevelId;

    if (!selected || !matchesSelected || keptCodes.has(row.serviceCode!)) {
      idsToArchive.push(row.id);
      continue;
    }

    keptCodes.add(row.serviceCode!);
  }

  if (idsToArchive.length === 0) {
    return;
  }

  const archiveMarker = {
    demoArchivedBy: "seed-demo-subscriptions",
    demoArchivedAt: new Date().toISOString(),
  };

  await database.query(
    `
      update subscription_services
      set
        status = 'ARCHIVED',
        "endsAt" = coalesce("endsAt", now()),
        "updatedAt" = now(),
        "scopeSnapshot" = "scopeSnapshot" || $2::jsonb
      where id = any($1::uuid[])
    `,
    [idsToArchive, JSON.stringify(archiveMarker)],
  );
}

async function ensureSubscriptionService(
  database: Client,
  client: DemoClient,
  subscriptionId: string,
  service: ServiceCandidate,
) {
  const existing = await database.query<{ id: string }>(
    `
      select id
      from subscription_services
      where "subscriptionId" = $1
        and "monthlyServiceRevisionId" = $2
        and "serviceLevelId" = $3
        and status = 'ACTIVE'
        and "scopeSnapshot"->>'demoBatch' = $4
        and "scopeSnapshot"->>'serviceCode' = $5
      limit 1
    `,
    [subscriptionId, service.revisionId, service.serviceLevelId, demoBatch, service.serviceCode],
  );

  if (existing.rows[0]) {
    return {
      id: existing.rows[0].id,
      serviceCode: service.serviceCode,
      levelCode: service.levelCode,
      action: "already_exists",
    };
  }

  const snapshot = {
    demo: true,
    demoBatch,
    createdFor: "staging QA",
    clientCode: client.code,
    serviceCode: service.serviceCode,
    serviceName: service.serviceName,
    serviceLevelCode: service.levelCode,
  };

  const created = await database.query<{ id: string }>(
    `
      insert into subscription_services (
        id,
        "subscriptionId",
        "monthlyServiceRevisionId",
        "serviceLevelId",
        "hoursAllocated",
        "startsAt",
        status,
        "scopeSnapshot",
        "createdAt",
        "updatedAt"
      )
      values (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        now() - interval '1 day',
        'ACTIVE',
        $5::jsonb,
        now(),
        now()
      )
      returning id
    `,
    [
      subscriptionId,
      service.revisionId,
      service.serviceLevelId,
      service.hours,
      JSON.stringify(snapshot),
    ],
  );

  await database.query(
    `
      insert into subscription_service_history (
        id,
        "subscriptionServiceId",
        "effectiveAt",
        "changeType",
        "afterSnapshot",
        reason,
        "createdAt"
      )
      values (gen_random_uuid(), $1, now(), 'DEMO_CREATED', $2::jsonb, $3, now())
    `,
    [
      created.rows[0]!.id,
      JSON.stringify(snapshot),
      `Created ${demoBatch} staging demo subscription`,
    ],
  );

  return {
    id: created.rows[0]!.id,
    serviceCode: service.serviceCode,
    levelCode: service.levelCode,
    action: "created",
  };
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Demo subscription seed failed: ${message}\n`);
  process.exitCode = 1;
});
