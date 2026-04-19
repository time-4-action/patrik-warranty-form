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

  const subject = `Warranty Request [${submittedDateShort}] [${payload.productName || "unnamed product"}] #${payload.submissionId}`;

  const rows: [string, string][] = [
    ["Submission ID", payload.submissionId],
    ["Submitted", submittedDate],
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

  const lbl =
    "padding:9px 12px;font-size:13px;color:#6b7280;vertical-align:top;white-space:nowrap;width:150px;";
  const val =
    "padding:9px 12px;font-size:13px;color:#18181b;word-break:break-word;overflow-wrap:break-word;hyphens:auto;white-space:pre-wrap;";
  const border = "border-top:1px solid #e5e7eb;";

  const rowsHtml = rows
    .map(([label, value], i) => {
      const topBorder = i === 0 ? "" : border;
      const cell =
        label === "Email"
          ? `<a href="mailto:${esc(value)}" style="color:#0891b2;text-decoration:none;">${esc(value)}</a>`
          : esc(value) || "—";
      return `<tr>
        <td style="${lbl}${topBorder}">${esc(label)}</td>
        <td style="${val}${topBorder}">${cell}</td>
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
      ([key, label], i) => `<tr>
        <td style="${lbl}${i === 0 ? "" : border}">${esc(label)}</td>
        <td style="${val}${i === 0 ? "" : border}">
          <a href="${esc(payload.fileUrls[key])}" style="color:#0891b2;text-decoration:none;">View &rarr;</a>
        </td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    @media only screen and (max-width:480px){
      .wrap{padding:8px 0!important;}
      .card{border-radius:0!important;}
      .body{padding:20px 16px 8px 16px!important;}
      .section{padding:0 16px 16px 16px!important;}
      .foot{padding:10px 16px!important;}
      .dl td{display:block;width:100%!important;box-sizing:border-box;}
      .dl .lbl{border-top:1px solid #e5e7eb;white-space:normal!important;width:auto!important;}
      .dl .val{border-top:none!important;padding-top:2px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" class="wrap" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:8px;overflow:hidden;">

        <tr><td class="body" style="padding:24px 32px 12px 32px;">
          <h1 style="margin:0 0 6px 0;font-size:18px;line-height:1.3;">New warranty claim</h1>
          <p style="margin:0 0 12px 0;font-size:13px;color:#6b7280;">
            From <strong>${esc(fullName) || esc(payload.email)}</strong>
            &mdash; <a href="mailto:${esc(payload.email)}" style="color:#0891b2;text-decoration:none;">reply to respond</a>
            &mdash; <a href="${esc(receiptUrl)}" style="color:#0891b2;text-decoration:none;">view receipt</a>
          </p>
        </td></tr>

        <tr><td class="section" style="padding:0 32px 16px 32px;">
          <h2 style="margin:0 0 8px 0;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Submission details</h2>
          <table role="presentation" class="dl" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;">
            ${rowsHtml}
          </table>
        </td></tr>

        <tr><td class="section" style="padding:0 32px 24px 32px;">
          <h2 style="margin:0 0 8px 0;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Uploaded files</h2>
          <table role="presentation" class="dl" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;">
            ${filesHtml}
          </table>
        </td></tr>

        <tr><td class="foot" style="padding:10px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:right;">
          #${esc(payload.submissionId)}
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
    "Receipt: " + receiptUrl,
    "",
    "Uploaded files:",
    ...fileLabels.map(([key, label]) => `  ${label}: ${payload.fileUrls[key]}`),
    "",
    `#${payload.submissionId}`,
  ];

  return { subject, html, text: textLines.join("\n") };
}
