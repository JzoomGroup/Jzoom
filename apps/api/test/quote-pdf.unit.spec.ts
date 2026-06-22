import "reflect-metadata";
import { QuotePdfService } from "../src/quotes/quote-pdf.service.js";

describe("PR 8 quote PDF generation", () => {
  it("generates an A4 PDF from public immutable quote snapshot fields", async () => {
    const pdf = await new QuotePdfService().render({
      id: "quote-1",
      quoteNumber: "QT-20260622-ABC12345",
      status: "ISSUED",
      currency: "SAR",
      issueDate: "2026-06-22T00:00:00.000Z",
      createdAt: "2026-06-22T00:00:00.000Z",
      snapshotHash: "a".repeat(64),
      client: {
        code: "CLIENT-1",
        name: "Jzoom Client",
        legalName: "Jzoom Client LLC",
        sector: "Technology",
        city: "Riyadh",
        authorizedApprover: "Approver",
      },
      terms: {
        paymentTerms: "50% upfront",
        deliveryTerms: "According to plan",
        additionalTerms: "Scope changes require written approval",
        clientNotes: "Prepared for the client approver",
        validUntil: "2026-07-22T00:00:00.000Z",
      },
      totals: {
        subtotalMonthly: 6_000,
        subtotalSetup: 300,
        subtotalOneTime: 1_200,
        discountTotal: 200,
        taxTotal: 109.5,
        finalTotal: 7_409.5,
        internalCost: 1,
        marginAmount: 1,
        marginPct: 1,
      },
      items: [
        {
          lineType: "MONTHLY",
          quantity: 1,
          hours: 20,
          setupFee: 300,
          lineTotal: 6_300,
          internalCost: 1,
          serviceSnapshot: {
            serviceCode: "MONTHLY-OPS",
            nameAr: "خدمة شهرية",
            nameEn: "Monthly operations",
            serviceLevelLabel: "Growth",
          },
          serviceItems: [
            {
              itemCode: "ITEM-1",
              nameAr: "مخرج شهري",
              nameEn: "Monthly output",
            },
          ],
        },
        {
          lineType: "ONE_TIME",
          quantity: 1,
          setupFee: 0,
          lineTotal: 1_200,
          internalCost: 1,
          serviceSnapshot: {
            serviceCode: "BUILD-1",
            nameAr: "خدمة لمرة واحدة",
            nameEn: "One-time build",
          },
          serviceItems: [],
        },
      ],
    });

    expect(pdf.contentType).toBe("application/pdf");
    expect(pdf.filename).toBe("QT-20260622-ABC12345.pdf");
    expect(pdf.bytes.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(10_000);
    expect(pdf.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
