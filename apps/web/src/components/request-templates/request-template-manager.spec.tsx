import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RequestTemplateManager } from "./request-template-manager";
import { reviseRequestTemplate } from "../../lib/request-templates-client";
import type { RequestTemplatesSnapshot } from "../../lib/request-template-types";

jest.mock("../../lib/request-templates-client", () => ({
  applySuggestedRequestTemplate: jest.fn(),
  changeRequestTemplateVersionStatus: jest.fn(),
  createRequestFieldLibraryItem: jest.fn(),
  refreshRequestTemplates: jest.fn(),
  requestTemplateErrorMessage: () => "Template request failed",
  reviseRequestTemplate: jest.fn(),
}));

function snapshot(): RequestTemplatesSnapshot {
  return {
    fieldLibrary: [
      {
        id: "library-field-1",
        code: "employee_count",
        fieldType: "NUMBER",
        labelAr: "Employee count",
        labelEn: "Employee count",
        helpTextAr: null,
        helpTextEn: null,
        placeholderAr: null,
        placeholderEn: null,
        systemKey: "employee_count",
        defaultConfig: null,
        status: "ACTIVE",
        sortOrder: 1,
        archivedAt: null,
        createdAt: "2026-06-28T00:00:00.000Z",
        updatedAt: "2026-06-28T00:00:00.000Z",
      },
    ],
    serviceItems: [
      {
        id: "service-item-1",
        code: "SI-HR-POLICY",
        status: "ACTIVE",
        sortOrder: 1,
        monthlyService: { id: "service-1", code: "MS-HR" },
        latestRevision: {
          id: "service-item-revision-1",
          version: 1,
          nameAr: "HR policy preparation",
          nameEn: "HR policy preparation",
          expectedOutput: "Prepared HR policy.",
          requiresFile: false,
        },
        template: null,
      },
    ],
  };
}

describe("RequestTemplateManager", () => {
  beforeEach(() => {
    jest.mocked(reviseRequestTemplate).mockReset();
  });

  it("builds and saves a service item request template without JSON editing", async () => {
    const nextSnapshot = snapshot();
    nextSnapshot.serviceItems[0] = {
      ...nextSnapshot.serviceItems[0]!,
      template: {
        id: "template-1",
        status: "ACTIVE",
        active: null,
        suggested: null,
        drafts: [],
        archivedCount: 0,
      },
    };
    jest.mocked(reviseRequestTemplate).mockResolvedValue(nextSnapshot);

    render(<RequestTemplateManager initialSnapshot={snapshot()} />);

    expect(screen.getByRole("heading", { name: "Service item form builder" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Template config JSON")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    const fieldGroup = screen.getByRole("group", { name: "Field 1" });
    fireEvent.change(within(fieldGroup).getByLabelText("English label"), {
      target: { value: "Number of employees" },
    });
    fireEvent.change(within(fieldGroup).getByLabelText("Arabic label"), {
      target: { value: "Number of employees" },
    });
    fireEvent.change(within(fieldGroup).getByLabelText("Type"), {
      target: { value: "NUMBER" },
    });
    fireEvent.click(within(fieldGroup).getByLabelText("Required"));

    fireEvent.click(screen.getByRole("button", { name: "Save new template version" }));

    await waitFor(() => expect(reviseRequestTemplate).toHaveBeenCalledTimes(1));
    expect(reviseRequestTemplate).toHaveBeenCalledWith(
      "service-item-1",
      expect.objectContaining({
        status: "DRAFT",
        reason: "Created from Admin form builder",
        sections: [
          expect.objectContaining({
            code: "basic_request_information",
            titleEn: "Basic request information",
          }),
        ],
        fields: [
          expect.objectContaining({
            code: "field_1",
            fieldType: "NUMBER",
            labelEn: "Number of employees",
            required: true,
            clientVisible: true,
          }),
        ],
      }),
    );
  });

  it("applies a practical preset before saving a template version", async () => {
    jest.mocked(reviseRequestTemplate).mockResolvedValue(snapshot());

    render(<RequestTemplateManager initialSnapshot={snapshot()} />);

    fireEvent.click(screen.getByRole("button", { name: /مستندات الموارد البشرية/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save new template version" }));

    await waitFor(() => expect(reviseRequestTemplate).toHaveBeenCalledTimes(1));
    expect(reviseRequestTemplate).toHaveBeenCalledWith(
      "service-item-1",
      expect.objectContaining({
        fields: expect.arrayContaining([
          expect.objectContaining({
            code: "employee_name",
            labelAr: "اسم الموظف",
            required: true,
          }),
          expect.objectContaining({
            code: "document_purpose",
            fieldType: "DROPDOWN",
            options: expect.arrayContaining([
              expect.objectContaining({ value: "bank", labelAr: "بنك" }),
            ]),
          }),
        ]),
        documentChecklist: expect.arrayContaining([
          expect.objectContaining({
            code: "supporting_documents",
            labelAr: "المستندات الداعمة",
          }),
        ]),
      }),
    );
  });
});
