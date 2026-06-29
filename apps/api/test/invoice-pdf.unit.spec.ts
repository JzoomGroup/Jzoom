import "reflect-metadata";
import { PDFDocument } from "pdf-lib";
import { InvoicePdfService } from "../src/invoices/invoice-pdf.service.js";

describe("PR 11 invoice PDF generation", () => {
  it("generates an A4 PDF from public immutable invoice snapshot fields", async () => {
    const pdf = await new InvoicePdfService().render({
      id: "invoice-1",
      invoiceNumber: "INV-20260622-ABC12345",
      quoteId: "quote-1",
      quoteNumber: "QT-20260622-ABC12345",
      status: "ISSUED",
      currency: "SAR",
      issueDate: "2026-06-22T00:00:00.000Z",
      createdAt: "2026-06-22T00:00:00.000Z",
      sourceQuoteSnapshotHash: "a".repeat(64),
      snapshotHash: "b".repeat(64),
      client: {
        code: "CLIENT-1",
        name: "Jzoom Client",
        legalName: "Jzoom Client LLC",
        sector: "Technology",
        city: "Riyadh",
        authorizedApprover: "Approver",
      },
      quote: {
        id: "quote-1",
        quoteNumber: "QT-20260622-ABC12345",
        status: "ACCEPTED",
        snapshotHash: "a".repeat(64),
      },
      terms: {
        paymentTerms: "Due in 30 days",
        deliveryTerms: "According to plan",
        additionalTerms: "Scope changes require written approval",
        clientNotes: "Prepared for the client approver",
      },
      totals: {
        subtotalMonthly: 6_000,
        subtotalSetup: 300,
        subtotalOneTime: 1_200,
        subtotal: 7_500,
        discountTotal: 200,
        finalBeforeTax: 7_300,
        taxTotal: 1_095,
        finalTotal: 8_395,
        internalCost: 1,
        marginAmount: 1,
        marginPct: 1,
      },
      discountTotal: 200,
      finalDueNoTax: 7_300,
      items: [
        {
          itemSnapshot: {
            lineType: "MONTHLY",
            quantity: 1,
            hours: 20,
            setupFee: 300,
            serviceSnapshot: {
              serviceCode: "MONTHLY-OPS",
              nameAr: "خدمة شهرية",
              nameEn: "Monthly operations",
              serviceLevelLabel: "Growth",
              internalCost: 1,
            },
            serviceItems: [
              {
                itemCode: "ITEM-1",
                nameAr: "مخرج شهري",
                nameEn: "Monthly output",
              },
            ],
          },
          quantity: 1,
          unitPrice: 6_000,
          discount: 0,
          lineTotal: 6_300,
        },
        {
          itemSnapshot: {
            lineType: "ONE_TIME",
            quantity: 1,
            setupFee: 0,
            serviceSnapshot: {
              serviceCode: "BUILD-1",
              nameAr: "خدمة لمرة واحدة",
              nameEn: "One-time build",
              internalCost: 1,
            },
            serviceItems: [],
          },
          quantity: 1,
          unitPrice: 1_200,
          discount: 200,
          lineTotal: 1_000,
        },
      ],
    });

    expect(pdf.contentType).toBe("application/pdf");
    expect(pdf.filename).toBe("INV-20260622-ABC12345.pdf");
    expect(pdf.bytes.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(10_000);
    expect(pdf.sha256).toMatch(/^[a-f0-9]{64}$/);

    const document = await PDFDocument.load(pdf.bytes);
    expect(document.getPageCount()).toBe(1);
    expect(document.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });
  });
});
