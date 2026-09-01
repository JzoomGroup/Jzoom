"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  LayoutTemplate,
  Library,
  Monitor,
  MoreHorizontal,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  applySuggestedRequestTemplate,
  changeRequestTemplateVersionStatus,
  requestTemplateErrorMessage,
  reviseRequestTemplate,
} from "../../lib/request-templates-client";
import type {
  RequestTemplateServiceItem,
  RequestTemplatesSnapshot,
} from "../../lib/request-template-types";
import { CatalogFeedback, EmptyState, SectionHeader } from "../catalog/catalog-shared";
import { RequestFieldLibraryPanel } from "./request-field-library-panel";
import { RequestTemplateDesigner } from "./request-template-designer";
import {
  buildStarterConfig,
  editableConfigToPayload,
  editableConfigToVersion,
  validateEditableConfig,
  versionForEditing,
  versionToEditableConfig,
  type EditableTemplateConfig,
  type EditableTemplateStatus,
} from "./request-template-designer-model";
import { RequestTemplateFields } from "./request-template-fields";

type ManagerTab = "TEMPLATES" | "LIBRARY";
type PreviewDevice = "DESKTOP" | "MOBILE";

function serviceName(item: RequestTemplateServiceItem) {
  return (
    item.monthlyService.revisions?.[0]?.nameAr ||
    item.monthlyService.revisions?.[0]?.nameEn ||
    item.monthlyService.code
  );
}

function itemName(item: RequestTemplateServiceItem) {
  return item.latestRevision?.nameAr || item.latestRevision?.nameEn || item.code;
}

function statusLabel(item: RequestTemplateServiceItem | null) {
  if (!item?.template) return "لم يُنشأ";
  if (item.template.drafts.length > 0) return "مسودة قيد التعديل";
  if (item.template.active) return "منشور للعميل";
  if (item.template.suggested) return "يوجد نموذج مقترح";
  return "غير منشور";
}

export function RequestTemplateManager({
  initialSnapshot,
}: {
  initialSnapshot: RequestTemplatesSnapshot;
}) {
  const initialItem = initialSnapshot.serviceItems[0] ?? null;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [tab, setTab] = useState<ManagerTab>("TEMPLATES");
  const [selectedServiceId, setSelectedServiceId] = useState(initialItem?.monthlyService.id ?? "");
  const [selectedServiceItemId, setSelectedServiceItemId] = useState(initialItem?.id ?? "");
  const [editor, setEditor] = useState<EditableTemplateConfig>(() =>
    versionToEditableConfig(versionForEditing(initialItem)),
  );
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("DESKTOP");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const services = useMemo(() => {
    const unique = new Map<string, RequestTemplateServiceItem>();
    snapshot.serviceItems.forEach((item) => {
      if (!unique.has(item.monthlyService.id)) unique.set(item.monthlyService.id, item);
    });
    return [...unique.values()];
  }, [snapshot.serviceItems]);
  const serviceItems = useMemo(
    () => snapshot.serviceItems.filter((item) => item.monthlyService.id === selectedServiceId),
    [selectedServiceId, snapshot.serviceItems],
  );
  const selected = useMemo(
    () => snapshot.serviceItems.find((item) => item.id === selectedServiceItemId) ?? null,
    [selectedServiceItemId, snapshot.serviceItems],
  );
  const currentVersion = versionForEditing(selected);
  const previewVersion = useMemo(() => editableConfigToVersion(editor), [editor]);
  const usageCountByCode = useMemo(() => {
    const usage = new Map<string, number>();
    snapshot.serviceItems.forEach((item) => {
      const versions = [
        item.template?.active,
        item.template?.suggested,
        ...(item.template?.drafts ?? []),
      ].filter(Boolean);
      const usedCodes = new Set(
        versions.flatMap((version) =>
          version!.fields
            .map((field) => field.libraryFieldCode)
            .filter((code): code is string => Boolean(code)),
        ),
      );
      usedCodes.forEach((code) => usage.set(code, (usage.get(code) ?? 0) + 1));
    });
    return usage;
  }, [snapshot.serviceItems]);

  function confirmDiscard() {
    return !isDirty || window.confirm("لديك تعديلات غير محفوظة. هل تريد مغادرة النموذج؟");
  }

  function loadItem(item: RequestTemplateServiceItem) {
    if (!confirmDiscard()) return;
    setSelectedServiceId(item.monthlyService.id);
    setSelectedServiceItemId(item.id);
    setEditor(versionToEditableConfig(versionForEditing(item)));
    setIsDirty(false);
    setError(undefined);
    setSuccess(undefined);
  }

  function selectService(serviceId: string) {
    if (!confirmDiscard()) return;
    const nextItem = snapshot.serviceItems.find((item) => item.monthlyService.id === serviceId);
    setSelectedServiceId(serviceId);
    setSelectedServiceItemId(nextItem?.id ?? "");
    setEditor(versionToEditableConfig(versionForEditing(nextItem ?? null)));
    setIsDirty(false);
    setError(undefined);
    setSuccess(undefined);
  }

  function saved(nextSnapshot: RequestTemplatesSnapshot, message: string) {
    setSnapshot(nextSnapshot);
    const nextSelected =
      nextSnapshot.serviceItems.find((item) => item.id === selectedServiceItemId) ??
      nextSnapshot.serviceItems[0] ??
      null;
    if (nextSelected) {
      setSelectedServiceId(nextSelected.monthlyService.id);
      setSelectedServiceItemId(nextSelected.id);
      setEditor(versionToEditableConfig(versionForEditing(nextSelected)));
    }
    setIsDirty(false);
    setSuccess(message);
    setError(undefined);
  }

  function savedLibrary(nextSnapshot: RequestTemplatesSnapshot, message: string) {
    setSnapshot(nextSnapshot);
    setSuccess(message);
    setError(undefined);
  }

  function changeEditor(next: EditableTemplateConfig) {
    setEditor(next);
    setIsDirty(true);
    setSuccess(undefined);
  }

  async function saveVersion(status: EditableTemplateStatus) {
    if (!selected) return;
    const validationError = validateEditableConfig(editor, status);
    if (validationError) {
      setError(validationError);
      setSuccess(undefined);
      return;
    }
    if (status === "ACTIVE" && !window.confirm("سيظهر هذا الإصدار للعميل فور نشره. متابعة؟")) {
      return;
    }
    setSaving(true);
    try {
      const payload = editableConfigToPayload({ ...editor, status }, status);
      saved(
        await reviseRequestTemplate(selected.id, payload),
        status === "ACTIVE" ? "تم نشر النموذج للعميل بنجاح." : "تم حفظ مسودة النموذج.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : requestTemplateErrorMessage(caught));
      setSuccess(undefined);
    } finally {
      setSaving(false);
    }
  }

  async function applySuggested() {
    if (!selected) return;
    try {
      saved(await applySuggestedRequestTemplate(selected.id), "تم تطبيق النموذج المقترح كمسودة.");
    } catch (caught) {
      setError(requestTemplateErrorMessage(caught));
    }
  }

  async function archiveActive() {
    if (!selected?.template?.active) return;
    if (!window.confirm("هل تريد إيقاف النموذج المنشور؟ لن يظهر في الطلبات الجديدة.")) return;
    try {
      saved(
        await changeRequestTemplateVersionStatus(
          selected.template.active.templateId,
          selected.template.active.id,
          "ARCHIVED",
          "أرشفة من مصمم نماذج الطلبات",
        ),
        "تمت أرشفة النموذج المنشور.",
      );
    } catch (caught) {
      setError(requestTemplateErrorMessage(caught));
    }
  }

  function applyStarter() {
    setEditor(buildStarterConfig(selected));
    setIsDirty(true);
    setSuccess("تم تجهيز نموذج مقترح داخل المصمم. راجعه ثم احفظه أو انشره.");
    setError(undefined);
  }

  return (
    <>
      <SectionHeader
        eyebrow="إدارة النماذج"
        title="مصمم نماذج الطلبات"
        description="صمّم البيانات التي يحتاجها كل بند خدمة، وعاين تجربة العميل قبل نشر أي تغيير."
      />
      <CatalogFeedback error={error} success={success} />

      <nav className="template-manager-tabs" aria-label="أقسام إدارة النماذج" role="tablist">
        <button
          aria-selected={tab === "TEMPLATES"}
          className={tab === "TEMPLATES" ? "active" : ""}
          role="tab"
          type="button"
          onClick={() => setTab("TEMPLATES")}
        >
          <LayoutTemplate aria-hidden="true" size={18} />
          النماذج
        </button>
        <button
          aria-selected={tab === "LIBRARY"}
          className={tab === "LIBRARY" ? "active" : ""}
          role="tab"
          type="button"
          onClick={() => setTab("LIBRARY")}
        >
          <Library aria-hidden="true" size={18} />
          الحقول المشتركة
          <span>{snapshot.fieldLibrary.filter((field) => field.status === "ACTIVE").length}</span>
        </button>
      </nav>

      {tab === "LIBRARY" ? (
        <RequestFieldLibraryPanel
          fields={snapshot.fieldLibrary}
          usageCountByCode={usageCountByCode}
          onError={(message) => {
            setError(message);
            setSuccess(undefined);
          }}
          onSaved={savedLibrary}
        />
      ) : (
        <section className="template-manager-view">
          <header className="template-selector-bar">
            <label>
              الخدمة الرئيسية
              <select
                value={selectedServiceId}
                onChange={(event) => selectService(event.target.value)}
              >
                {services.map((item) => (
                  <option key={item.monthlyService.id} value={item.monthlyService.id}>
                    {serviceName(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              بند الخدمة
              <select
                value={selectedServiceItemId}
                onChange={(event) => {
                  const item = serviceItems.find(
                    (candidate) => candidate.id === event.target.value,
                  );
                  if (item) loadItem(item);
                }}
              >
                {serviceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {itemName(item)}
                  </option>
                ))}
              </select>
            </label>
            <div className="template-selector-status">
              <span>حالة النموذج</span>
              <strong>
                <CheckCircle2 aria-hidden="true" size={16} />
                {statusLabel(selected)}
              </strong>
              <small>
                {selected?.template?.active
                  ? `الإصدار المنشور v${selected.template.active.version}`
                  : "لا يوجد إصدار منشور"}
              </small>
            </div>
          </header>

          {!selected ? (
            <EmptyState>لا توجد بنود خدمة متاحة لبناء نموذج طلب.</EmptyState>
          ) : (
            <>
              <header className="template-workspace-heading">
                <div>
                  <span>{serviceName(selected)}</span>
                  <h2>{itemName(selected)}</h2>
                  <p>
                    {selected.latestRevision?.expectedOutput ||
                      "حدد الحقول التي يحتاجها فريق العمل لتنفيذ هذا البند."}
                  </p>
                </div>
                <div className="template-workspace-tools">
                  {!currentVersion && (
                    <button
                      className="os-button os-button-secondary"
                      type="button"
                      onClick={applyStarter}
                    >
                      <Sparkles aria-hidden="true" size={17} />
                      إنشاء نموذج مقترح
                    </button>
                  )}
                  {selected.template?.suggested && (
                    <button
                      className="os-button os-button-secondary"
                      type="button"
                      onClick={() => void applySuggested()}
                    >
                      <Sparkles aria-hidden="true" size={17} />
                      استخدام المقترح الجاهز
                    </button>
                  )}
                  <details className="template-more-menu">
                    <summary aria-label="إجراءات إضافية">
                      <MoreHorizontal aria-hidden="true" size={18} />
                    </summary>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditor(versionToEditableConfig(currentVersion));
                          setIsDirty(false);
                        }}
                      >
                        <RotateCcw aria-hidden="true" size={16} />
                        إعادة آخر نسخة
                      </button>
                      <button
                        className="danger"
                        disabled={!selected.template?.active}
                        type="button"
                        onClick={() => void archiveActive()}
                      >
                        <Archive aria-hidden="true" size={16} />
                        أرشفة المنشور
                      </button>
                    </div>
                  </details>
                </div>
              </header>

              <div className="template-studio-grid">
                <RequestTemplateDesigner
                  config={editor}
                  fieldLibrary={snapshot.fieldLibrary}
                  onChange={changeEditor}
                />

                <aside className="template-live-preview">
                  <header>
                    <div>
                      <span>معاينة العميل</span>
                      <strong>ما سيظهر في إنشاء الطلب</strong>
                    </div>
                    <div className="template-device-switch" aria-label="حجم المعاينة">
                      <button
                        aria-label="معاينة سطح المكتب"
                        className={previewDevice === "DESKTOP" ? "active" : ""}
                        title="سطح المكتب"
                        type="button"
                        onClick={() => setPreviewDevice("DESKTOP")}
                      >
                        <Monitor aria-hidden="true" size={17} />
                      </button>
                      <button
                        aria-label="معاينة الجوال"
                        className={previewDevice === "MOBILE" ? "active" : ""}
                        title="الجوال"
                        type="button"
                        onClick={() => setPreviewDevice("MOBILE")}
                      >
                        <Smartphone aria-hidden="true" size={17} />
                      </button>
                    </div>
                  </header>
                  <div
                    className={
                      previewDevice === "MOBILE"
                        ? "template-preview-frame mobile"
                        : "template-preview-frame"
                    }
                  >
                    <div
                      aria-hidden="true"
                      className="template-preview-page"
                      data-testid="request-template-client-preview"
                    >
                      <header className="template-preview-page-heading">
                        <p>مركز خدمة العميل</p>
                        <h2>إنشاء طلب جديد</h2>
                        <span>أكمل بيانات الطلب وسيصل مباشرة إلى فريق الخدمة المختص.</span>
                      </header>

                      <section className="os-section-card template-preview-request-card">
                        <div className="os-section-heading">
                          <div>
                            <p className="os-eyebrow">طلب خدمة</p>
                            <h2>{itemName(selected)}</h2>
                            <p>{serviceName(selected)}</p>
                          </div>
                        </div>

                        <div className="catalog-form wide-form client-request-form template-preview-form">
                          <section className="request-intake-panel form-span">
                            <div className="request-panel-heading">
                              <span>01</span>
                              <div>
                                <h3>اختيار الخدمة</h3>
                                <p>الخدمة والبند المختاران لهذا النموذج.</p>
                              </div>
                            </div>
                            <div className="request-field-grid">
                              <div className="template-preview-field">
                                <span>الخدمة</span>
                                <input
                                  aria-label="معاينة الخدمة"
                                  disabled
                                  value={serviceName(selected)}
                                />
                              </div>
                              <div className="template-preview-field">
                                <span>بند الخدمة</span>
                                <input
                                  aria-label="معاينة بند الخدمة"
                                  disabled
                                  value={itemName(selected)}
                                />
                              </div>
                            </div>
                          </section>

                          <section className="request-intake-panel request-details-panel form-span">
                            <div className="request-panel-heading">
                              <span>02</span>
                              <div>
                                <h3>تفاصيل الطلب</h3>
                                <p>هذه الحقول ثابتة في رحلة إنشاء الطلب لدى العميل.</p>
                              </div>
                            </div>
                            <div className="request-field-grid request-field-grid-three">
                              <div className="template-preview-field">
                                <span>عنوان الطلب</span>
                                <input disabled placeholder="اكتب عنوانًا واضحًا للطلب" />
                              </div>
                              <div className="template-preview-field">
                                <span>الأولوية</span>
                                <select disabled defaultValue="NORMAL">
                                  <option value="NORMAL">عادية</option>
                                </select>
                              </div>
                              <div className="template-preview-field">
                                <span>الموعد المطلوب</span>
                                <input disabled placeholder="اختر التاريخ" />
                              </div>
                            </div>
                            <div className="template-preview-field">
                              <span>وصف الطلب</span>
                              <textarea
                                disabled
                                placeholder="اشرح المطلوب والنتيجة المتوقعة"
                                rows={3}
                              />
                            </div>
                          </section>

                          {editor.fields.length === 0 ? (
                            <div className="form-span template-preview-empty">
                              <EmptyState>
                                أضف أول حقل إلى النموذج، وستظهر هنا تجربة العميل مباشرة.
                              </EmptyState>
                            </div>
                          ) : (
                            <RequestTemplateFields
                              locale="ar"
                              readOnly
                              template={previewVersion}
                              values={{}}
                              onChange={() => undefined}
                            />
                          )}

                          <div className="request-review-bar form-span">
                            <div>
                              <span>مراجعة الطلب</span>
                              <strong>{itemName(selected)}</strong>
                              <small>{serviceName(selected)}</small>
                            </div>
                            <div className="form-actions">
                              <button
                                className="os-button os-button-secondary"
                                disabled
                                type="button"
                              >
                                حفظ كمسودة
                              </button>
                              <button
                                className="os-button os-button-primary"
                                disabled
                                type="button"
                              >
                                إرسال الطلب
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </aside>
              </div>

              <footer className="template-save-bar">
                <div>
                  <span className={isDirty ? "dirty" : ""} />
                  <strong>{isDirty ? "لديك تعديلات غير محفوظة" : "جميع التعديلات محفوظة"}</strong>
                  <small>النشر ينشئ إصدارًا جديدًا ولا يغيّر الطلبات السابقة.</small>
                </div>
                <div>
                  <button
                    className="os-button os-button-secondary"
                    disabled={saving || !isDirty}
                    type="button"
                    onClick={() => void saveVersion("DRAFT")}
                  >
                    <Save aria-hidden="true" size={17} />
                    حفظ كمسودة
                  </button>
                  <button
                    className="os-button os-button-primary"
                    disabled={saving || editor.fields.length === 0}
                    type="button"
                    onClick={() => void saveVersion("ACTIVE")}
                  >
                    <CheckCircle2 aria-hidden="true" size={17} />
                    {saving ? "جارٍ الحفظ..." : "نشر للعميل"}
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      )}
    </>
  );
}
