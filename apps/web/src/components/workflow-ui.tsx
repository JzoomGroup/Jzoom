import { CheckCircle2, Clock3, Download, Eye, FileText, Image as ImageIcon } from "lucide-react";
import type { ReactNode } from "react";

type DisplayLocale = "ar" | "en" | string;

export type TimelineItem = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  tone?: "accent" | "neutral" | "success" | "warning";
};

export function ActivityTimeline({ empty, items }: { empty: ReactNode; items: TimelineItem[] }) {
  if (items.length === 0) {
    return <div className="os-timeline-empty">{empty}</div>;
  }

  return (
    <ol className="os-timeline">
      {items.map((item) => (
        <li className={`os-timeline-${item.tone ?? "neutral"}`} key={item.id}>
          <span className="os-timeline-marker" aria-hidden="true">
            {item.tone === "success" ? <CheckCircle2 size={15} /> : <Clock3 size={14} />}
          </span>
          <div className="os-timeline-content">
            <strong>{item.title}</strong>
            {item.meta ? <small>{item.meta}</small> : null}
            {item.description ? <p>{item.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function normalizedLocale(locale: DisplayLocale) {
  return locale === "ar" || locale.startsWith("ar") ? "ar" : "en";
}

export function formattedFileSize(sizeBytes: number, locale: DisplayLocale): string {
  const language = normalizedLocale(locale);
  const formatter = new Intl.NumberFormat(
    language === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-SA-u-ca-gregory-nu-latn",
    {
      maximumFractionDigits: 1,
    },
  );
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return language === "ar" ? "الحجم غير متاح" : "Size unavailable";
  }
  if (sizeBytes < 1024) return `${formatter.format(sizeBytes)} ${language === "ar" ? "بايت" : "B"}`;
  if (sizeBytes < 1024 ** 2)
    return `${formatter.format(sizeBytes / 1024)} ${language === "ar" ? "ك.ب" : "KB"}`;
  return `${formatter.format(sizeBytes / 1024 ** 2)} ${language === "ar" ? "م.ب" : "MB"}`;
}

function canPreview(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

export function fileTypeLabel(mimeType: string, locale: DisplayLocale): string {
  const language = normalizedLocale(locale);
  if (language === "en") {
    return mimeType.split("/").at(-1)?.toUpperCase() || "File";
  }

  if (mimeType.startsWith("image/")) return "صورة";

  const arabicLabels: Record<string, string> = {
    "application/json": "بيانات JSON",
    "application/msword": "مستند Word",
    "application/pdf": "مستند PDF",
    "application/vnd.ms-excel": "جدول Excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "جدول Excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "مستند Word",
    "application/zip": "ملف مضغوط",
    "text/csv": "جدول CSV",
    "text/plain": "ملف نصي",
  };

  return arabicLabels[mimeType] ?? "ملف";
}

export function FileCard({
  actions,
  downloadLabel,
  file,
  locale = "ar",
  previewLabel,
  readyLabel,
}: {
  actions?: ReactNode;
  downloadLabel?: string;
  file: {
    id: string;
    downloadUrl?: string | null | undefined;
    mimeType: string;
    name: string;
    sizeBytes: number;
    version?: number;
  };
  locale?: DisplayLocale;
  previewLabel?: string;
  readyLabel?: string;
}) {
  const language = normalizedLocale(locale);
  const isImage = file.mimeType.startsWith("image/");
  const typeLabel = fileTypeLabel(file.mimeType, language);
  return (
    <article className="os-file-card">
      <span className="os-file-icon" aria-hidden="true">
        {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
      </span>
      <div className="os-file-copy">
        <strong title={file.name}>{file.name}</strong>
        <div className="os-file-meta">
          <span>{typeLabel}</span>
          <span>{formattedFileSize(file.sizeBytes, language)}</span>
          {file.version ? (
            <span>{language === "ar" ? `الإصدار ${file.version}` : `Version ${file.version}`}</span>
          ) : null}
          <span className="os-file-ready">
            <CheckCircle2 aria-hidden="true" size={13} />
            {readyLabel ?? (language === "ar" ? "مرفوع وجاهز" : "Uploaded and ready")}
          </span>
        </div>
      </div>
      <div className="os-file-actions">
        {file.downloadUrl && canPreview(file.mimeType) ? (
          <a
            className="icon-button"
            href={file.downloadUrl}
            target="_blank"
            rel="noreferrer"
            title={previewLabel ?? (language === "ar" ? "معاينة الملف" : "Preview file")}
            aria-label={previewLabel ?? (language === "ar" ? "معاينة الملف" : "Preview file")}
          >
            <Eye aria-hidden="true" size={17} />
          </a>
        ) : null}
        {file.downloadUrl ? (
          <a
            className="icon-button"
            href={file.downloadUrl}
            title={downloadLabel ?? (language === "ar" ? "تنزيل الملف" : "Download file")}
            aria-label={downloadLabel ?? (language === "ar" ? "تنزيل الملف" : "Download file")}
          >
            <Download aria-hidden="true" size={17} />
          </a>
        ) : null}
        {actions}
      </div>
    </article>
  );
}
