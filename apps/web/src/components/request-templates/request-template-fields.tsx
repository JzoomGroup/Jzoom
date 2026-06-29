"use client";

import type { ChangeEvent } from "react";
import type {
  RequestTemplateField,
  RequestTemplateVersion,
  TemplateAnswerValue,
} from "../../lib/request-template-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";

export type TemplateAnswerState = Record<string, TemplateAnswerValue | undefined>;

function fieldValue(values: TemplateAnswerState, field: RequestTemplateField) {
  return values[field.code] ?? "";
}

function setMultiSelectValue(
  event: ChangeEvent<HTMLSelectElement>,
  onChange: (code: string, value: TemplateAnswerValue) => void,
  code: string,
) {
  onChange(
    code,
    Array.from(event.target.selectedOptions).map((option) => option.value),
  );
}

function TemplateFieldControl({
  field,
  locale,
  values,
  onChange,
}: {
  field: RequestTemplateField;
  locale: SupportedLocale;
  onChange: (code: string, value: TemplateAnswerValue) => void;
  values: TemplateAnswerState;
}) {
  const value = fieldValue(values, field);
  const common = {
    required: field.required,
    value: typeof value === "string" || typeof value === "number" ? value : "",
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(field.code, event.target.value),
  };

  if (field.fieldType === "LONG_TEXT") {
    return <textarea {...common} rows={4} />;
  }
  if (field.fieldType === "DROPDOWN") {
    return (
      <select {...common}>
        <option value="">{locale === "ar" ? "اختر..." : "Select..."}</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {locale === "ar" ? option.labelAr || option.labelEn : option.labelEn || option.labelAr}
          </option>
        ))}
      </select>
    );
  }
  if (field.fieldType === "MULTI_SELECT") {
    return (
      <select
        multiple
        value={Array.isArray(value) ? value : []}
        onChange={(event) => setMultiSelectValue(event, onChange, field.code)}
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {locale === "ar" ? option.labelAr || option.labelEn : option.labelEn || option.labelAr}
          </option>
        ))}
      </select>
    );
  }
  if (field.fieldType === "RADIO") {
    return (
      <div className="row-actions">
        {field.options.map((option) => (
          <label key={option.value} className="inline-field">
            <input
              type="radio"
              name={field.code}
              checked={value === option.value}
              onChange={() => onChange(field.code, option.value)}
            />
            {locale === "ar" ? option.labelAr || option.labelEn : option.labelEn || option.labelAr}
          </label>
        ))}
      </div>
    );
  }
  if (field.fieldType === "CHECKBOX") {
    return (
      <label className="inline-field">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(field.code, event.target.checked)}
        />
        {locale === "ar" ? "نعم" : "Yes"}
      </label>
    );
  }
  const inputType =
    field.fieldType === "DATE"
      ? "date"
      : field.fieldType === "EMAIL"
        ? "email"
        : field.fieldType === "PHONE"
          ? "tel"
          : field.fieldType === "URL"
            ? "url"
            : field.fieldType === "NUMBER" || field.fieldType === "AMOUNT"
              ? "number"
              : "text";
  return (
    <input
      {...common}
      type={inputType}
      placeholder={
        field.fieldType === "FILE"
          ? locale === "ar"
            ? "مرجع بيانات المرفق أو الملف"
            : "Attachment/file metadata reference"
          : undefined
      }
    />
  );
}

export function RequestTemplateFields({
  locale: localeInput = "en",
  template,
  values,
  onChange,
}: {
  locale?: string;
  onChange: (code: string, value: TemplateAnswerValue) => void;
  template: RequestTemplateVersion | null;
  values: TemplateAnswerState;
}) {
  if (!template) {
    return null;
  }
  const locale = normalizeLocale(localeInput);
  const sections = template.sections.length > 0 ? template.sections : [];
  const unsectionedFields = template.fields.filter((field) => !field.sectionCode);
  return (
    <section className="catalog-panel form-span">
      <h3>{locale === "ar" ? "نموذج الطلب" : "Template form"}</h3>
      {(template.instructionsEn || template.instructionsAr) && (
        <p>
          {locale === "ar"
            ? template.instructionsAr || template.instructionsEn
            : template.instructionsEn || template.instructionsAr}
        </p>
      )}
      {sections.map((section) => {
        const fields = template.fields.filter((field) => field.sectionCode === section.code);
        if (fields.length === 0) return null;
        return (
          <fieldset className="template-fieldset" key={section.code}>
            <legend>{locale === "ar" ? section.titleAr || section.titleEn : section.titleEn || section.titleAr}</legend>
            {(locale === "ar" ? section.descriptionAr || section.descriptionEn : section.descriptionEn || section.descriptionAr) && (
              <p>
                {locale === "ar"
                  ? section.descriptionAr || section.descriptionEn
                  : section.descriptionEn || section.descriptionAr}
              </p>
            )}
            <div className="catalog-form wide-form">
              {fields.map((field) => (
                <label key={field.code}>
                  {locale === "ar" ? field.labelAr || field.labelEn : field.labelEn || field.labelAr}
                  {field.required ? " *" : ""}
                  <TemplateFieldControl field={field} locale={locale} values={values} onChange={onChange} />
                  {(locale === "ar" ? field.helpTextAr || field.helpTextEn : field.helpTextEn || field.helpTextAr) && (
                    <small>
                      {locale === "ar"
                        ? field.helpTextAr || field.helpTextEn
                        : field.helpTextEn || field.helpTextAr}
                    </small>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
      {unsectionedFields.length > 0 && (
        <div className="catalog-form wide-form">
          {unsectionedFields.map((field) => (
            <label key={field.code}>
              {locale === "ar" ? field.labelAr || field.labelEn : field.labelEn || field.labelAr}
              {field.required ? " *" : ""}
              <TemplateFieldControl field={field} locale={locale} values={values} onChange={onChange} />
              {(locale === "ar" ? field.helpTextAr || field.helpTextEn : field.helpTextEn || field.helpTextAr) && (
                <small>
                  {locale === "ar"
                    ? field.helpTextAr || field.helpTextEn
                    : field.helpTextEn || field.helpTextAr}
                </small>
              )}
            </label>
          ))}
        </div>
      )}
      {template.downloadableFiles.length > 0 && (
        <div className="activity-list">
          <strong>{locale === "ar" ? "ملفات النموذج القابلة للتنزيل" : "Downloadable template files"}</strong>
          {template.downloadableFiles.map((file) => (
            <article key={file.code}>
              <strong>{locale === "ar" ? file.titleAr || file.titleEn : file.titleEn || file.titleAr}</strong>
              <small>
                {file.returnUploadRequired
                  ? locale === "ar"
                    ? "يتطلب رفع النسخة المعادة"
                    : "Return upload required"
                  : locale === "ar"
                    ? "ملف مرجعي"
                    : "Reference file"}
              </small>
              {(locale === "ar" ? file.descriptionAr || file.descriptionEn : file.descriptionEn || file.descriptionAr) && (
                <p>
                  {locale === "ar"
                    ? file.descriptionAr || file.descriptionEn
                    : file.descriptionEn || file.descriptionAr}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      {template.documentChecklist.length > 0 && (
        <div className="activity-list">
          <strong>{locale === "ar" ? "قائمة المستندات المطلوبة" : "Required document checklist"}</strong>
          {template.documentChecklist.map((document) => (
            <article key={document.code}>
              <strong>{locale === "ar" ? document.labelAr || document.labelEn : document.labelEn || document.labelAr}</strong>
              <small>
                {document.uploadRequired
                  ? locale === "ar"
                    ? "الرفع مطلوب"
                    : "Upload required"
                  : locale === "ar"
                    ? "رفع اختياري"
                    : "Optional upload"}
              </small>
              {(locale === "ar" ? document.descriptionAr || document.descriptionEn : document.descriptionEn || document.descriptionAr) && (
                <p>
                  {locale === "ar"
                    ? document.descriptionAr || document.descriptionEn
                    : document.descriptionEn || document.descriptionAr}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
