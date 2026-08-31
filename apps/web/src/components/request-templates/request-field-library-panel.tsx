"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Archive, Check, Pencil, Plus, Search } from "lucide-react";
import {
  createRequestFieldLibraryItem,
  refreshRequestTemplates,
  requestTemplateErrorMessage,
  updateRequestFieldLibraryItem,
} from "../../lib/request-templates-client";
import type {
  RequestFieldLibraryItem,
  RequestTemplateFieldType,
  RequestTemplatesSnapshot,
} from "../../lib/request-template-types";
import { EmptyState } from "../catalog/catalog-shared";
import { AppDialog } from "../app-dialog";
import { fieldTypeLabels, FieldTypeIcon, reusableFieldTypes } from "./request-template-field-meta";

type LibraryForm = {
  code: string;
  fieldType: RequestTemplateFieldType;
  helpTextAr: string;
  helpTextEn: string;
  labelAr: string;
  labelEn: string;
  placeholderAr: string;
  placeholderEn: string;
  systemKey: string;
};

const emptyForm: LibraryForm = {
  code: "",
  fieldType: "SHORT_TEXT",
  helpTextAr: "",
  helpTextEn: "",
  labelAr: "",
  labelEn: "",
  placeholderAr: "",
  placeholderEn: "",
  systemKey: "",
};

function suggestedCode(labelEn: string, count: number) {
  const code = labelEn
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return code || `shared_field_${count + 1}`;
}

export function RequestFieldLibraryPanel({
  fields,
  onError,
  onSaved,
  usageCountByCode,
}: {
  fields: RequestFieldLibraryItem[];
  onError: (message: string) => void;
  onSaved: (snapshot: RequestTemplatesSnapshot, message: string) => void;
  usageCountByCode: Map<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LibraryForm>(emptyForm);
  const filteredFields = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return fields;
    return fields.filter((field) =>
      [field.labelAr, field.labelEn, field.code, fieldTypeLabels[field.fieldType]]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [fields, query]);

  function startCreate() {
    setEditingId(undefined);
    setForm({ ...emptyForm, code: `shared_field_${fields.length + 1}` });
    setShowForm(true);
  }

  function startEdit(field: RequestFieldLibraryItem) {
    setEditingId(field.id);
    setForm({
      code: field.code,
      fieldType: field.fieldType,
      helpTextAr: field.helpTextAr ?? "",
      helpTextEn: field.helpTextEn ?? "",
      labelAr: field.labelAr,
      labelEn: field.labelEn,
      placeholderAr: field.placeholderAr ?? "",
      placeholderEn: field.placeholderEn ?? "",
      systemKey: field.systemKey ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(undefined);
    setForm(emptyForm);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        fieldType: form.fieldType,
        labelAr: form.labelAr.trim(),
        labelEn: form.labelEn.trim() || form.labelAr.trim(),
        helpTextAr: form.helpTextAr.trim() || null,
        helpTextEn: form.helpTextEn.trim() || null,
        placeholderAr: form.placeholderAr.trim() || null,
        placeholderEn: form.placeholderEn.trim() || null,
        systemKey: form.systemKey.trim() || null,
      };
      if (editingId) {
        await updateRequestFieldLibraryItem(editingId, payload);
      } else {
        await createRequestFieldLibraryItem({
          ...payload,
          code: form.code.trim() || suggestedCode(form.labelEn, fields.length),
          ...(payload.helpTextAr ? { helpTextAr: payload.helpTextAr } : {}),
          ...(payload.helpTextEn ? { helpTextEn: payload.helpTextEn } : {}),
          ...(payload.placeholderAr ? { placeholderAr: payload.placeholderAr } : {}),
          ...(payload.placeholderEn ? { placeholderEn: payload.placeholderEn } : {}),
          ...(payload.systemKey ? { systemKey: payload.systemKey } : {}),
        });
      }
      const snapshot = await refreshRequestTemplates();
      closeForm();
      onSaved(snapshot, editingId ? "تم تحديث الحقل المشترك." : "تم إنشاء الحقل المشترك.");
    } catch (error) {
      onError(requestTemplateErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(field: RequestFieldLibraryItem) {
    try {
      await updateRequestFieldLibraryItem(field.id, { active: field.status !== "ACTIVE" });
      onSaved(
        await refreshRequestTemplates(),
        field.status === "ACTIVE" ? "تمت أرشفة الحقل المشترك." : "تمت إعادة تفعيل الحقل.",
      );
    } catch (error) {
      onError(requestTemplateErrorMessage(error));
    }
  }

  return (
    <section className="template-library-view">
      <header className="template-view-toolbar">
        <div>
          <h2>الحقول المشتركة</h2>
          <p>أنشئ الحقل مرة واحدة واستخدمه في أكثر من نموذج دون تكرار الإعداد.</p>
        </div>
        <button className="os-button os-button-primary" type="button" onClick={startCreate}>
          <Plus aria-hidden="true" size={17} />
          حقل مشترك جديد
        </button>
      </header>

      <label className="template-library-search">
        <Search aria-hidden="true" size={18} />
        <input
          aria-label="البحث في الحقول المشتركة"
          placeholder="ابحث بالاسم أو النوع"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {showForm && (
        <AppDialog
          busy={saving}
          closeLabel="إغلاق"
          description="البيانات التي ستظهر عند إضافته إلى أي نموذج"
          eyebrow="مكتبة الحقول المشتركة"
          onClose={closeForm}
          size="lg"
          title={editingId ? "تعديل الحقل" : "حقل مشترك جديد"}
        >
          <form className="template-library-form" noValidate onSubmit={submit}>
            <div className="template-library-form-grid">
              <label>
                اسم الحقل بالعربية
                <input
                  required
                  value={form.labelAr}
                  onChange={(event) => setForm({ ...form, labelAr: event.target.value })}
                />
              </label>
              <label>
                نوع الحقل
                <select
                  value={form.fieldType}
                  onChange={(event) =>
                    setForm({ ...form, fieldType: event.target.value as RequestTemplateFieldType })
                  }
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
                  placeholder="مثال: اكتب الاسم الرباعي"
                  value={form.placeholderAr}
                  onChange={(event) => setForm({ ...form, placeholderAr: event.target.value })}
                />
              </label>
              <label>
                توضيح أسفل الحقل
                <input
                  placeholder="تعليمات قصيرة تساعد العميل"
                  value={form.helpTextAr}
                  onChange={(event) => setForm({ ...form, helpTextAr: event.target.value })}
                />
              </label>
            </div>
            <details className="template-advanced-settings">
              <summary>الترجمة والإعدادات المتقدمة</summary>
              <div className="template-library-form-grid">
                <label>
                  الاسم بالإنجليزية
                  <input
                    value={form.labelEn}
                    onChange={(event) => setForm({ ...form, labelEn: event.target.value })}
                  />
                </label>
                <label>
                  المثال بالإنجليزية
                  <input
                    value={form.placeholderEn}
                    onChange={(event) => setForm({ ...form, placeholderEn: event.target.value })}
                  />
                </label>
                <label>
                  التوضيح بالإنجليزية
                  <input
                    value={form.helpTextEn}
                    onChange={(event) => setForm({ ...form, helpTextEn: event.target.value })}
                  />
                </label>
                <label>
                  الرمز الداخلي
                  <input
                    disabled={Boolean(editingId)}
                    value={form.code}
                    onChange={(event) => setForm({ ...form, code: event.target.value })}
                  />
                </label>
                <label>
                  مفتاح النظام
                  <input
                    value={form.systemKey}
                    onChange={(event) => setForm({ ...form, systemKey: event.target.value })}
                  />
                </label>
              </div>
            </details>
            <div className="form-actions">
              <button className="os-button os-button-primary" disabled={saving} type="submit">
                <Check aria-hidden="true" size={17} />
                {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "إنشاء الحقل"}
              </button>
              <button
                className="os-button os-button-secondary"
                disabled={saving}
                type="button"
                onClick={closeForm}
              >
                إلغاء
              </button>
            </div>
          </form>
        </AppDialog>
      )}

      {filteredFields.length === 0 ? (
        <EmptyState>لا توجد حقول مشتركة مطابقة. أنشئ أول حقل أو غيّر عبارة البحث.</EmptyState>
      ) : (
        <div className="template-library-grid">
          {filteredFields.map((field) => (
            <article className="template-library-card" key={field.id}>
              <div className="template-library-icon">
                <FieldTypeIcon type={field.fieldType} />
              </div>
              <div className="template-library-card-copy">
                <strong>{field.labelAr || field.labelEn}</strong>
                <span>{fieldTypeLabels[field.fieldType]}</span>
                {field.helpTextAr && <p>{field.helpTextAr}</p>}
              </div>
              <div className="template-library-usage">
                مستخدم في {usageCountByCode.get(field.code) ?? 0} نموذج
              </div>
              <div className="template-library-actions">
                <button
                  aria-label={`تعديل ${field.labelAr}`}
                  className="icon-button"
                  title="تعديل الحقل"
                  type="button"
                  onClick={() => startEdit(field)}
                >
                  <Pencil aria-hidden="true" size={16} />
                </button>
                <button
                  aria-label={field.status === "ACTIVE" ? "أرشفة الحقل" : "تفعيل الحقل"}
                  className="icon-button"
                  title={field.status === "ACTIVE" ? "أرشفة الحقل" : "تفعيل الحقل"}
                  type="button"
                  onClick={() => void toggleActive(field)}
                >
                  {field.status === "ACTIVE" ? (
                    <Archive aria-hidden="true" size={16} />
                  ) : (
                    <Check aria-hidden="true" size={16} />
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
