export const MANAGE_INVOICES_PERMISSION = "PERM-MANAGE-INVOICES";
export const ACCOUNT_MANAGER_ROLE_CODE = "ROLE-AM";

export const INVOICE_PUBLIC_STATUSES = ["DRAFT", "ISSUED", "CANCELLED", "VOIDED"] as const;

export const INVOICE_EVENT = {
  cancelled: "INVOICE_CANCELLED",
  created: "INVOICE_CREATED",
  issued: "INVOICE_ISSUED",
  pdfGenerated: "INVOICE_PDF_GENERATED",
  statusChanged: "INVOICE_STATUS_CHANGED",
  voided: "INVOICE_VOIDED",
} as const;
