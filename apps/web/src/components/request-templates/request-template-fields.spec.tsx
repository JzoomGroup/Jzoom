import { fireEvent, render, screen } from "@testing-library/react";
import type { RequestTemplateVersion } from "../../lib/request-template-types";
import { RequestTemplateFields } from "./request-template-fields";

function template(): RequestTemplateVersion {
  return {
    id: "version-1",
    templateId: "template-1",
    serviceItemId: "service-item-1",
    version: 1,
    status: "ACTIVE",
    instructionsAr: "أكمل البيانات التالية.",
    instructionsEn: "Complete the following details.",
    effectiveFrom: null,
    effectiveTo: null,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    sections: [
      {
        id: "section-1",
        code: "details",
        titleAr: "تفاصيل الطلب",
        titleEn: "Request details",
        descriptionAr: null,
        descriptionEn: null,
        status: "ACTIVE",
        sortOrder: 1,
      },
    ],
    fields: [
      {
        id: "note-1",
        code: "note",
        sectionCode: "details",
        libraryFieldCode: null,
        systemKey: null,
        fieldType: "NOTE",
        labelAr: "ملاحظة مهمة",
        labelEn: "Important note",
        helpTextAr: "ارفع نسخة واضحة من المستند.",
        helpTextEn: null,
        required: false,
        clientVisible: true,
        defaultValue: null,
        validation: { layoutWidth: "FULL" },
        source: "CUSTOM",
        status: "ACTIVE",
        sortOrder: 1,
        options: [],
      },
      {
        id: "file-1",
        code: "commercial_registration",
        sectionCode: "details",
        libraryFieldCode: null,
        systemKey: null,
        fieldType: "FILE",
        labelAr: "السجل التجاري",
        labelEn: "Commercial registration",
        helpTextAr: null,
        helpTextEn: null,
        required: true,
        clientVisible: true,
        defaultValue: null,
        validation: { accept: ".pdf", layoutWidth: "FULL" },
        source: "CUSTOM",
        status: "ACTIVE",
        sortOrder: 2,
        options: [],
      },
    ],
    downloadableFiles: [],
    documentChecklist: [],
  };
}

describe("RequestTemplateFields", () => {
  it("renders notes and returns selected files to the request flow", () => {
    const onChange = jest.fn();
    const onFilesChange = jest.fn();
    render(
      <RequestTemplateFields
        locale="ar"
        template={template()}
        values={{}}
        onChange={onChange}
        onFilesChange={onFilesChange}
      />,
    );

    expect(screen.getByText("ملاحظة مهمة")).toBeInTheDocument();
    expect(screen.getByText("ارفع نسخة واضحة من المستند.")).toBeInTheDocument();

    const file = new File(["content"], "registration.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/السجل التجاري/), {
      target: { files: [file] },
    });

    expect(onFilesChange).toHaveBeenCalledWith("commercial_registration", [file]);
    expect(onChange).toHaveBeenCalledWith("commercial_registration", "registration.pdf");
  });

  it("does not render internal or disabled fields in the client form", () => {
    const value = template();
    value.fields.push({
      ...value.fields[0]!,
      id: "internal-field",
      code: "internal_note",
      labelAr: "تعليمات داخلية",
      clientVisible: false,
    });
    value.fields.push({
      ...value.fields[0]!,
      id: "disabled-field",
      code: "disabled_note",
      labelAr: "حقل مؤرشف",
      status: "DISABLED",
    });

    render(
      <RequestTemplateFields locale="ar" template={value} values={{}} onChange={() => undefined} />,
    );

    expect(screen.queryByText("تعليمات داخلية")).not.toBeInTheDocument();
    expect(screen.queryByText("حقل مؤرشف")).not.toBeInTheDocument();
  });
});
