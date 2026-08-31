"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Library,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type {
  RequestFieldLibraryItem,
  RequestTemplateFieldType,
} from "../../lib/request-template-types";
import { EmptyState } from "../catalog/catalog-shared";
import {
  defaultField,
  defaultOption,
  defaultSection,
  fieldFromLibrary,
  optionFieldTypes,
  uniqueCode,
  validationRecord,
  withValidation,
  type EditableField,
  type EditableTemplateConfig,
} from "./request-template-designer-model";
import {
  fieldTypeLabels,
  FieldTypeIcon,
  quickFieldTypes,
  reusableFieldTypes,
} from "./request-template-field-meta";

function normalizeSortOrder(fields: EditableField[]) {
  return fields.map((field, index) => ({ ...field, sortOrder: index + 1 }));
}

export function RequestTemplateDesigner({
  config,
  fieldLibrary,
  onChange,
}: {
  config: EditableTemplateConfig;
  fieldLibrary: RequestFieldLibraryItem[];
  onChange: (config: EditableTemplateConfig) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [selectedFieldCode, setSelectedFieldCode] = useState(config.fields[0]?.code ?? "");
  const [targetSectionCode, setTargetSectionCode] = useState(config.sections[0]?.code ?? "");
  const selectedFieldIndex = config.fields.findIndex((field) => field.code === selectedFieldCode);
  const selectedField = selectedFieldIndex >= 0 ? config.fields[selectedFieldIndex] : null;
  const activeLibrary = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();
    return fieldLibrary
      .filter((field) => field.status === "ACTIVE" && field.fieldType !== "NOTE")
      .filter((field) =>
        query
          ? [field.labelAr, field.labelEn, field.code].join(" ").toLowerCase().includes(query)
          : true,
      );
  }, [fieldLibrary, libraryQuery]);

  useEffect(() => {
    if (!config.fields.some((field) => field.code === selectedFieldCode)) {
      setSelectedFieldCode(config.fields[0]?.code ?? "");
    }
    if (!config.sections.some((section) => section.code === targetSectionCode)) {
      setTargetSectionCode(config.sections[0]?.code ?? "");
    }
  }, [config.fields, config.sections, selectedFieldCode, targetSectionCode]);

  function updateField(index: number, patch: Partial<EditableField>) {
    onChange({
      ...config,
      fields: config.fields.map((field, currentIndex) =>
        currentIndex === index ? { ...field, ...patch } : field,
      ),
    });
  }

  function updateSelectedField(patch: Partial<EditableField>) {
    if (selectedFieldIndex < 0) return;
    updateField(selectedFieldIndex, patch);
  }

  function updateValidation(patch: Record<string, unknown | undefined>) {
    if (!selectedField || selectedFieldIndex < 0) return;
    updateField(selectedFieldIndex, withValidation(selectedField, patch));
  }

  function addField(type: RequestTemplateFieldType) {
    const sectionCode = targetSectionCode || config.sections[0]?.code || "";
    const field = defaultField(
      sectionCode,
      type,
      config.fields.map((item) => item.code),
    );
    onChange({ ...config, fields: normalizeSortOrder([...config.fields, field]) });
    setSelectedFieldCode(field.code);
    setAddOpen(false);
  }

  function addLibraryField(libraryField: RequestFieldLibraryItem) {
    const field = fieldFromLibrary(
      libraryField,
      targetSectionCode || config.sections[0]?.code || "",
      config.fields.map((item) => item.code),
    );
    onChange({ ...config, fields: normalizeSortOrder([...config.fields, field]) });
    setSelectedFieldCode(field.code);
    setAddOpen(false);
    setLibraryQuery("");
  }

  function removeField(index: number) {
    const remaining = config.fields.filter((_, currentIndex) => currentIndex !== index);
    onChange({ ...config, fields: normalizeSortOrder(remaining) });
    setSelectedFieldCode(remaining[Math.min(index, remaining.length - 1)]?.code ?? "");
  }

  function duplicateField(index: number) {
    const source = config.fields[index];
    if (!source) return;
    const duplicate = {
      ...source,
      code: uniqueCode(
        source.code,
        config.fields.map((field) => field.code),
      ),
      labelAr: `${source.labelAr} - نسخة`,
      labelEn: `${source.labelEn || source.labelAr} - Copy`,
      libraryFieldCode: "",
    };
    const fields = [...config.fields];
    fields.splice(index + 1, 0, duplicate);
    onChange({ ...config, fields: normalizeSortOrder(fields) });
    setSelectedFieldCode(duplicate.code);
  }

  function moveField(index: number, direction: -1 | 1) {
    const field = config.fields[index];
    if (!field) return;
    const sectionIndexes = config.fields
      .map((candidate, candidateIndex) =>
        candidate.sectionCode === field.sectionCode ? candidateIndex : -1,
      )
      .filter((candidateIndex) => candidateIndex >= 0);
    const position = sectionIndexes.indexOf(index);
    const targetIndex = sectionIndexes[position + direction];
    if (targetIndex === undefined) return;
    const fields = [...config.fields];
    [fields[index], fields[targetIndex]] = [fields[targetIndex]!, fields[index]!];
    onChange({ ...config, fields: normalizeSortOrder(fields) });
  }

  function addSection() {
    const section = {
      ...defaultSection(config.sections.length),
      code: uniqueCode(
        "section",
        config.sections.map((item) => item.code),
      ),
    };
    onChange({ ...config, sections: [...config.sections, section] });
    setTargetSectionCode(section.code);
  }

  function updateSection(index: number, patch: Partial<(typeof config.sections)[number]>) {
    const previous = config.sections[index];
    if (!previous) return;
    const next = { ...previous, ...patch };
    onChange({
      ...config,
      sections: config.sections.map((section, currentIndex) =>
        currentIndex === index ? next : section,
      ),
      fields:
        patch.code && patch.code !== previous.code
          ? config.fields.map((field) =>
              field.sectionCode === previous.code ? { ...field, sectionCode: patch.code! } : field,
            )
          : config.fields,
    });
    if (targetSectionCode === previous.code && patch.code) setTargetSectionCode(patch.code);
  }

  function removeSection(index: number) {
    if (config.sections.length === 1) return;
    const removed = config.sections[index];
    if (!removed) return;
    const sections = config.sections.filter((_, currentIndex) => currentIndex !== index);
    const fallback = sections[0]?.code ?? "";
    onChange({
      ...config,
      sections: sections.map((section, currentIndex) => ({
        ...section,
        sortOrder: currentIndex + 1,
      })),
      fields: config.fields.map((field) =>
        field.sectionCode === removed.code ? { ...field, sectionCode: fallback } : field,
      ),
    });
    setTargetSectionCode(fallback);
  }

  function updateOption(index: number, patch: Record<string, string | boolean | number>) {
    if (!selectedField) return;
    updateSelectedField({
      options: selectedField.options.map((option, currentIndex) =>
        currentIndex === index ? { ...option, ...patch } : option,
      ),
    });
  }

  const fieldValidation = selectedField ? validationRecord(selectedField) : {};

  return (
    <div className="template-designer-layout">
      <section className="template-canvas" aria-label="مصمم النموذج">
        <header className="template-canvas-header">
          <div>
            <span>بناء النموذج</span>
            <strong>
              {config.fields.length} عناصر في {config.sections.length} أقسام
            </strong>
          </div>
          <button className="os-button os-button-secondary" type="button" onClick={addSection}>
            <Plus aria-hidden="true" size={16} />
            إضافة قسم
          </button>
        </header>

        <label className="template-instructions-field">
          رسالة تظهر للعميل قبل الحقول
          <textarea
            rows={2}
            placeholder="مثال: أكمل البيانات المطلوبة وسنراجع طلبك خلال يوم عمل."
            value={config.instructionsAr}
            onChange={(event) => onChange({ ...config, instructionsAr: event.target.value })}
          />
        </label>

        <div className="template-section-stack">
          {config.sections.map((section, sectionIndex) => {
            const sectionFields = config.fields.filter(
              (field) => field.sectionCode === section.code,
            );
            return (
              <article className="template-canvas-section" key={section.code}>
                <div className="template-section-heading">
                  <div className="template-section-copy">
                    <input
                      aria-label={`عنوان القسم ${sectionIndex + 1}`}
                      value={section.titleAr}
                      onChange={(event) => {
                        const titleAr = event.target.value;
                        updateSection(sectionIndex, {
                          titleAr,
                          titleEn:
                            !section.titleEn || section.titleEn === section.titleAr
                              ? titleAr
                              : section.titleEn,
                        });
                      }}
                    />
                    <input
                      aria-label={`وصف القسم ${sectionIndex + 1}`}
                      placeholder="وصف اختياري للقسم"
                      value={section.descriptionAr}
                      onChange={(event) =>
                        updateSection(sectionIndex, { descriptionAr: event.target.value })
                      }
                    />
                  </div>
                  <button
                    aria-label={`حذف القسم ${section.titleAr}`}
                    className="icon-button danger"
                    disabled={config.sections.length === 1}
                    title="حذف القسم"
                    type="button"
                    onClick={() => removeSection(sectionIndex)}
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>

                {sectionFields.length === 0 ? (
                  <button
                    className="template-section-empty"
                    type="button"
                    onClick={() => {
                      setTargetSectionCode(section.code);
                      setAddOpen(true);
                    }}
                  >
                    <Plus aria-hidden="true" size={18} />
                    أضف أول عنصر في هذا القسم
                  </button>
                ) : (
                  <div className="template-canvas-fields">
                    {sectionFields.map((field) => {
                      const fieldIndex = config.fields.findIndex(
                        (item) => item.code === field.code,
                      );
                      return (
                        <div
                          className={
                            field.code === selectedFieldCode
                              ? "template-canvas-field selected"
                              : "template-canvas-field"
                          }
                          key={field.code}
                        >
                          <button
                            className="template-field-select"
                            type="button"
                            onClick={() => setSelectedFieldCode(field.code)}
                          >
                            <GripVertical
                              aria-hidden="true"
                              className="template-field-grip"
                              size={17}
                            />
                            <span className="template-field-kind">
                              <FieldTypeIcon type={field.fieldType} />
                            </span>
                            <span className="template-field-name">
                              <strong>{field.labelAr || "حقل بلا اسم"}</strong>
                              <small>
                                {fieldTypeLabels[field.fieldType]}
                                {field.fieldType === "NOTE"
                                  ? " · محتوى إرشادي"
                                  : field.required
                                    ? " · إلزامي"
                                    : " · اختياري"}
                                {!field.clientVisible ? " · داخلي" : ""}
                              </small>
                            </span>
                          </button>
                          <div className="template-field-actions">
                            <button
                              aria-label="تحريك لأعلى"
                              className="icon-button"
                              title="تحريك لأعلى"
                              type="button"
                              onClick={() => moveField(fieldIndex, -1)}
                            >
                              <ChevronUp aria-hidden="true" size={15} />
                            </button>
                            <button
                              aria-label="تحريك لأسفل"
                              className="icon-button"
                              title="تحريك لأسفل"
                              type="button"
                              onClick={() => moveField(fieldIndex, 1)}
                            >
                              <ChevronDown aria-hidden="true" size={15} />
                            </button>
                            <button
                              aria-label="تكرار الحقل"
                              className="icon-button"
                              title="تكرار الحقل"
                              type="button"
                              onClick={() => duplicateField(fieldIndex)}
                            >
                              <Copy aria-hidden="true" size={15} />
                            </button>
                            <button
                              aria-label="حذف الحقل"
                              className="icon-button danger"
                              title="حذف الحقل"
                              type="button"
                              onClick={() => removeField(fieldIndex)}
                            >
                              <Trash2 aria-hidden="true" size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  className="template-add-inline"
                  type="button"
                  onClick={() => {
                    setTargetSectionCode(section.code);
                    setAddOpen(true);
                  }}
                >
                  <Plus aria-hidden="true" size={16} />
                  إضافة عنصر
                </button>
              </article>
            );
          })}
        </div>

        {config.fields.filter((field) => !field.sectionCode).length > 0 && (
          <p className="catalog-feedback error">
            توجد حقول قديمة بلا قسم. افتح كل حقل وحدد القسم المناسب قبل النشر.
          </p>
        )}
      </section>

      <aside className="template-inspector" aria-label="إعدادات العنصر">
        {selectedField ? (
          <>
            <header className="template-inspector-heading">
              <span className="template-field-kind">
                <FieldTypeIcon type={selectedField.fieldType} />
              </span>
              <div>
                <span>إعدادات العنصر</span>
                <strong>{fieldTypeLabels[selectedField.fieldType]}</strong>
              </div>
            </header>

            <div className="template-inspector-form">
              <label>
                {selectedField.fieldType === "NOTE" ? "عنوان الملاحظة" : "اسم الحقل"}
                <input
                  value={selectedField.labelAr}
                  onChange={(event) => {
                    const labelAr = event.target.value;
                    updateSelectedField({
                      labelAr,
                      labelEn:
                        !selectedField.labelEn ||
                        selectedField.labelEn === selectedField.labelAr ||
                        [
                          "Important note",
                          "Required document",
                          "Required number",
                          "Amount",
                          "Date",
                          "Choose from the list",
                          "Choose applicable options",
                          "Confirmation",
                          "New field",
                        ].includes(selectedField.labelEn)
                          ? labelAr
                          : selectedField.labelEn,
                    });
                  }}
                />
              </label>
              <label>
                {selectedField.fieldType === "NOTE" ? "نص الملاحظة" : "توضيح للعميل"}
                <textarea
                  rows={3}
                  value={selectedField.helpTextAr}
                  onChange={(event) => updateSelectedField({ helpTextAr: event.target.value })}
                />
              </label>
              {selectedField.fieldType !== "NOTE" && (
                <>
                  <label>
                    نوع الحقل
                    <select
                      value={selectedField.fieldType}
                      onChange={(event) => {
                        const fieldType = event.target.value as RequestTemplateFieldType;
                        updateSelectedField({
                          fieldType,
                          options: optionFieldTypes.includes(fieldType)
                            ? selectedField.options.length > 0
                              ? selectedField.options
                              : [defaultOption(0), defaultOption(1)]
                            : [],
                        });
                      }}
                    >
                      {reusableFieldTypes.map((type) => (
                        <option key={type} value={type}>
                          {fieldTypeLabels[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    مثال داخل الحقل
                    <input
                      placeholder="مثال يوضح المطلوب"
                      value={String(fieldValidation.placeholderAr ?? "")}
                      onChange={(event) => updateValidation({ placeholderAr: event.target.value })}
                    />
                  </label>
                  <label>
                    القسم
                    <select
                      value={selectedField.sectionCode}
                      onChange={(event) => updateSelectedField({ sectionCode: event.target.value })}
                    >
                      {config.sections.map((section) => (
                        <option key={section.code} value={section.code}>
                          {section.titleAr}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="template-toggle-list">
                    <label className="template-switch-row">
                      <span>
                        <strong>يظهر للعميل</strong>
                        <small>أوقفه إذا كان الحقل للاستخدام الداخلي فقط</small>
                      </span>
                      <input
                        checked={selectedField.clientVisible}
                        type="checkbox"
                        onChange={(event) =>
                          updateSelectedField({ clientVisible: event.target.checked })
                        }
                      />
                    </label>
                    <label className="template-switch-row">
                      <span>
                        <strong>حقل إلزامي</strong>
                        <small>لن يتمكن العميل من الإرسال بدونه</small>
                      </span>
                      <input
                        checked={selectedField.required}
                        type="checkbox"
                        onChange={(event) =>
                          updateSelectedField({ required: event.target.checked })
                        }
                      />
                    </label>
                    <label className="template-switch-row">
                      <span>
                        <strong>عرض كامل</strong>
                        <small>يمتد على كامل عرض النموذج</small>
                      </span>
                      <input
                        checked={fieldValidation.layoutWidth === "FULL"}
                        type="checkbox"
                        onChange={(event) =>
                          updateValidation({
                            layoutWidth: event.target.checked ? "FULL" : undefined,
                          })
                        }
                      />
                    </label>
                  </div>
                </>
              )}

              {selectedField.fieldType === "FILE" && (
                <div className="template-file-settings">
                  <label>
                    أنواع الملفات
                    <input
                      placeholder=".pdf,.docx,.xlsx"
                      value={String(fieldValidation.accept ?? "")}
                      onChange={(event) => updateValidation({ accept: event.target.value })}
                    />
                  </label>
                  <label className="template-switch-row">
                    <span>
                      <strong>السماح بعدة ملفات</strong>
                      <small>يمكن للعميل اختيار أكثر من ملف</small>
                    </span>
                    <input
                      checked={fieldValidation.multiple === true}
                      type="checkbox"
                      onChange={(event) =>
                        updateValidation({ multiple: event.target.checked || undefined })
                      }
                    />
                  </label>
                </div>
              )}

              {optionFieldTypes.includes(selectedField.fieldType) && (
                <section className="template-options-editor">
                  <div className="template-options-heading">
                    <strong>خيارات الإجابة</strong>
                    <button
                      className="os-button os-button-quiet"
                      type="button"
                      onClick={() =>
                        updateSelectedField({
                          options: [
                            ...selectedField.options,
                            defaultOption(selectedField.options.length),
                          ],
                        })
                      }
                    >
                      <Plus aria-hidden="true" size={15} />
                      خيار
                    </button>
                  </div>
                  {selectedField.options.map((option, index) => (
                    <div className="template-option-compact" key={`${option.value}-${index}`}>
                      <input
                        aria-label={`الخيار ${index + 1}`}
                        value={option.labelAr}
                        onChange={(event) => {
                          const labelAr = event.target.value;
                          updateOption(index, {
                            labelAr,
                            labelEn:
                              !option.labelEn || option.labelEn === option.labelAr
                                ? labelAr
                                : option.labelEn,
                          });
                        }}
                      />
                      <button
                        aria-label={`حذف الخيار ${index + 1}`}
                        className="icon-button danger"
                        type="button"
                        onClick={() =>
                          updateSelectedField({
                            options: selectedField.options.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          })
                        }
                      >
                        <X aria-hidden="true" size={15} />
                      </button>
                    </div>
                  ))}
                </section>
              )}

              <details className="template-advanced-settings">
                <summary>الترجمة والإعدادات المتقدمة</summary>
                <label>
                  الاسم بالإنجليزية
                  <input
                    value={selectedField.labelEn}
                    onChange={(event) => updateSelectedField({ labelEn: event.target.value })}
                  />
                </label>
                <label>
                  التوضيح بالإنجليزية
                  <textarea
                    rows={2}
                    value={selectedField.helpTextEn}
                    onChange={(event) => updateSelectedField({ helpTextEn: event.target.value })}
                  />
                </label>
                <label>
                  الرمز الداخلي
                  <input
                    value={selectedField.code}
                    onChange={(event) => {
                      const code = event.target.value;
                      updateSelectedField({ code });
                      setSelectedFieldCode(code);
                    }}
                  />
                </label>
                <label>
                  مفتاح النظام
                  <input
                    value={selectedField.systemKey}
                    onChange={(event) => updateSelectedField({ systemKey: event.target.value })}
                  />
                </label>
              </details>
            </div>
          </>
        ) : (
          <EmptyState>اختر حقلًا من النموذج لتعديل اسمه وإعداداته.</EmptyState>
        )}
      </aside>

      {addOpen && (
        <div
          className="template-add-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="إضافة عنصر"
        >
          <div className="template-add-dialog-panel">
            <header>
              <div>
                <span>إضافة عنصر</span>
                <strong>
                  إلى{" "}
                  {config.sections.find((section) => section.code === targetSectionCode)?.titleAr}
                </strong>
              </div>
              <button
                aria-label="إغلاق"
                className="icon-button"
                type="button"
                onClick={() => setAddOpen(false)}
              >
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <div className="template-add-quick-grid">
              {quickFieldTypes.map((type) => (
                <button key={type} type="button" onClick={() => addField(type)}>
                  <span>
                    <FieldTypeIcon type={type} />
                  </span>
                  <strong>{fieldTypeLabels[type]}</strong>
                </button>
              ))}
            </div>
            <div className="template-add-library">
              <div className="template-add-library-heading">
                <Library aria-hidden="true" size={18} />
                <div>
                  <strong>من الحقول المشتركة</strong>
                  <span>استخدم حقلاً جاهزًا بإعداداته الموحدة</span>
                </div>
              </div>
              <label className="template-library-search">
                <Search aria-hidden="true" size={17} />
                <input
                  aria-label="البحث في الحقول المشتركة للإضافة"
                  placeholder="ابحث عن حقل"
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                />
              </label>
              <div className="template-add-library-list">
                {activeLibrary.length === 0 ? (
                  <p>لا توجد حقول مشتركة مطابقة.</p>
                ) : (
                  activeLibrary.slice(0, 8).map((field) => (
                    <button key={field.id} type="button" onClick={() => addLibraryField(field)}>
                      <span>
                        <FieldTypeIcon type={field.fieldType} size={16} />
                      </span>
                      <div>
                        <strong>{field.labelAr}</strong>
                        <small>{fieldTypeLabels[field.fieldType]}</small>
                      </div>
                      <Plus aria-hidden="true" size={16} />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
