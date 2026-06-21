import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { normalizeBlueprint } from "../dist/blueprint/normalizer.js";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const blueprintDirectory = path.join(workspaceRoot, "data", "blueprints");

function sheet(blueprint, name) {
  const value = blueprint.workbook.sheets.find((entry) => entry.name === name);
  assert.ok(value, `Expected workbook sheet ${name}`);
  return value;
}

function stableHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

test("normalizes the complete available Excel V3 catalog without an item cap", async () => {
  const blueprint = await normalizeBlueprint(blueprintDirectory);
  const compactItems = sheet(blueprint, "13_Service_Items").rows;
  const matrixItems = sheet(blueprint, "53_Service_Item_Level_Matrix").rows;
  const expectedItemCodes = new Set([...compactItems, ...matrixItems].map((row) => row.item_code));

  assert.equal(blueprint.workbook.sheets.length, 55);
  assert.equal(blueprint.workbook.sha256, blueprint.manifest.sha256);
  assert.equal(blueprint.serviceItems.length, expectedItemCodes.size);
  assert.deepEqual(new Set(blueprint.serviceItems.map((item) => item.code)), expectedItemCodes);
  assert.equal(
    blueprint.monthlyServices.length,
    sheet(blueprint, "12_Monthly_Services").rows.length,
  );
  assert.equal(
    blueprint.oneTimeServices.length,
    sheet(blueprint, "14_One_Time_Services").rows.length,
  );
  assert.equal(blueprint.pricingRules.length, sheet(blueprint, "16_Pricing_Rules").rows.length);
  assert.equal(
    blueprint.validationRules.length,
    sheet(blueprint, "41_Validation_Rules").rows.length,
  );
  assert.equal(blueprint.auditEvents.length, sheet(blueprint, "43_Audit_Events").rows.length);
  assert.equal(blueprint.issues.filter((issue) => issue.severity === "ERROR").length, 0);
});

test("preserves package mappings, phases, deliverables, workflows, PDFs, and templates", async () => {
  const blueprint = await normalizeBlueprint(blueprintDirectory);

  for (const row of sheet(blueprint, "53_Service_Item_Level_Matrix").rows) {
    const item = blueprint.serviceItems.find((candidate) => candidate.code === row.item_code);
    assert.ok(item, `Missing normalized service item ${row.item_code}`);
    assert.equal(item.serviceCode, row.service_code);
    for (const levelCode of ["Basic", "Growth", "Advanced", "Partnership"]) {
      const inclusion = item.levelInclusions.find(
        (candidate) => candidate.serviceLevelCode === levelCode,
      );
      assert.ok(inclusion);
      assert.equal(inclusion.included, row[levelCode.toLowerCase()].toLowerCase() === "yes");
    }
  }

  const oneTimeRows = sheet(blueprint, "14_One_Time_Services").rows;
  assert.equal(
    blueprint.oneTimeServices.reduce((total, service) => total + service.phases.length, 0),
    oneTimeRows.reduce(
      (total, row) => total + row.default_phases.split("|").filter((value) => value.trim()).length,
      0,
    ),
  );
  assert.equal(
    blueprint.oneTimeServices.reduce((total, service) => total + service.deliverables.length, 0),
    oneTimeRows.reduce(
      (total, row) => total + row.deliverables.split("|").filter((value) => value.trim()).length,
      0,
    ),
  );
  assert.equal(
    blueprint.workflows.reduce((total, workflow) => total + workflow.transitions.length, 0),
    sheet(blueprint, "18_Workflows").rows.length,
  );
  assert.equal(
    blueprint.pdfTemplates.reduce((total, template) => total + template.fieldMappings.length, 0),
    sheet(blueprint, "42_PDF_Field_Mapping").rows.length,
  );

  const notificationEvents = new Set([
    ...sheet(blueprint, "20_Notifications").rows.map((row) => row.event),
    ...sheet(blueprint, "44_Notification_Templates").rows.map((row) => row.event),
  ]);
  assert.deepEqual(
    new Set(blueprint.notificationTemplates.map((template) => template.event)),
    notificationEvents,
  );
});

test("carries formal route/action additions and Admin-editable configuration structures", async () => {
  const blueprint = await normalizeBlueprint(blueprintDirectory);

  assert.ok(blueprint.routes.some((route) => route.code === "ROUTE-042"));
  assert.ok(blueprint.actions.some((action) => action.code === "ACT-058"));
  assert.ok(
    blueprint.actions
      .filter((action) => action.source === "PR2_CONTROL_UPDATE")
      .every((action) => action.roles.includes("Admin")),
  );
  assert.ok(
    blueprint.monthlyServices.every(
      (service) => service.levelConfigs.length === blueprint.serviceLevels.length,
    ),
  );
  assert.ok(blueprint.settings.some((setting) => setting.key === "payment.iban"));
  assert.ok(blueprint.translations.some((translation) => translation.namespace === "service.item"));
});

test("normalization is deterministic and reference-safe", async () => {
  const first = await normalizeBlueprint(blueprintDirectory);
  const second = await normalizeBlueprint(blueprintDirectory);

  assert.equal(stableHash(first), stableHash(second));

  const monthlyCodes = new Set(first.monthlyServices.map((service) => service.code));
  const levelCodes = new Set(first.serviceLevels.map((level) => level.code));
  for (const item of first.serviceItems) {
    assert.ok(monthlyCodes.has(item.serviceCode));
    for (const inclusion of item.levelInclusions) {
      assert.ok(levelCodes.has(inclusion.serviceLevelCode));
    }
  }
  for (const workflow of first.workflows) {
    const stateCodes = new Set(workflow.states.map((state) => state.code));
    for (const transition of workflow.transitions) {
      assert.ok(stateCodes.has(transition.fromStateCode));
      assert.ok(stateCodes.has(transition.toStateCode));
    }
  }
});
