import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { createDatabaseClient, normalizeBlueprint, seedBlueprint } from "../dist/index.js";

const integrationEnabled = process.env.DATABASE_INTEGRATION === "true";

test(
  "applies the V3 seed idempotently without duplicate revisions",
  { skip: !integrationEnabled },
  async () => {
    const connectionString = process.env.DATABASE_URL;
    assert.ok(connectionString);

    const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
    const blueprint = await normalizeBlueprint(path.join(workspaceRoot, "data", "blueprints"));
    const database = createDatabaseClient(connectionString);

    try {
      const first = await seedBlueprint(database, blueprint);
      const countsAfterFirst = {
        imports: await database.blueprintImport.count(),
        sheets: await database.blueprintSheetSnapshot.count(),
        monthly: await database.monthlyService.count(),
        monthlyCategories: await database.monthlyServiceCategory.count(),
        monthlyRevisions: await database.monthlyServiceRevision.count(),
        items: await database.serviceItem.count(),
        itemRevisions: await database.serviceItemRevision.count(),
        oneTime: await database.oneTimeService.count(),
        oneTimeCategories: await database.oneTimeServiceCategory.count(),
        workflows: await database.workflowDefinition.count(),
        routes: await database.routeDefinition.count(),
        actions: await database.actionDefinition.count(),
        requestFieldLibrary: await database.requestFieldLibraryItem.count(),
        requestTemplates: await database.requestTemplate.count(),
      };

      const second = await seedBlueprint(database, blueprint);
      const countsAfterSecond = {
        imports: await database.blueprintImport.count(),
        sheets: await database.blueprintSheetSnapshot.count(),
        monthly: await database.monthlyService.count(),
        monthlyCategories: await database.monthlyServiceCategory.count(),
        monthlyRevisions: await database.monthlyServiceRevision.count(),
        items: await database.serviceItem.count(),
        itemRevisions: await database.serviceItemRevision.count(),
        oneTime: await database.oneTimeService.count(),
        oneTimeCategories: await database.oneTimeServiceCategory.count(),
        workflows: await database.workflowDefinition.count(),
        routes: await database.routeDefinition.count(),
        actions: await database.actionDefinition.count(),
        requestFieldLibrary: await database.requestFieldLibraryItem.count(),
        requestTemplates: await database.requestTemplate.count(),
      };

      assert.deepEqual(countsAfterSecond, countsAfterFirst);
      assert.equal(second.alreadyApplied, true);
      assert.equal(first.blueprintImportId, second.blueprintImportId);
      assert.equal(countsAfterSecond.sheets, blueprint.workbook.sheets.length);
      assert.equal(countsAfterSecond.items, blueprint.serviceItems.length);
      assert.equal(
        countsAfterSecond.monthlyCategories,
        new Set(blueprint.monthlyServices.map((service) => service.domain)).size,
      );
      assert.equal(
        countsAfterSecond.oneTimeCategories,
        new Set(blueprint.oneTimeServices.map((service) => service.serviceLine)).size,
      );
      assert.equal(countsAfterSecond.routes, blueprint.routes.length);
      assert.equal(countsAfterSecond.actions, blueprint.actions.length);
      assert.ok(countsAfterSecond.requestFieldLibrary >= 20);
      assert.equal(countsAfterSecond.requestTemplates, blueprint.serviceItems.length);
      assert.equal(await database.user.count(), 0);
      assert.equal(await database.client.count(), 0);
    } finally {
      await database.$disconnect();
    }
  },
);
