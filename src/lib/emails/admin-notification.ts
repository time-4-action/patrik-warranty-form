import type { WarrantyPayload } from "@/types/warranty";
import { esc } from "./_html";
import type { BuiltEmail } from "./user-confirmation";

export function buildAdminNotification(
  payload: WarrantyPayload,
  submittedAt: string,
): BuiltEmail {
  const receiptUrl = `${process.env.BASE_URL}/warranty/${payload.submissionId}`;
  const submittedDate = new Date(submittedAt).toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const submittedDateShort = new Date(submittedAt).toISOString().slice(0, 10);
  const fullName = [payload.name, payload.surname].filter(Boolean).join(" ");

  const subject = `Warranty Request [${submittedDateShort}] [${payload.productName || "unnamed product"}]`;

  const rows: [string, string][] = [
    ["Submission ID", payload.submissionId],
    ["Submitted", submittedDate],
    ["Receipt page", receiptUrl],
    ["Name", fullName],
    ["Company", payload.company],
    ["Email", payload.email],
    ["Phone", payload.phone],
    ["Type of partner", payload.typeOfPartner],
    ["Address", payload.address],
    ["Country of purchase", payload.countryOfPurchase],
    ["Invoice number", payload.invoiceNumber],
    ["Invoice issued by", payload.invoiceIssuedBy],
    ["Date of purchase", payload.dateOfPurchase],
    ["SKU", payload.sku],
    ["EAN", payload.ean],
    ["Product name", payload.productName],
    ["Product category", payload.productCategory],
    ["Serial number", payload.serialNumber],
    ["Date of failure", payload.dateOfFailure],
    ["Problem description", payload.problemDescription],
    ["Data policy accepted", payload.dataPolicyAccepted ? "yes" : "no"],
  ];

  const valueCellStyle =
    "padding:8px 12px;font-size:13px;color:#18181b;border-top:1px solid #e5e7eb;white-space:pre-wrap;word-break:break-word;overflow-wrap:break-word;hyphens:auto;";

  const rowsHtml = rows
    .map(([label, value]) => {
      const isUrl = value.startsWith("http://") || value.startsWith("https://");
      const cell = isUrl
        ? `<a href="${esc(value)}" style="color:#2563eb;word-break:break-all;">${esc(value)}</a>`
        : esc(value) || "—";
      return `<tr>
        <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;vertical-align:top;width:160px;white-space:nowrap;">${esc(label)}</td>
        <td style="${valueCellStyle}">${cell}</td>
      </tr>`;
    })
    .join("");

  const fileLabels: [keyof typeof payload.fileUrls, string][] = [
    ["invoice", "Invoice / proof of purchase"],
    ["serial", "Serial number photo"],
    ["full", "Full product photo"],
    ["closeup", "Closeup photo"],
  ];

  const filesHtml = fileLabels
    .map(
      ([key, label]) => `<tr>
        <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;vertical-align:top;width:160px;white-space:nowrap;">${esc(label)}</td>
        <td style="${valueCellStyle}">
          <a href="${esc(payload.fileUrls[key])}" style="color:#2563eb;word-break:break-all;">${esc(payload.fileUrls[key])}</a>
        </td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:24px 32px 8px 32px;">
          <h1 style="margin:0 0 8px 0;font-size:18px;line-height:1.3;">New warranty claim</h1>
          <p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">
            From ${esc(fullName) || esc(payload.email)} — reply to this email to respond directly to the customer.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;">
          <h2 style="margin:8px 0;font-size:14px;color:#18181b;">Submission</h2>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;">
            ${rowsHtml}
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px 32px 32px;">
          <h2 style="margin:8px 0;font-size:14px;color:#18181b;">Uploaded files</h2>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;">
            ${filesHtml}
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textLines = [
    "New warranty claim",
    "",
    ...rows.map(([label, value]) => `${label}: ${value || "—"}`),
    "",
    "Uploaded files:",
    ...fileLabels.map(([key, label]) => `  ${label}: ${payload.fileUrls[key]}`),
  ];

  return { subject, html, text: textLines.join("\n") };
}
