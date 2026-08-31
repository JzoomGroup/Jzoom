"use client";

import { type ChangeEvent, type ReactNode } from "react";
import { Info, Upload } from "lucide-react";
import { requestTemplateFieldsCopy as copy } from "../../i18n/dictionaries/catalog";
import type {
  RequestTemplateField,
  RequestTemplateVersion,
  TemplateAnswerValue,
} from "../../lib/request-template-types";
import { normalizeLocale, type SupportedLocale } from "../../lib/i18n";

export type TemplateAnswerState = Record<string, TemplateAnswerValue | undefined>;
export type TemplateFileState = Record<string, File[]>;

type FieldPresentation = {
  accept?: string;
  multiple: boolean;
  placeholderAr?: string;
  placeholderEn?: string;
  width: "FULL" | "HALF";
};

function presentationFor(field: RequestTemplateField): FieldPresentation {
  if (
    !field.validation ||
    typeof field.validation !== "object" ||
    Array.isArray(field.validation)
  ) {
    return { multiple: false, width: "HALF" };
  }
  const validation = field.validation as Record<string, unknown>;
  return {
    ...(typeof validation.accept === "string" ? { accept: validation.accept } : {}),
    multiple: validation.multiple === true,
    ...(typeof validation.placeholderAr === "string"
      ? { placeholderAr: validation.placeholderAr }
      : {}),
    ...(typeof validation.placeholderEn === "string"
      ? { placeholderEn: validation.placeholderEn }
      : {}),
    width: validation.layoutWidth === "FULL" ? "FULL" : "HALF",
  };
}

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
  onChange,
  onFilesChange,
  readOnly,
  values,
}: {
  field: RequestTemplateField;
  locale: SupportedLocale;
  onChange: (code: string, value: TemplateAnswerValue) => void;
  onFilesChange?: (code: string, files: File[]) => void;
  readOnly: boolean;
  values: TemplateAnswerState;
}) {
  const t = copy[locale];
  const value = fieldValue(values, field);
  const presentation = presentationFor(field);
  const placeholder =
    locale === "ar"
      ? presentation.placeholderAr || presentation.placeholderEn
      : presentation.placeholderEn || presentation.placeholderAr;
  const common = {
    disabled: readOnly,
    required: field.required,
    value: typeof value === "string" || typeof value === "number" ? value : "",
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(field.code, event.target.value),
  };

  if (field.fieldType === "LONG_TEXT") {
    return <textarea {...common} placeholder={placeholder} rows={4} />;
  }
  if (field.fieldType === "DROPDOWN") {
    return (
      <select {...common}>
        <option value="">{t.choose}</option>
        {field.options
          .filter((option) => option.status === "ACTIVE")
          .map((option) => (
            <option key={option.value} value={option.value}>
              {locale === "ar"
                ? option.labelAr || option.labelEn
                : option.labelEn || option.labelAr}
            </option>
          ))}
      </select>
    );
  }
  if (field.fieldType === "MULTI_SELECT") {
    return (
      <select
        disabled={readOnly}
        multiple
        required={field.required}
        value={Array.isArray(value) ? value : []}
        onChange={(event) => setMultiSelectValue(event, onChange, field.code)}
      >
        {field.options
          .filter((option) => option.status === "ACTIVE")
          .map((option) => (
            <option key={option.value} value={option.value}>
              {locale === "ar"
                ? option.labelAr || option.labelEn
                : option.labelEn || option.labelAr}
            </option>
          ))}
      </select>
    );
  }
  if (field.fieldType === "RADIO") {
    return (
      <div className="template-choice-group">
        {field.options
          .filter((option) => option.status === "ACTIVE")
          .map((option) => (
            <label key={option.value} className="inline-field">
              <input
                disabled={readOnly}
                type="radio"
                name={field.code}
                checked={value === option.value}
                onChange={() => onChange(field.code, option.value)}
              />
              {locale === "ar"
                ? option.labelAr || option.labelEn
                : option.labelEn || option.labelAr}
            </label>
          ))}
      </div>
    );
  }
  if (field.fieldType === "CHECKBOX") {
    return (
      <label className="inline-field template-checkbox-control">
        <input
          disabled={readOnly}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(field.code, event.target.checked)}
        />
        {t.yes}
      </label>
    );
  }
  if (field.fieldType === "FILE") {
    return (
      <div className="template-file-control">
        <Upload aria-hidden="true" size={20} />
        <span>
          {placeholder || (locale === "ar" ? "اختر ملفًا أو اسحبه هنا" : "Choose a file")}
        </span>
        <input
          accept={presentation.accept}
          disabled={readOnly}
          multiple={presentation.multiple}
          required={field.required}
          type="file"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            onFilesChange?.(field.code, files);
            onChange(
              field.code,
              presentation.multiple ? files.map((file) => file.name) : (files[0]?.name ?? ""),
            );
          }}
        />
      </div>
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
  return <input {...common} type={inputType} placeholder={placeholder} />;
}

function TemplateFieldView({
  field,
  locale,
  onChange,
  onFilesChange,
  readOnly,
  values,
}: {
  field: RequestTemplateField;
  locale: SupportedLocale;
  onChange: (code: string, value: TemplateAnswerValue) => void;
  onFilesChange?: (code: string, files: File[]) => void;
  readOnly: boolean;
  values: TemplateAnswerState;
}): ReactNode {
  const t = copy[locale];
  const label = locale === "ar" ? field.labelAr || field.labelEn : field.labelEn || field.labelAr;
  const help =
    locale === "ar" ? field.helpTextAr || field.helpTextEn : field.helpTextEn || field.helpTextAr;
  if (field.fieldType === "NOTE") {
    return (
      <aside className="request-template-note" key={field.code}>
        <Info aria-hidden="true" size={18} />
        <div>
          <strong>{label}</strong>
          {help && <p>{help}</p>}
        </div>
      </aside>
    );
  }
  const width = presentationFor(field).width;
  return (
    <label
      className={width === "FULL" ? "template-answer-field full-width" : "template-answer-field"}
      key={field.code}
    >
      <span>
        {label}
        {field.required ? <em>{t.fieldRequired}</em> : null}
      </span>
      <TemplateFieldControl
        field={field}
        locale={locale}
        values={values}
        onChange={onChange}
        {...(onFilesChange ? { onFilesChange } : {})}
        readOnly={readOnly}
      />
      {help && <small>{help}</small>}
    </label>
  );
}

export function RequestTemplateFields({
  locale: localeInput = "en",
  onChange,
  onFilesChange,
  readOnly = false,
  template,
  values,
}: {
  locale?: string;
  onChange: (code: string, value: TemplateAnswerValue) => void;
  onFilesChange?: (code: string, files: File[]) => void;
  readOnly?: boolean;
  template: RequestTemplateVersion | null;
  values: TemplateAnswerState;
}) {
  if (!template) return null;
  const locale = normalizeLocale(localeInput);
  const t = copy[locale];
  const visibleFields = template.fields.filter(
    (field) => field.status === "ACTIVE" && field.clientVisible,
  );
  const activeSections = template.sections.filter((section) => section.status === "ACTIVE");
  const unsectionedFields = visibleFields.filter((field) => !field.sectionCode);
  const renderField = (field: RequestTemplateField) => (
    <TemplateFieldView
      field={field}
      key={field.code}
      locale={locale}
      values={values}
      onChange={onChange}
      {...(onFilesChange ? { onFilesChange } : {})}
      readOnly={readOnly}
    />
  );

  return (
    <section className="catalog-panel form-span request-template-form-card">
      <div className="request-template-form-heading">
        <div>
          <p className="eyebrow">{t.templateForm}</p>
          <h3>{t.templateForm}</h3>
        </div>
      </div>
      {(template.instructionsEn || template.instructionsAr) && (
        <p className="request-template-instructions">
          {locale === "ar"
            ? template.instructionsAr || template.instructionsEn
            : template.instructionsEn || template.instructionsAr}
        </p>
      )}
      {activeSections.map((section) => {
        const fields = visibleFields.filter((field) => field.sectionCode === section.code);
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
            <div className="request-template-field-grid">{fields.map(renderField)}</div>
          </fieldset>
        );
      })}
      {unsectionedFields.length > 0 && (
        <div className="request-template-field-grid">{unsectionedFields.map(renderField)}</div>
      )}
      {template.downloadableFiles.some(
        (file) => file.status === "ACTIVE" && file.clientVisible,
      ) && (
        <div className="activity-list request-template-resource-list">
          <strong>{t.templateFiles}</strong>
          {template.downloadableFiles
            .filter((file) => file.status === "ACTIVE" && file.clientVisible)
            .map((file) => (
              <article key={file.code}>
                <strong>
                  {locale === "ar" ? file.titleAr || file.titleEn : file.titleEn || file.titleAr}
                </strong>
                <small>
                  {file.returnUploadRequired ? t.returnUploadRequired : t.referenceFile}
                </small>
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
      {template.documentChecklist.some((document) => document.status === "ACTIVE") && (
        <div className="activity-list request-template-resource-list">
          <strong>{t.documentChecklist}</strong>
          {template.documentChecklist
            .filter((document) => document.status === "ACTIVE")
            .map((document) => (
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
