import {
  defaultField,
  defaultSection,
  validateEditableConfig,
  type EditableTemplateConfig,
} from "./request-template-designer-model";

function config(): EditableTemplateConfig {
  const section = defaultSection();
  return {
    documentChecklist: [],
    downloadableFiles: [],
    fields: [defaultField(section.code, "SHORT_TEXT", [])],
    instructionsAr: "",
    instructionsEn: "",
    reason: "اختبار",
    sections: [section],
    status: "DRAFT",
  };
}

describe("request template designer validation", () => {
  it("accepts a structurally valid published template", () => {
    expect(validateEditableConfig(config(), "ACTIVE")).toBeNull();
  });

  it("blocks duplicate field codes before calling the API", () => {
    const value = config();
    value.fields[0]!.code = "employee-name";
    value.fields.push({ ...value.fields[0]!, code: "EMPLOYEE NAME" });

    expect(validateEditableConfig(value, "DRAFT")).toBe("رموز الحقول يجب أن تكون مختلفة.");
  });

  it("requires note content before publishing", () => {
    const value = config();
    value.fields = [defaultField(value.sections[0]!.code, "NOTE", [])];
    value.fields[0]!.helpTextAr = "";

    expect(validateEditableConfig(value, "ACTIVE")).toBe("اكتب نص الملاحظة: ملاحظة مهمة.");
  });
});
