import { Injectable } from "@nestjs/common";
import fontkit from "@pdf-lib/fontkit";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { PDFDocument, rgb } from "pdf-lib";
import type { PDFFont, PDFPage, RGB } from "pdf-lib";

const require = createRequire(import.meta.url);

const A4 = {
  width: 595.28,
  height: 841.89,
} as const;

const palette = {
  coral: rgb(1, 90 / 255, 77 / 255),
  navy: rgb(13 / 255, 19 / 255, 33 / 255),
  offWhite: rgb(239 / 255, 238 / 255, 232 / 255),
  sand: rgb(208 / 255, 200 / 255, 183 / 255),
  darkGray: rgb(51 / 255, 51 / 255, 51 / 255),
  white: rgb(1, 1, 1),
} as const;

const margin = 42;
const contentWidth = A4.width - margin * 2;

export interface QuotePdfResult {
  bytes: Buffer;
  byteLength: number;
  contentType: "application/pdf";
  filename: string;
  sha256: string;
}

interface FontSet {
  regular: PDFFont;
  semibold: PDFFont;
  bold: PDFFont;
}

interface TextOptions {
  color?: RGB;
  font?: PDFFont;
  lineHeight?: number;
  maxWidth?: number;
  right?: boolean;
  size?: number;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(source: Record<string, unknown>, key: string, fallback = ""): string {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(source: Record<string, unknown>, key: string, fallback = 0): number {
  const value = Number(source[key]);
  return Number.isFinite(value) ? value : fallback;
}

function compact(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part?.trim())).join(" · ");
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/g, "-").replace(/-+/g, "-");
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toISOString().slice(0, 10);
}

function formatAmount(value: unknown, currency: string): string {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${currency} ${safeAmount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function shortText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }
  const words = normalized.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  fonts: FontSet,
  options: TextOptions = {},
): number {
  const font = options.font ?? fonts.regular;
  const size = options.size ?? 10;
  const color = options.color ?? palette.darkGray;
  const lineHeight = options.lineHeight ?? size + 5;
  const maxWidth = options.maxWidth ?? contentWidth;
  const lines = wrapText(text, font, size, maxWidth);
  for (const [index, line] of lines.entries()) {
    const lineX = options.right ? x - font.widthOfTextAtSize(line, size) : x;
    page.drawText(line, {
      x: lineX,
      y: y - index * lineHeight,
      size,
      font,
      color,
    });
  }
  return y - Math.max(lines.length, 1) * lineHeight;
}

function drawLabelValue(
  page: PDFPage,
  labelAr: string,
  labelEn: string,
  value: string,
  xRight: number,
  y: number,
  width: number,
  fonts: FontSet,
): number {
  drawText(page, labelAr, xRight, y, fonts, {
    color: palette.coral,
    font: fonts.semibold,
    maxWidth: width,
    right: true,
    size: 8,
  });
  drawText(page, labelEn, xRight, y - 12, fonts, {
    color: palette.darkGray,
    maxWidth: width,
    right: true,
    size: 7,
  });
  return drawText(page, value || "—", xRight, y - 28, fonts, {
    color: palette.navy,
    font: fonts.semibold,
    maxWidth: width,
    right: true,
    size: 10,
  });
}

@Injectable()
export class QuotePdfService {
  async render(input: unknown): Promise<QuotePdfResult> {
    const quote = record(input);
    const quoteNumber = stringValue(quote, "quoteNumber", "quote");
    const currency = stringValue(quote, "currency", "SAR");
    const client = record(quote.client);
    const terms = record(quote.terms);
    const totals = record(quote.totals);
    const items = arrayValue(quote.items).map(record);
    const snapshotHash = stringValue(quote, "snapshotHash");

    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    pdf.setTitle(`Jzoom Quote ${quoteNumber}`);
    pdf.setAuthor("Jzoom");
    pdf.setSubject("Quote generated from immutable quote snapshot");
    pdf.setCreator("Jzoom Operating Platform");
    pdf.setProducer("Jzoom Operating Platform");
    pdf.setCreationDate(new Date());

    const fonts = await this.loadFonts(pdf);
    const page = this.addPage(pdf, fonts, true);
    let y = A4.height - 150;

    y = this.drawSummary(page, y, fonts, {
      client,
      quote,
      terms,
    });

    y = this.drawSectionHeading(page, y, fonts, "الخدمات المختارة", "Selected services");
    if (items.length === 0) {
      y = this.drawEmptyState(
        page,
        y,
        fonts,
        "لا توجد خدمات ضمن هذا العرض.",
        "No services in this quote.",
      );
    } else {
      y = this.drawCompactLineTable(page, y, fonts, items, currency);
    }

    y = this.drawCompactTotals(page, y, fonts, totals, currency);

    this.drawCompactTerms(page, y, fonts, terms);

    this.drawFooters(pdf, fonts, snapshotHash);
    const bytes = Buffer.from(await pdf.save());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    return {
      bytes,
      byteLength: bytes.byteLength,
      contentType: "application/pdf",
      filename: `${sanitizeFilename(quoteNumber)}.pdf`,
      sha256,
    };
  }

  private async loadFonts(pdf: PDFDocument): Promise<FontSet> {
    const [regular, semibold, bold] = await Promise.all([
      readFile(require.resolve("@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf")),
      readFile(require.resolve("@expo-google-fonts/cairo/600SemiBold/Cairo_600SemiBold.ttf")),
      readFile(require.resolve("@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf")),
    ]);
    return {
      regular: await pdf.embedFont(regular, { subset: true }),
      semibold: await pdf.embedFont(semibold, { subset: true }),
      bold: await pdf.embedFont(bold, { subset: true }),
    };
  }

  private addPage(pdf: PDFDocument, fonts: FontSet, firstPage: boolean): PDFPage {
    const page = pdf.addPage([A4.width, A4.height]);
    page.drawRectangle({ x: 0, y: 0, width: A4.width, height: A4.height, color: palette.offWhite });
    page.drawRectangle({
      x: 0,
      y: A4.height - (firstPage ? 126 : 60),
      width: A4.width,
      height: firstPage ? 126 : 60,
      color: palette.navy,
    });
    page.drawRectangle({
      x: 0,
      y: A4.height - (firstPage ? 126 : 60),
      width: 12,
      height: firstPage ? 126 : 60,
      color: palette.coral,
    });
    page.drawText("Jzoom", {
      x: margin,
      y: A4.height - 48,
      size: firstPage ? 24 : 16,
      font: fonts.bold,
      color: palette.white,
    });
    drawText(
      page,
      firstPage ? "عرض سعر" : "عرض سعر · Quote",
      A4.width - margin,
      A4.height - 48,
      fonts,
      {
        color: palette.white,
        font: fonts.bold,
        maxWidth: 260,
        right: true,
        size: firstPage ? 26 : 14,
      },
    );
    if (firstPage) {
      drawText(
        page,
        "Quote generated from the immutable stored snapshot",
        A4.width - margin,
        A4.height - 78,
        fonts,
        {
          color: palette.sand,
          font: fonts.regular,
          maxWidth: 330,
          right: true,
          size: 9,
        },
      );
    }
    return page;
  }

  private drawSummary(
    page: PDFPage,
    y: number,
    fonts: FontSet,
    input: {
      client: Record<string, unknown>;
      quote: Record<string, unknown>;
      terms: Record<string, unknown>;
    },
  ): number {
    const cardY = y - 8;
    const columnWidth = (contentWidth - 18) / 3;
    page.drawRectangle({
      x: margin,
      y: cardY - 92,
      width: contentWidth,
      height: 104,
      borderColor: palette.sand,
      borderWidth: 1,
      color: palette.white,
    });
    const right = A4.width - margin - 16;
    const middle = right - columnWidth - 9;
    const left = middle - columnWidth - 9;

    drawLabelValue(
      page,
      "العميل",
      "Client",
      compact([
        stringValue(input.client, "legalName") || stringValue(input.client, "name"),
        stringValue(input.client, "code"),
      ]),
      right,
      cardY - 18,
      columnWidth,
      fonts,
    );
    drawLabelValue(
      page,
      "تفاصيل العرض",
      "Quote details",
      compact([
        stringValue(input.quote, "quoteNumber"),
        this.quoteStatusLabel(stringValue(input.quote, "status")),
        formatDate(input.quote.createdAt),
      ]),
      middle,
      cardY - 18,
      columnWidth,
      fonts,
    );
    drawLabelValue(
      page,
      "الصلاحية",
      "Validity",
      compact([`حتى ${formatDate(input.terms.validUntil)}`, formatDate(input.quote.issueDate)]),
      left,
      cardY - 18,
      columnWidth,
      fonts,
    );
    return cardY - 118;
  }

  private quoteStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      ACCEPTED: "مؤكد خارج النظام",
      CANCELLED: "ملغي",
      DRAFT: "مسودة",
      EXPIRED: "منتهي الصلاحية",
      ISSUED: "صادر",
      REJECTED: "مرفوض",
    };
    return labels[status] ?? status;
  }

  private lineTypeLabel(value: string): string {
    if (value === "MONTHLY") return "شهري";
    if (value === "ONE_TIME") return "مرة واحدة";
    return value || "خدمة";
  }

  private drawSectionHeading(
    page: PDFPage,
    y: number,
    fonts: FontSet,
    titleAr: string,
    titleEn: string,
  ): number {
    page.drawRectangle({
      x: margin,
      y: y - 12,
      width: contentWidth,
      height: 2,
      color: palette.coral,
    });
    drawText(page, titleAr, A4.width - margin, y + 4, fonts, {
      color: palette.navy,
      font: fonts.bold,
      maxWidth: contentWidth,
      right: true,
      size: 16,
    });
    drawText(page, titleEn, A4.width - margin, y - 16, fonts, {
      color: palette.darkGray,
      maxWidth: contentWidth,
      right: true,
      size: 8,
    });
    return y - 42;
  }

  private drawEmptyState(
    page: PDFPage,
    y: number,
    fonts: FontSet,
    titleAr: string,
    titleEn: string,
  ): number {
    page.drawRectangle({
      x: margin,
      y: y - 36,
      width: contentWidth,
      height: 42,
      borderColor: palette.sand,
      borderWidth: 1,
      color: palette.white,
    });
    drawText(page, titleAr, A4.width - margin - 14, y - 12, fonts, {
      color: palette.darkGray,
      maxWidth: contentWidth - 28,
      right: true,
      size: 10,
    });
    drawText(page, titleEn, A4.width - margin - 14, y - 26, fonts, {
      color: palette.darkGray,
      maxWidth: contentWidth - 28,
      right: true,
      size: 7,
    });
    return y - 54;
  }

  private drawCompactLineTable(
    page: PDFPage,
    y: number,
    fonts: FontSet,
    items: Record<string, unknown>[],
    currency: string,
  ): number {
    const visibleItems = items.slice(0, 7);
    const rowHeight = 33;
    const tableHeight =
      28 + visibleItems.length * rowHeight + (items.length > visibleItems.length ? 24 : 0);

    page.drawRectangle({
      x: margin,
      y: y - tableHeight + 8,
      width: contentWidth,
      height: tableHeight,
      borderColor: palette.sand,
      borderWidth: 1,
      color: palette.white,
    });
    page.drawRectangle({
      x: margin,
      y: y - 20,
      width: contentWidth,
      height: 28,
      color: palette.navy,
    });

    const serviceRight = A4.width - margin - 14;
    const typeRight = margin + 260;
    const qtyRight = margin + 178;
    const totalRight = margin + 110;

    drawText(page, "الخدمة", serviceRight, y - 9, fonts, {
      color: palette.white,
      font: fonts.semibold,
      maxWidth: 260,
      right: true,
      size: 8,
    });
    drawText(page, "النوع", typeRight, y - 9, fonts, {
      color: palette.white,
      font: fonts.semibold,
      maxWidth: 72,
      right: true,
      size: 8,
    });
    drawText(page, "الكمية", qtyRight, y - 9, fonts, {
      color: palette.white,
      font: fonts.semibold,
      maxWidth: 60,
      right: true,
      size: 8,
    });
    drawText(page, "الإجمالي", totalRight, y - 9, fonts, {
      color: palette.white,
      font: fonts.semibold,
      maxWidth: 96,
      right: true,
      size: 8,
    });

    let rowY = y - 46;
    for (const [index, item] of visibleItems.entries()) {
      const snapshot = record(item.serviceSnapshot);
      const serviceItems = arrayValue(item.serviceItems).map(record);
      const name = shortText(
        stringValue(snapshot, "nameAr", stringValue(snapshot, "nameEn", "خدمة")),
        48,
      );
      const code = stringValue(snapshot, "serviceCode");
      const included = serviceItems
        .slice(0, 2)
        .map(
          (serviceItem) => stringValue(serviceItem, "nameAr") || stringValue(serviceItem, "nameEn"),
        )
        .filter(Boolean)
        .join("، ");
      const meta = shortText(compact([code, included]), 62);

      if (index % 2 === 1) {
        page.drawRectangle({
          x: margin + 1,
          y: rowY - 8,
          width: contentWidth - 2,
          height: rowHeight,
          color: rgb(248 / 255, 249 / 255, 251 / 255),
        });
      }

      drawText(page, name, serviceRight, rowY + 10, fonts, {
        color: palette.navy,
        font: fonts.semibold,
        maxWidth: 260,
        right: true,
        size: 9,
      });
      drawText(page, meta || "—", serviceRight, rowY - 4, fonts, {
        color: palette.darkGray,
        maxWidth: 260,
        right: true,
        size: 7,
      });
      drawText(
        page,
        this.lineTypeLabel(stringValue(item, "lineType")),
        typeRight,
        rowY + 5,
        fonts,
        {
          color: palette.darkGray,
          maxWidth: 72,
          right: true,
          size: 8,
        },
      );
      drawText(page, `${numberValue(item, "quantity", 1)}`, qtyRight, rowY + 5, fonts, {
        color: palette.darkGray,
        maxWidth: 60,
        right: true,
        size: 8,
      });
      drawText(page, formatAmount(item.lineTotal, currency), totalRight, rowY + 5, fonts, {
        color: palette.navy,
        font: fonts.semibold,
        maxWidth: 96,
        right: true,
        size: 8,
      });
      rowY -= rowHeight;
    }

    if (items.length > visibleItems.length) {
      drawText(
        page,
        `يوجد ${items.length - visibleItems.length} بند إضافي محفوظ في نسخة العرض داخل النظام.`,
        A4.width - margin - 14,
        rowY + 10,
        fonts,
        {
          color: palette.coral,
          font: fonts.semibold,
          maxWidth: contentWidth - 28,
          right: true,
          size: 8,
        },
      );
    }

    return y - tableHeight - 18;
  }

  private drawCompactTotals(
    page: PDFPage,
    y: number,
    fonts: FontSet,
    totals: Record<string, unknown>,
    currency: string,
  ): number {
    y = this.drawSectionHeading(page, y, fonts, "الملخص المالي", "Financial summary");
    const boxHeight = 96;
    page.drawRectangle({
      x: margin,
      y: y - boxHeight + 8,
      width: contentWidth,
      height: boxHeight,
      color: palette.navy,
    });
    const columns = [
      ["شهري", totals.subtotalMonthly],
      ["مرة واحدة", totals.subtotalOneTime],
      ["تأسيس", totals.subtotalSetup],
      ["خصم", totals.discountTotal],
      ["إجمالي نهائي", totals.finalTotal],
    ] as const;
    const columnWidth = contentWidth / columns.length;
    columns.forEach(([label, value], index) => {
      const right = A4.width - margin - index * columnWidth - 16;
      const isFinal = label === "إجمالي نهائي";
      drawText(page, label, right, y - 22, fonts, {
        color: isFinal ? palette.coral : palette.sand,
        font: fonts.semibold,
        maxWidth: columnWidth - 18,
        right: true,
        size: 8,
      });
      drawText(page, formatAmount(value, currency), right, y - 46, fonts, {
        color: palette.white,
        font: isFinal ? fonts.bold : fonts.semibold,
        maxWidth: columnWidth - 18,
        right: true,
        size: isFinal ? 11 : 9,
      });
    });
    drawText(
      page,
      "الأرقام محفوظة من لقطة التسعير ولا تتغير بتعديل الكتالوج لاحقًا.",
      A4.width - margin - 16,
      y - 76,
      fonts,
      {
        color: palette.sand,
        maxWidth: contentWidth - 32,
        right: true,
        size: 7,
      },
    );
    return y - boxHeight - 16;
  }

  private drawCompactTerms(
    page: PDFPage,
    y: number,
    fonts: FontSet,
    terms: Record<string, unknown>,
  ): void {
    const cursor = this.drawSectionHeading(page, y, fonts, "الشروط المختصرة", "Terms");
    const payment = shortText(stringValue(terms, "paymentTerms", "حسب الشروط المتفق عليها"), 100);
    const delivery = shortText(
      stringValue(terms, "deliveryTerms", "حسب خطة التنفيذ المعتمدة"),
      100,
    );
    page.drawRectangle({
      x: margin,
      y: cursor - 48,
      width: contentWidth,
      height: 58,
      borderColor: palette.sand,
      borderWidth: 1,
      color: palette.white,
    });
    drawText(page, `الدفع: ${payment}`, A4.width - margin - 14, cursor - 12, fonts, {
      color: palette.navy,
      font: fonts.semibold,
      maxWidth: contentWidth - 28,
      right: true,
      size: 8,
    });
    drawText(page, `التسليم: ${delivery}`, A4.width - margin - 14, cursor - 30, fonts, {
      color: palette.darkGray,
      maxWidth: contentWidth - 28,
      right: true,
      size: 8,
    });
  }

  private drawServiceCard(
    page: PDFPage,
    y: number,
    fonts: FontSet,
    item: Record<string, unknown>,
    currency: string,
  ): number {
    const snapshot = record(item.serviceSnapshot);
    const serviceItems = arrayValue(item.serviceItems).map(record);
    const nameAr = stringValue(snapshot, "nameAr", stringValue(snapshot, "nameEn", "Service"));
    const nameEn = stringValue(snapshot, "nameEn");
    const hours = numberValue(item, "hours");
    const details = compact([
      stringValue(snapshot, "serviceCode"),
      stringValue(snapshot, "serviceLevelLabel") || stringValue(snapshot, "serviceLevelCode"),
      hours ? `${hours} hours` : null,
      `Qty ${numberValue(item, "quantity", 1)}`,
    ]);
    const cardHeight = serviceItems.length > 0 ? 96 : 76;
    page.drawRectangle({
      x: margin,
      y: y - cardHeight + 10,
      width: contentWidth,
      height: cardHeight,
      borderColor: palette.sand,
      borderWidth: 1,
      color: palette.white,
    });
    page.drawRectangle({
      x: A4.width - margin - 8,
      y: y - cardHeight + 10,
      width: 8,
      height: cardHeight,
      color: palette.coral,
    });
    drawText(page, nameAr, A4.width - margin - 18, y - 10, fonts, {
      color: palette.navy,
      font: fonts.bold,
      maxWidth: 330,
      right: true,
      size: 12,
    });
    drawText(page, nameEn, A4.width - margin - 18, y - 28, fonts, {
      color: palette.darkGray,
      maxWidth: 330,
      right: true,
      size: 8,
    });
    drawText(page, details, A4.width - margin - 18, y - 44, fonts, {
      color: palette.darkGray,
      maxWidth: 330,
      right: true,
      size: 8,
    });

    const amountX = margin + 18;
    drawText(page, "المبلغ", amountX + 120, y - 10, fonts, {
      color: palette.coral,
      font: fonts.semibold,
      maxWidth: 120,
      right: true,
      size: 8,
    });
    drawText(page, formatAmount(item.lineTotal, currency), amountX + 120, y - 28, fonts, {
      color: palette.navy,
      font: fonts.bold,
      maxWidth: 120,
      right: true,
      size: 10,
    });
    drawText(page, `Setup ${formatAmount(item.setupFee, currency)}`, amountX + 120, y - 44, fonts, {
      color: palette.darkGray,
      maxWidth: 120,
      right: true,
      size: 7,
    });

    if (serviceItems.length > 0) {
      const outputNames = serviceItems
        .slice(0, 4)
        .map(
          (serviceItem) => stringValue(serviceItem, "nameAr") || stringValue(serviceItem, "nameEn"),
        )
        .filter(Boolean)
        .join("، ");
      drawText(
        page,
        compact(["مخرجات مشمولة", outputNames]),
        A4.width - margin - 18,
        y - 66,
        fonts,
        {
          color: palette.darkGray,
          maxWidth: 455,
          right: true,
          size: 8,
        },
      );
    }
    return y - cardHeight - 10;
  }

  private drawTotals(
    page: PDFPage,
    y: number,
    fonts: FontSet,
    totals: Record<string, unknown>,
    currency: string,
  ): number {
    y = this.drawSectionHeading(page, y, fonts, "الإجماليات", "Totals");
    const rows: Array<[string, string, unknown]> = [
      ["الخدمات الشهرية", "Monthly services", totals.subtotalMonthly],
      ["رسوم الإعداد", "Setup fees", totals.subtotalSetup],
      ["الخدمات لمرة واحدة", "One-time services", totals.subtotalOneTime],
      ["الخصومات", "Discounts", totals.discountTotal],
      ["مبالغ إضافية تقديرية", "Estimated additional amounts", totals.taxTotal],
      ["الإجمالي النهائي", "Final total", totals.finalTotal],
    ];
    const boxHeight = rows.length * 24 + 24;
    page.drawRectangle({
      x: margin,
      y: y - boxHeight + 8,
      width: contentWidth,
      height: boxHeight,
      color: palette.navy,
    });
    let rowY = y - 18;
    for (const [labelAr, labelEn, amount] of rows) {
      const isFinal = labelEn === "Final total";
      const color = isFinal ? palette.coral : palette.white;
      drawText(page, labelAr, A4.width - margin - 18, rowY, fonts, {
        color,
        font: isFinal ? fonts.bold : fonts.semibold,
        maxWidth: 240,
        right: true,
        size: isFinal ? 12 : 9,
      });
      drawText(page, labelEn, A4.width - margin - 18, rowY - 12, fonts, {
        color: palette.sand,
        maxWidth: 240,
        right: true,
        size: 7,
      });
      drawText(page, formatAmount(amount, currency), margin + 180, rowY - 2, fonts, {
        color,
        font: isFinal ? fonts.bold : fonts.semibold,
        maxWidth: 160,
        right: true,
        size: isFinal ? 12 : 9,
      });
      rowY -= 24;
    }
    return y - boxHeight - 20;
  }

  private drawTerms(
    page: PDFPage,
    y: number,
    fonts: FontSet,
    terms: Record<string, unknown>,
  ): void {
    let cursor = this.drawSectionHeading(page, y, fonts, "الشروط والملاحظات", "Terms and notes");
    const visibleTerms = [
      ["شروط الدفع", "Payment terms", stringValue(terms, "paymentTerms")],
      ["شروط التسليم", "Delivery terms", stringValue(terms, "deliveryTerms")],
      ["شروط إضافية", "Additional terms", stringValue(terms, "additionalTerms")],
      ["ملاحظات للعميل", "Client notes", stringValue(terms, "clientNotes")],
    ].filter((term): term is [string, string, string] => Boolean(term[2]));
    if (visibleTerms.length === 0) {
      this.drawEmptyState(page, cursor, fonts, "لا توجد شروط إضافية.", "No additional terms.");
      return;
    }
    for (const [labelAr, labelEn, value] of visibleTerms) {
      drawText(page, `${labelAr} · ${labelEn}`, A4.width - margin, cursor, fonts, {
        color: palette.coral,
        font: fonts.semibold,
        maxWidth: contentWidth,
        right: true,
        size: 9,
      });
      cursor = drawText(page, value, A4.width - margin, cursor - 18, fonts, {
        color: palette.darkGray,
        lineHeight: 14,
        maxWidth: contentWidth,
        right: true,
        size: 9,
      });
      cursor -= 8;
    }
  }

  private drawFooters(pdf: PDFDocument, fonts: FontSet, snapshotHash: string): void {
    const pages = pdf.getPages();
    for (const [index, page] of pages.entries()) {
      page.drawRectangle({ x: margin, y: 30, width: contentWidth, height: 1, color: palette.sand });
      page.drawText(`Page ${index + 1} / ${pages.length}`, {
        x: margin,
        y: 16,
        size: 7,
        font: fonts.regular,
        color: palette.darkGray,
      });
      drawText(
        page,
        compact(["Snapshot", snapshotHash ? snapshotHash.slice(0, 16) : null]),
        A4.width - margin,
        16,
        fonts,
        {
          color: palette.darkGray,
          maxWidth: 250,
          right: true,
          size: 7,
        },
      );
    }
  }
}
