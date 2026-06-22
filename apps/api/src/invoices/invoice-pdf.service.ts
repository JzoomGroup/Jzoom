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

export interface InvoicePdfResult {
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
export class InvoicePdfService {
  async render(input: unknown): Promise<InvoicePdfResult> {
    const invoice = record(input);
    const invoiceNumber = stringValue(invoice, "invoiceNumber", "invoice");
    const currency = stringValue(invoice, "currency", "SAR");
    const client = record(invoice.client);
    const sourceQuote = record(invoice.quote);
    const terms = record(invoice.terms);
    const totals = record(invoice.totals);
    const items = arrayValue(invoice.items).map(record);
    const monthlyItems = items.filter((item) => this.itemLineType(item) === "MONTHLY");
    const oneTimeItems = items.filter((item) => this.itemLineType(item) === "ONE_TIME");
    const snapshotHash = stringValue(invoice, "snapshotHash");

    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    pdf.setTitle(`Jzoom Invoice ${invoiceNumber}`);
    pdf.setAuthor("Jzoom");
    pdf.setSubject("Invoice generated from immutable invoice snapshot");
    pdf.setCreator("Jzoom Operating Platform");
    pdf.setProducer("Jzoom Operating Platform");
    pdf.setCreationDate(new Date());

    const fonts = await this.loadFonts(pdf);
    let page = this.addPage(pdf, fonts, true);
    let y = A4.height - 150;

    const ensureSpace = (height: number): void => {
      if (y - height >= margin) {
        return;
      }
      page = this.addPage(pdf, fonts, false);
      y = A4.height - 82;
    };

    y = this.drawSummary(page, y, fonts, {
      client,
      invoice,
      sourceQuote,
    });

    ensureSpace(90);
    y = this.drawSectionHeading(
      page,
      y,
      fonts,
      "الخدمات الشهرية المختارة",
      "Selected monthly services",
    );
    if (monthlyItems.length === 0) {
      y = this.drawEmptyState(
        page,
        y,
        fonts,
        "لا توجد خدمات شهرية ضمن هذه الفاتورة.",
        "No monthly services in this invoice.",
      );
    } else {
      for (const item of monthlyItems) {
        ensureSpace(92);
        y = this.drawInvoiceLine(page, y, fonts, item, currency);
      }
    }

    ensureSpace(90);
    y = this.drawSectionHeading(page, y, fonts, "الخدمات لمرة واحدة", "Selected one-time services");
    if (oneTimeItems.length === 0) {
      y = this.drawEmptyState(
        page,
        y,
        fonts,
        "لا توجد خدمات لمرة واحدة ضمن هذه الفاتورة.",
        "No one-time services in this invoice.",
      );
    } else {
      for (const item of oneTimeItems) {
        ensureSpace(82);
        y = this.drawInvoiceLine(page, y, fonts, item, currency);
      }
    }

    ensureSpace(150);
    y = this.drawTotals(page, y, fonts, totals, invoice, currency);

    ensureSpace(145);
    this.drawTerms(page, y, fonts, terms);

    this.drawFooters(pdf, fonts, snapshotHash);
    const bytes = Buffer.from(await pdf.save());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    return {
      bytes,
      byteLength: bytes.byteLength,
      contentType: "application/pdf",
      filename: `${sanitizeFilename(invoiceNumber)}.pdf`,
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
      firstPage ? "فاتورة" : "فاتورة · Invoice",
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
        "Invoice generated from the immutable stored invoice snapshot",
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
      invoice: Record<string, unknown>;
      sourceQuote: Record<string, unknown>;
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
      "تفاصيل الفاتورة",
      "Invoice details",
      compact([
        stringValue(input.invoice, "invoiceNumber"),
        stringValue(input.invoice, "status"),
        formatDate(input.invoice.issueDate || input.invoice.createdAt),
      ]),
      middle,
      cardY - 18,
      columnWidth,
      fonts,
    );
    drawLabelValue(
      page,
      "مرجع عرض السعر",
      "Source quote",
      compact([
        stringValue(input.sourceQuote, "quoteNumber") || stringValue(input.invoice, "quoteNumber"),
        stringValue(input.sourceQuote, "status"),
        stringValue(input.sourceQuote, "snapshotHash").slice(0, 12),
      ]),
      left,
      cardY - 18,
      columnWidth,
      fonts,
    );
    return cardY - 118;
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

  private drawInvoiceLine(
    page: PDFPage,
    y: number,
    fonts: FontSet,
    item: Record<string, unknown>,
    currency: string,
  ): number {
    const itemSnapshot = record(item.itemSnapshot);
    const serviceSnapshot = record(itemSnapshot.serviceSnapshot);
    const serviceItems = arrayValue(itemSnapshot.serviceItems).map(record);
    const nameAr = stringValue(
      serviceSnapshot,
      "nameAr",
      stringValue(serviceSnapshot, "nameEn", "Service"),
    );
    const nameEn = stringValue(serviceSnapshot, "nameEn");
    const hours = numberValue(itemSnapshot, "hours");
    const details = compact([
      stringValue(serviceSnapshot, "serviceCode"),
      stringValue(serviceSnapshot, "serviceLevelLabel") ||
        stringValue(serviceSnapshot, "serviceLevelCode"),
      hours ? `${hours} hours` : null,
      `Qty ${numberValue(item, "quantity", numberValue(itemSnapshot, "quantity", 1))}`,
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
    drawText(page, "الإجمالي", amountX + 120, y - 10, fonts, {
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
    drawText(
      page,
      `Discount ${formatAmount(item.discount, currency)}`,
      amountX + 120,
      y - 44,
      fonts,
      {
        color: palette.darkGray,
        maxWidth: 120,
        right: true,
        size: 7,
      },
    );

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
    invoice: Record<string, unknown>,
    currency: string,
  ): number {
    y = this.drawSectionHeading(page, y, fonts, "الإجماليات", "Totals");
    const rows: Array<[string, string, unknown]> = [
      ["الخدمات الشهرية", "Monthly services", totals.subtotalMonthly],
      ["رسوم الإعداد", "Setup fees", totals.subtotalSetup],
      ["الخدمات لمرة واحدة", "One-time services", totals.subtotalOneTime],
      ["الخصومات", "Discounts", invoice.discountTotal ?? totals.discountTotal],
      [
        "المستحق النهائي قبل الضريبة",
        "Final due before tax",
        invoice.finalDueNoTax ?? totals.finalBeforeTax,
      ],
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
      const isFinal = labelEn === "Final due before tax";
      const color = isFinal ? palette.coral : palette.white;
      drawText(page, labelAr, A4.width - margin - 18, rowY, fonts, {
        color,
        font: isFinal ? fonts.bold : fonts.semibold,
        maxWidth: 250,
        right: true,
        size: isFinal ? 12 : 9,
      });
      drawText(page, labelEn, A4.width - margin - 18, rowY - 12, fonts, {
        color: palette.sand,
        maxWidth: 250,
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
        compact(["Invoice snapshot", snapshotHash ? snapshotHash.slice(0, 16) : null]),
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

  private itemLineType(item: Record<string, unknown>): string {
    return stringValue(record(item.itemSnapshot), "lineType");
  }
}
