"use client";

import type { ChangeEvent } from "react";
import type {
  RequestTemplateField,
  RequestTemplateVersion,
  TemplateAnswerValue,
} from "../../lib/request-template-types";

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
  values,
  onChange,
}: {
  field: RequestTemplateField;
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
        <option value="">Select...</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.labelEn}
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
            {option.labelEn}
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
            {option.labelEn}
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
        Yes
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
      placeholder={field.fieldType === "FILE" ? "Attachment/file metadata reference" : undefined}
    />
  );
}

export function RequestTemplateFields({
  template,
  values,
  onChange,
}: {
  onChange: (code: string, value: TemplateAnswerValue) => void;
  template: RequestTemplateVersion | null;
  values: TemplateAnswerState;
}) {
  if (!template) {
    return null;
  }
  const sections = template.sections.length > 0 ? template.sections : [];
  const unsectionedFields = template.fields.filter((field) => !field.sectionCode);
  return (
    <section className="catalog-panel form-span">
      <h3>Template form</h3>
      {(template.instructionsEn || template.instructionsAr) && (
        <p>{template.instructionsEn || template.instructionsAr}</p>
      )}
      {sections.map((section) => {
        const fields = template.fields.filter((field) => field.sectionCode === section.code);
        if (fields.length === 0) return null;
        return (
          <fieldset className="template-fieldset" key={section.code}>
            <legend>{section.titleEn}</legend>
            {section.descriptionEn && <p>{section.descriptionEn}</p>}
            <div className="catalog-form wide-form">
              {fields.map((field) => (
                <label key={field.code}>
                  {field.labelEn}
                  {field.required ? " *" : ""}
                  <TemplateFieldControl field={field} values={values} onChange={onChange} />
                  {field.helpTextEn && <small>{field.helpTextEn}</small>}
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
              {field.labelEn}
              {field.required ? " *" : ""}
              <TemplateFieldControl field={field} values={values} onChange={onChange} />
              {field.helpTextEn && <small>{field.helpTextEn}</small>}
            </label>
          ))}
        </div>
      )}
      {template.downloadableFiles.length > 0 && (
        <div className="activity-list">
          <strong>Downloadable template files</strong>
          {template.downloadableFiles.map((file) => (
            <article key={file.code}>
              <strong>{file.titleEn}</strong>
              <small>
                {file.returnUploadRequired ? "Return upload required" : "Reference file"}
              </small>
              {file.descriptionEn && <p>{file.descriptionEn}</p>}
            </article>
          ))}
        </div>
      )}
      {template.documentChecklist.length > 0 && (
        <div className="activity-list">
          <strong>Required document checklist</strong>
          {template.documentChecklist.map((document) => (
            <article key={document.code}>
              <strong>{document.labelEn}</strong>
              <small>{document.uploadRequired ? "Upload required" : "Optional upload"}</small>
              {document.descriptionEn && <p>{document.descriptionEn}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
