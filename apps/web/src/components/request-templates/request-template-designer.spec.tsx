import { render, screen, waitFor } from "@testing-library/react";
import {
  defaultField,
  defaultSection,
  type EditableTemplateConfig,
} from "./request-template-designer-model";
import { RequestTemplateDesigner } from "./request-template-designer";

function config(label: string, code: string): EditableTemplateConfig {
  const section = defaultSection();
  return {
    documentChecklist: [],
    downloadableFiles: [],
    fields: [{ ...defaultField(section.code, "SHORT_TEXT", []), code, labelAr: label }],
    instructionsAr: "",
    instructionsEn: "",
    reason: "اختبار",
    sections: [section],
    status: "DRAFT",
  };
}

describe("RequestTemplateDesigner", () => {
  it("selects the first field when a different service item is loaded", async () => {
    const { rerender } = render(
      <RequestTemplateDesigner
        config={config("الحقل الأول", "first")}
        fieldLibrary={[]}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByDisplayValue("الحقل الأول")).toBeInTheDocument();

    rerender(
      <RequestTemplateDesigner
        config={config("الحقل الثاني", "second")}
        fieldLibrary={[]}
        onChange={jest.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByDisplayValue("الحقل الثاني")).toBeInTheDocument());
  });
});
