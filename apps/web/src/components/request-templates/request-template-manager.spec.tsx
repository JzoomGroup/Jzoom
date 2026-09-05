import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createRequestFieldLibraryItem,
  refreshRequestTemplates,
  reviseRequestTemplate,
} from "../../lib/request-templates-client";
import type { RequestTemplatesSnapshot } from "../../lib/request-template-types";
import { RequestTemplateManager } from "./request-template-manager";

jest.mock("../../lib/request-templates-client", () => ({
  applySuggestedRequestTemplate: jest.fn(),
  changeRequestTemplateVersionStatus: jest.fn(),
  createRequestFieldLibraryItem: jest.fn(),
  refreshRequestTemplates: jest.fn(),
  requestTemplateErrorMessage: () => "تعذر تنفيذ العملية.",
  reviseRequestTemplate: jest.fn(),
  updateRequestFieldLibraryItem: jest.fn(),
}));

function snapshot(): RequestTemplatesSnapshot {
  return {
    fieldLibrary: [
      {
        id: "library-field-1",
        code: "employee_count",
        fieldType: "NUMBER",
        labelAr: "عدد الموظفين",
        labelEn: "Employee count",
        helpTextAr: "أدخل العدد الحالي للموظفين.",
        helpTextEn: null,
        placeholderAr: "مثال: 25",
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
        monthlyService: {
          id: "service-1",
          code: "MS-HR",
          revisions: [{ nameAr: "الموارد البشرية", nameEn: "Human resources" }],
        },
        latestRevision: {
          id: "service-item-revision-1",
          version: 1,
          nameAr: "إعداد سياسة موارد بشرية",
          nameEn: "HR policy preparation",
          expectedOutput: "سياسة موارد بشرية جاهزة للاعتماد.",
          requiresFile: false,
        },
        template: null,
      },
    ],
  };
}

describe("RequestTemplateManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("builds a field visually, previews it, and saves a draft", async () => {
    jest.mocked(reviseRequestTemplate).mockResolvedValue(snapshot());
    render(<RequestTemplateManager initialSnapshot={snapshot()} />);

    expect(screen.getByRole("heading", { name: "مصمم نماذج الطلبات" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "النماذج" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("الخدمة الرئيسية")).toHaveDisplayValue("الموارد البشرية");
    expect(screen.getByLabelText("بند الخدمة")).toHaveDisplayValue("إعداد سياسة موارد بشرية");
    const clientPreview = screen.getByTestId("request-template-client-preview");
    expect(clientPreview).toHaveTextContent("إنشاء طلب جديد");
    expect(clientPreview).toHaveTextContent("الموارد البشرية");
    expect(clientPreview).toHaveTextContent("إعداد سياسة موارد بشرية");

    fireEvent.click(screen.getByRole("button", { name: "إضافة عنصر" }));
    fireEvent.click(screen.getByRole("button", { name: "رقم" }));
    fireEvent.change(screen.getByLabelText("اسم الحقل"), {
      target: { value: "عدد الموظفين المطلوب" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /حقل إلزامي/ }));

    expect(screen.getAllByText("عدد الموظفين المطلوب").length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("button", { name: "حفظ كمسودة" }));

    await waitFor(() => expect(reviseRequestTemplate).toHaveBeenCalledTimes(1));
    expect(reviseRequestTemplate).toHaveBeenCalledWith(
      "service-item-1",
      expect.objectContaining({
        status: "DRAFT",
        fields: [
          expect.objectContaining({
            fieldType: "NUMBER",
            labelAr: "عدد الموظفين المطلوب",
            labelEn: "عدد الموظفين المطلوب",
            required: true,
          }),
        ],
      }),
    );
  });

  it("adds instructional notes and document upload fields to the real client preview", async () => {
    jest.mocked(reviseRequestTemplate).mockResolvedValue(snapshot());
    render(<RequestTemplateManager initialSnapshot={snapshot()} />);

    fireEvent.click(screen.getByRole("button", { name: "إضافة عنصر" }));
    fireEvent.click(screen.getByRole("button", { name: "ملاحظة إرشادية" }));
    fireEvent.change(screen.getByLabelText("عنوان الملاحظة"), {
      target: { value: "تنبيه قبل الإرسال" },
    });
    fireEvent.change(screen.getByLabelText("نص الملاحظة"), {
      target: { value: "تأكد من مطابقة البيانات للمستند الرسمي." },
    });

    expect(screen.getAllByText("تنبيه قبل الإرسال").length).toBeGreaterThan(1);
    expect(screen.getAllByText("تأكد من مطابقة البيانات للمستند الرسمي.").length).toBeGreaterThan(
      1,
    );

    fireEvent.click(screen.getByRole("button", { name: "إضافة عنصر" }));
    fireEvent.click(screen.getByRole("button", { name: "رفع مستند" }));
    fireEvent.change(screen.getByLabelText("اسم الحقل"), {
      target: { value: "السجل التجاري" },
    });

    expect(screen.getAllByText("السجل التجاري").length).toBeGreaterThan(1);
    expect(screen.getByLabelText("معاينة الجوال")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "نشر للعميل" }));
    await waitFor(() => expect(reviseRequestTemplate).toHaveBeenCalledTimes(1));
    expect(reviseRequestTemplate).toHaveBeenCalledWith(
      "service-item-1",
      expect.objectContaining({
        status: "ACTIVE",
        fields: expect.arrayContaining([
          expect.objectContaining({ fieldType: "NOTE", required: false }),
          expect.objectContaining({ fieldType: "FILE", labelAr: "السجل التجاري" }),
        ]),
      }),
    );
  });

  it("creates reusable fields from the shared fields tab", async () => {
    jest.mocked(createRequestFieldLibraryItem).mockResolvedValue(snapshot().fieldLibrary[0]!);
    jest.mocked(refreshRequestTemplates).mockResolvedValue(snapshot());
    render(<RequestTemplateManager initialSnapshot={snapshot()} />);

    fireEvent.click(screen.getByRole("button", { name: "إضافة عنصر" }));
    fireEvent.click(screen.getByRole("button", { name: "رقم" }));
    fireEvent.change(screen.getByLabelText("اسم الحقل"), {
      target: { value: "تعديل غير محفوظ" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /الحقول المشتركة/ }));
    fireEvent.click(screen.getByRole("button", { name: "حقل مشترك جديد" }));
    fireEvent.change(screen.getByLabelText("اسم الحقل بالعربية"), {
      target: { value: "رقم الموظف" },
    });
    fireEvent.change(screen.getByLabelText("نوع الحقل"), { target: { value: "NUMBER" } });
    fireEvent.click(screen.getByRole("button", { name: "إنشاء الحقل" }));

    await waitFor(() => expect(createRequestFieldLibraryItem).toHaveBeenCalledTimes(1));
    expect(createRequestFieldLibraryItem).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldType: "NUMBER",
        labelAr: "رقم الموظف",
        labelEn: "رقم الموظف",
      }),
    );
    await waitFor(() => expect(screen.getByRole("tab", { name: "النماذج" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: "النماذج" }));
    expect(screen.getAllByText("تعديل غير محفوظ").length).toBeGreaterThan(1);
  });

  it("keeps internal fields hidden from the client and preserves their visibility setting", async () => {
    jest.mocked(reviseRequestTemplate).mockResolvedValue(snapshot());
    render(<RequestTemplateManager initialSnapshot={snapshot()} />);

    fireEvent.click(screen.getByRole("button", { name: "إضافة عنصر" }));
    fireEvent.click(screen.getByRole("button", { name: "نص قصير" }));
    fireEvent.change(screen.getByLabelText("اسم الحقل"), {
      target: { value: "ملاحظة تشغيلية داخلية" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /يظهر للعميل/ }));

    expect(screen.getAllByText("ملاحظة تشغيلية داخلية")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "حفظ كمسودة" }));

    await waitFor(() => expect(reviseRequestTemplate).toHaveBeenCalledTimes(1));
    expect(reviseRequestTemplate).toHaveBeenCalledWith(
      "service-item-1",
      expect.objectContaining({
        fields: [expect.objectContaining({ clientVisible: false })],
      }),
    );
  });
});
