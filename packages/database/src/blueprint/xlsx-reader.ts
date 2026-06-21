import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { XMLParser } from "fast-xml-parser";
import { unzipSync } from "fflate";

export type WorkbookCellValue = string;
export interface WorkbookRow extends Record<string, WorkbookCellValue> {
  role_code: string;
  role_name: string;
  user_type: string;
  description: string;
  data_scope: string;
  main_capabilities: string;
  restrictions: string;
  capability: string;
  level_code: string;
  label_ar: string;
  purpose: string;
  hours_source: string;
  sla_rule: string;
  scope_rule: string;
  governance_rule: string;
  service_code: string;
  service_id: string;
  name_ar: string;
  name_en: string;
  payment_type: string;
  service_line: string;
  domain: string;
  active: string;
  visible_in_pricing: string;
  basic_hours: string;
  growth_hours: string;
  advanced_hours: string;
  partnership_hours: string;
  selling_hourly_rate_sar: string;
  internal_hourly_cost_sar: string;
  setup_fee_pct: string;
  default_sla_hours: string;
  deduct_hours: string;
  requires_supervisor: string;
  requires_management: string;
  client_approval_required: string;
  used_in: string;
  card_fields: string;
  level_control: string;
  items_rendering_logic: string;
  empty_state_rule: string;
  mobile_rule: string;
  level: string;
  item_count: string;
  included_items_ar: string;
  rendering_instruction: string;
  priority: string;
  item_code: string;
  item_name_ar: string;
  item_name_en: string;
  included_levels: string;
  expected_output: string;
  visible_in_quote: string;
  requires_file: string;
  request_type: string;
  status: string;
  basic: string;
  growth: string;
  advanced: string;
  partnership: string;
  base_price_sar: string;
  estimated_hours: string;
  duration_days: string;
  default_phases: string;
  deliverables: string;
  creates_project: string;
  rule_code: string;
  rule_name: string;
  formula_or_rule: string;
  applies_to: string;
  implementation_owner: string;
  visibility: string;
  validation_id: string;
  entity: string;
  field: string;
  rule: string;
  error_message_ar: string;
  enforced_in: string;
  failure_behavior: string;
  workflow_id: string;
  workflow: string;
  from_state: string;
  to_state: string;
  actor: string;
  condition: string;
  side_effect: string;
  doc_code: string;
  document: string;
  audience: string;
  must_include: string;
  must_exclude: string;
  language_direction: string;
  technical_rule: string;
  pdf: string;
  section: string;
  source: string;
  show_client: string;
  show_internal: string;
  forbidden: string;
  document_scope: string;
  notes: string;
  notification_code: string;
  event: string;
  recipients: string;
  deep_link_target: string;
  channel: string;
  template_id: string;
  recipient: string;
  message_ar: string;
  message_en: string;
  deep_link: string;
  cadence: string;
  reminder_rule: string;
  event_id: string;
  event_code: string;
  trigger: string;
  before_after_required: string;
  audit_required: string;
  severity: string;
  notification: string;
  retention: string;
  route_id: string;
  route: string;
  page: string;
  roles: string;
  sidebar: string;
  mobile_nav: string;
  access_type: string;
  redirect_if_forbidden: string;
  module: string;
  action_id: string;
  screen: string;
  button_label: string;
  visible_when: string;
  action_description: string;
  api: string;
  expected_result: string;
  confirmation_required: string;
  reason_required: string;
  error_state: string;
  state_id: string;
  state: string;
  what_user_sees: string;
  allowed_actions: string;
  forbidden_actions: string;
  form: string;
  label_en: string;
  type: string;
  required: string;
  validation: string;
  default: string;
  editable_by: string;
  visibility_note: string;
  dod_id: string;
  feature: string;
  done_when: string;
  l10n_id: string;
  topic: string;
  requirement: string;
  implementation: string;
}

export interface WorkbookSheet {
  name: string;
  tableName: string | null;
  headers: string[];
  rows: WorkbookRow[];
  sha256: string;
}

export interface WorkbookSnapshot {
  sourceFileName: string;
  sha256: string;
  sheets: WorkbookSheet[];
}

type XmlObject = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  parseTagValue: false,
  removeNSPrefix: true,
  trimValues: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function asObject(value: unknown): XmlObject {
  return typeof value === "object" && value !== null ? (value as XmlObject) : {};
}

function asText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  const object = asObject(value);
  return asText(object["#text"]);
}

function decodeXml(files: Record<string, Uint8Array>, fileName: string): XmlObject {
  const file = files[fileName];
  if (!file) {
    throw new Error(`Workbook entry is missing: ${fileName}`);
  }

  return asObject(parser.parse(new TextDecoder().decode(file)));
}

function hash(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeZipPath(baseFile: string, target: string): string {
  if (target.startsWith("/")) {
    return path.posix.normalize(target.slice(1));
  }

  return path.posix.normalize(path.posix.join(path.posix.dirname(baseFile), target));
}

function columnIndex(reference: string): number {
  const letters = reference.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let result = 0;

  for (const letter of letters) {
    result = result * 26 + letter.charCodeAt(0) - 64;
  }

  return result - 1;
}

function sharedStringValue(value: unknown): string {
  const item = asObject(value);
  if (item.t !== undefined) {
    return asText(item.t);
  }

  return asArray(item.r as XmlObject | XmlObject[] | undefined)
    .map((run) => asText(asObject(run).t))
    .join("");
}

function cellValue(cellValueObject: unknown, sharedStrings: string[]): string {
  const cell = asObject(cellValueObject);
  const type = asText(cell.t);

  if (type === "inlineStr") {
    return sharedStringValue(cell.is);
  }

  const rawValue = asText(cell.v);
  if (type === "s") {
    return sharedStrings[Number(rawValue)] ?? "";
  }
  if (type === "b") {
    return rawValue === "1" ? "true" : "false";
  }

  return rawValue;
}

function relationshipMap(document: XmlObject): Map<string, string> {
  const relationships = asObject(document.Relationships);
  return new Map(
    asArray(relationships.Relationship as XmlObject | XmlObject[] | undefined).map(
      (relationship) => {
        const item = asObject(relationship);
        return [asText(item.Id), asText(item.Target)];
      },
    ),
  );
}

function tableDetails(
  files: Record<string, Uint8Array>,
  sheetFileName: string,
  sheet: XmlObject,
): {
  name: string | null;
  range: string | null;
  headers: string[];
  headerRowCount: number;
} {
  const tableParts = asObject(asObject(sheet.worksheet).tableParts);
  const tablePart = asArray(tableParts.tablePart as XmlObject | XmlObject[] | undefined)[0];
  const relationId = asText(asObject(tablePart).id) || asText(asObject(tablePart)["r:id"]);

  if (!relationId) {
    return { name: null, range: null, headers: [], headerRowCount: 0 };
  }

  const relationshipFile = path.posix.join(
    path.posix.dirname(sheetFileName),
    "_rels",
    `${path.posix.basename(sheetFileName)}.rels`,
  );
  const relationships = relationshipMap(decodeXml(files, relationshipFile));
  const target = relationships.get(relationId);

  if (!target) {
    return { name: null, range: null, headers: [], headerRowCount: 0 };
  }

  const tableFile = normalizeZipPath(sheetFileName, target);
  const table = asObject(decodeXml(files, tableFile).table);
  return {
    name: asText(table.displayName) || asText(table.name) || null,
    range: asText(table.ref) || null,
    headers: asArray(
      asObject(table.tableColumns).tableColumn as XmlObject | XmlObject[] | undefined,
    ).map((column) => asText(asObject(column).name)),
    headerRowCount: Number(asText(table.headerRowCount) || "1"),
  };
}

function parseSheet(
  files: Record<string, Uint8Array>,
  sheetName: string,
  sheetFileName: string,
  sharedStrings: string[],
): WorkbookSheet {
  const document = decodeXml(files, sheetFileName);
  const worksheet = asObject(document.worksheet);
  const sheetData = asObject(worksheet.sheetData);
  const table = tableDetails(files, sheetFileName, document);
  const allRows = asArray(sheetData.row as XmlObject | XmlObject[] | undefined).map((rowValue) => {
    const row = asObject(rowValue);
    const values: string[] = [];
    for (const cell of asArray(row.c as XmlObject | XmlObject[] | undefined)) {
      const reference = asText(asObject(cell).r);
      values[columnIndex(reference)] = cellValue(cell, sharedStrings).trim();
    }
    return {
      rowNumber: Number(asText(row.r) || "0"),
      values,
    };
  });

  const [rangeStart, rangeEnd] = (table.range ?? "").split(":");
  const firstRowNumber = Number(rangeStart?.match(/\d+/)?.[0] ?? "1");
  const lastRowNumber = Number(rangeEnd?.match(/\d+/)?.[0] ?? String(allRows.length));
  const firstColumn = columnIndex(rangeStart || "A1");
  const lastColumn = columnIndex(
    rangeEnd || `${String.fromCharCode(64 + (allRows[0]?.values.length ?? 1))}1`,
  );
  const tableRows = allRows
    .filter(
      (row) =>
        row.rowNumber >= firstRowNumber + table.headerRowCount && row.rowNumber <= lastRowNumber,
    )
    .map((row) => row.values.slice(firstColumn, lastColumn + 1));
  const fallbackHeaderRow = allRows.find((row) => row.rowNumber === firstRowNumber)?.values;
  const headers = (
    table.headers.length > 0
      ? table.headers
      : (fallbackHeaderRow ?? []).slice(firstColumn, lastColumn + 1)
  ).map((header, index) => header || `column_${index + 1}`);
  const dataRows = tableRows;
  const rows = dataRows
    .filter((row) => row.some((value) => (value ?? "").trim().length > 0))
    .map(
      (row) =>
        Object.fromEntries(
          headers.map((header, index) => [header, (row[index] ?? "").trim()]),
        ) as WorkbookRow,
    );
  const canonical = JSON.stringify({ name: sheetName, headers, rows });

  return {
    name: sheetName,
    tableName: table.name,
    headers,
    rows,
    sha256: hash(canonical),
  };
}

export async function readXlsxWorkbook(filePath: string): Promise<WorkbookSnapshot> {
  const file = await readFile(filePath);
  const files = unzipSync(file);
  const workbook = asObject(decodeXml(files, "xl/workbook.xml").workbook);
  const relationships = relationshipMap(decodeXml(files, "xl/_rels/workbook.xml.rels"));
  const sharedStringsDocument = files["xl/sharedStrings.xml"]
    ? decodeXml(files, "xl/sharedStrings.xml")
    : {};
  const sharedStrings = asArray(
    asObject(sharedStringsDocument.sst).si as XmlObject | XmlObject[] | undefined,
  ).map(sharedStringValue);
  const sheetsNode = asObject(workbook.sheets);
  const sheets = asArray(sheetsNode.sheet as XmlObject | XmlObject[] | undefined).map(
    (sheetValue) => {
      const sheet = asObject(sheetValue);
      const sheetName = asText(sheet.name);
      const relationId = asText(sheet.id) || asText(sheet["r:id"]);
      const target = relationships.get(relationId);

      if (!target) {
        throw new Error(`No worksheet relationship found for ${sheetName}`);
      }

      return parseSheet(
        files,
        sheetName,
        normalizeZipPath("xl/workbook.xml", target),
        sharedStrings,
      );
    },
  );

  return {
    sourceFileName: path.basename(filePath),
    sha256: hash(file),
    sheets,
  };
}
