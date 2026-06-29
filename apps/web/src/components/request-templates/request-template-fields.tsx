"use client";

import type { ChangeEvent } from "react";
import type {
  RequestTemplateField,
  RequestTemplateVersion,
  TemplateAnswerValue,
} from "../../lib/request-template-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";

export type TemplateAnswerState = Record<string, TemplateAnswerValue | undefined>;

const copy = {
  ar: {
    attachmentPlaceholder: "مرجع بيانات المرفق أو الملف",
    choose: "اختر...",
    documentChecklist: "قائمة المستندات المطلوبة",
    fieldRequired: "مطلوب",
    optionalUpload: "رفع اختياري",
    referenceFile: "ملف مرجعي",
    returnUploadRequired: "يتطلب رفع النسخة المعادة",
    templateFiles: "ملفات النموذج القابلة للتنزيل",
    templateForm: "نموذج الطلب",
    uploadRequired: "الرفع مطلوب",
    yes: "نعم",
  },
  en: {
    attachmentPlaceholder: "Attachment/file metadata reference",
    choose: "Select...",
    documentChecklist: "Required document checklist",
    fieldRequired: "Required",
    optionalUpload: "Optional upload",
    referenceFile: "Reference file",
    returnUploadRequired: "Return upload required",
    templateFiles: "Downloadable template files",
    templateForm: "Template form",
    uploadRequired: "Upload required",
    yes: "Yes",
  },
} as const;

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
  const t = copy[locale];
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
        <option value="">{t.choose}</option>
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
        {t.yes}
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
      placeholder={field.fieldType === "FILE" ? t.attachmentPlaceholder : undefined}
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
  const t = copy[locale];
  const sections = template.sections.length > 0 ? template.sections : [];
  const unsectionedFields = template.fields.filter((field) => !field.sectionCode);
  return (
    <section className="catalog-panel form-span request-template-form-card">
      <div className="request-template-form-heading">
        <div>
          <p className="eyebrow">{t.templateForm}</p>
          <h3>{t.templateForm}</h3>
        </div>
      </div>
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
          <fieldset className="template-fieldset request-template-section-card" key={section.code}>
            <legend>
              {locale === "ar"
                ? section.titleAr || section.titleEn
                : section.titleEn || section.titleAr}
            </legend>
            {(locale === "ar"
              ? section.descriptionAr || section.descriptionEn
              : section.descriptionEn || section.descriptionAr) && (
              <p>
                {locale === "ar"
                  ? section.descriptionAr || section.descriptionEn
                  : section.descriptionEn || section.descriptionAr}
              </p>
            )}
            <div className="catalog-form wide-form">
              {fields.map((field) => (
                <label className="template-answer-field" key={field.code}>
                  <span>
                    {locale === "ar"
                      ? field.labelAr || field.labelEn
                      : field.labelEn || field.labelAr}
                    {field.required ? <em>{t.fieldRequired}</em> : null}
                  </span>
                  <TemplateFieldControl
                    field={field}
                    locale={locale}
                    values={values}
                    onChange={onChange}
                  />
                  {(locale === "ar"
                    ? field.helpTextAr || field.helpTextEn
                    : field.helpTextEn || field.helpTextAr) && (
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
            <label className="template-answer-field" key={field.code}>
              <span>
                {locale === "ar" ? field.labelAr || field.labelEn : field.labelEn || field.labelAr}
                {field.required ? <em>{t.fieldRequired}</em> : null}
              </span>
              <TemplateFieldControl
                field={field}
                locale={locale}
                values={values}
                onChange={onChange}
              />
              {(locale === "ar"
                ? field.helpTextAr || field.helpTextEn
                : field.helpTextEn || field.helpTextAr) && (
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
        <div className="activity-list request-template-resource-list">
          <strong>{t.templateFiles}</strong>
          {template.downloadableFiles.map((file) => (
            <article key={file.code}>
              <strong>
                {locale === "ar" ? file.titleAr || file.titleEn : file.titleEn || file.titleAr}
              </strong>
              <small>{file.returnUploadRequired ? t.returnUploadRequired : t.referenceFile}</small>
              {(locale === "ar"
                ? file.descriptionAr || file.descriptionEn
                : file.descriptionEn || file.descriptionAr) && (
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
        <div className="activity-list request-template-resource-list">
          <strong>{t.documentChecklist}</strong>
          {template.documentChecklist.map((document) => (
            <article key={document.code}>
              <strong>
                {locale === "ar"
                  ? document.labelAr || document.labelEn
                  : document.labelEn || document.labelAr}
              </strong>
              <small>{document.uploadRequired ? t.uploadRequired : t.optionalUpload}</small>
              {(locale === "ar"
                ? document.descriptionAr || document.descriptionEn
                : document.descriptionEn || document.descriptionAr) && (
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
