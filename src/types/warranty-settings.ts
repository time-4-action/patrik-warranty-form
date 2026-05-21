export type WarrantyStatus =
  | "new"
  | "in_review"
  | "approved"
  | "rejected"
  | "shipped";

export const WARRANTY_STATUSES: WarrantyStatus[] = [
  "new",
  "in_review",
  "approved",
  "rejected",
  "shipped",
];

export type CustomerFieldKey =
  | "claimNumber"
  | "productName"
  | "serialNumber"
  | "submittedAt";

export type AdminFieldKey =
  | "submissionId"
  | "submittedAt"
  | "name"
  | "company"
  | "email"
  | "phone"
  | "typeOfPartner"
  | "address"
  | "countryOfPurchase"
  | "invoiceNumber"
  | "invoiceIssuedBy"
  | "dateOfPurchase"
  | "sku"
  | "ean"
  | "productName"
  | "productCategory"
  | "serialNumber"
  | "dateOfFailure"
  | "daysOfUse"
  | "problemDescription"
  | "dataPolicyAccepted"
  | "uploads";

export const CUSTOMER_FIELD_KEYS: CustomerFieldKey[] = [
  "claimNumber",
  "productName",
  "serialNumber",
  "submittedAt",
];

export const ADMIN_FIELD_KEYS: AdminFieldKey[] = [
  "submissionId",
  "submittedAt",
  "name",
  "company",
  "email",
  "phone",
  "typeOfPartner",
  "address",
  "countryOfPurchase",
  "invoiceNumber",
  "invoiceIssuedBy",
  "dateOfPurchase",
  "sku",
  "ean",
  "productName",
  "productCategory",
  "serialNumber",
  "dateOfFailure",
  "daysOfUse",
  "problemDescription",
  "dataPolicyAccepted",
  "uploads",
];

export const CUSTOMER_FIELD_LABELS: Record<CustomerFieldKey, string> = {
  claimNumber: "Claim number",
  productName: "Product",
  serialNumber: "Serial number",
  submittedAt: "Submitted",
};

export const ADMIN_FIELD_LABELS: Record<AdminFieldKey, string> = {
  submissionId: "Submission ID",
  submittedAt: "Submitted",
  name: "Name",
  company: "Company",
  email: "Email",
  phone: "Phone",
  typeOfPartner: "Type of partner",
  address: "Address",
  countryOfPurchase: "Country of purchase",
  invoiceNumber: "Invoice number",
  invoiceIssuedBy: "Invoice issued by",
  dateOfPurchase: "Date of purchase",
  sku: "SKU",
  ean: "EAN",
  productName: "Product name",
  productCategory: "Product category",
  serialNumber: "Serial number",
  dateOfFailure: "Date of failure",
  daysOfUse: "Approx. days of use",
  problemDescription: "Problem description",
  dataPolicyAccepted: "Data policy accepted",
  uploads: "Uploaded files (section)",
};

export type CustomerEmailSettings = {
  subject: string;
  intro: string;
  outro: string;
  fields: CustomerFieldKey[];
};

export type AdminEmailSettings = {
  subject: string;
  intro: string;
  fields: AdminFieldKey[];
};

export type WarrantySettings = {
  adminRecipients: string[];
  customer: CustomerEmailSettings;
  admin: AdminEmailSettings;
};

export const DEFAULT_CUSTOMER_INTRO =
  "We have received your warranty submission. Our team will review it and get back to you as soon as possible.";

export const DEFAULT_CUSTOMER_OUTRO =
  "Questions? Reply to this email or contact us at info@patrik-windsurf.com.";

export const DEFAULT_ADMIN_INTRO =
  "A new warranty claim has been submitted. Details below.";

export const DEFAULT_SETTINGS: WarrantySettings = {
  adminRecipients: [],
  customer: {
    subject: "Your PATRIK warranty request",
    intro: DEFAULT_CUSTOMER_INTRO,
    outro: DEFAULT_CUSTOMER_OUTRO,
    fields: [...CUSTOMER_FIELD_KEYS],
  },
  admin: {
    subject:
      "Warranty Request [{{date}}] [{{productName}}] #{{submissionId}}",
    intro: DEFAULT_ADMIN_INTRO,
    fields: [...ADMIN_FIELD_KEYS],
  },
};
