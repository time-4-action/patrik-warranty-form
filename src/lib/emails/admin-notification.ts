import type { WarrantyPayload } from "@/types/warranty";
import {
  ADMIN_FIELD_LABELS,
  type AdminEmailSettings,
  type AdminFieldKey,
} from "@/types/warranty-settings";
import { esc, paragraphs, renderTemplate } from "./_html";
import type { BuiltEmail } from "./user-confirmation";

const FILE_LABELS: [keyof WarrantyPayload["fileUrls"], string][] = [
  ["invoice", "Invoice / proof of purchase"],
  ["serial", "Serial number photo"],
  ["full", "Full product photo"],
  ["closeup", "Closeup photo"],
  ["extra", "Additional file"],
];

function adminFieldValue(
  key: AdminFieldKey,
  payload: WarrantyPayload,
  submittedDate: string,
  fullName: string,
): string {
  switch (key) {
    case "submissionId":
      return payload.submissionId;
    case "submittedAt":
      return submittedDate;
    case "name":
      return fullName;
    case "company":
      return payload.company;
    case "email":
      return payload.email;
    case "phone":
      return payload.phone;
    case "typeOfPartner":
      return payload.typeOfPartner;
    case "address":
      return payload.address;
    case "countryOfPurchase":
      return payload.countryOfPurchase;
    case "invoiceNumber":
      return payload.invoiceNumber;
    case "invoiceIssuedBy":
      return payload.invoiceIssuedBy;
    case "dateOfPurchase":
      return payload.dateOfPurchase;
    case "sku":
      return payload.sku;
    case "ean":
      return payload.ean;
    case "productName":
      return payload.productName;
    case "productCategory":
      return payload.productCategory;
    case "serialNumber":
      return payload.serialNumber;
    case "dateOfFailure":
      return payload.dateOfFailure;
    case "daysOfUse":
      return payload.daysOfUse;
    case "problemDescription":
      return payload.problemDescription;
    case "dataPolicyAccepted":
      return payload.dataPolicyAccepted ? "yes" : "no";
    case "uploads":
      return "";
  }
}

export function buildAdminNotification(
  payload: WarrantyPayload,
  submittedAt: string,
  settings: AdminEmailSettings,
): BuiltEmail {
  const receiptUrl = `${process.env.BASE_URL}/warranty/${payload.submissionId}`;
  const submittedDate = new Date(submittedAt).toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const submittedDateShort = new Date(submittedAt).toISOString().slice(0, 10);
  const fullName = [payload.name, payload.surname].filter(Boolean).join(" ");

  const subject = renderTemplate(settings.subject, {
    date: submittedDateShort,
    productName: payload.productName || "unnamed product",
    submissionId: payload.submissionId,
    name: fullName,
  });

  const introHtml = paragraphs(
    settings.intro,
    "margin:0 0 12px 0;font-size:13px;color:#6b7280;",
  );

  // Rows section — excludes "uploads" (uploads render their own section).
  const dataFieldKeys = settings.fields.filter((k) => k !== "uploads");
  const showUploads = settings.fields.includes("uploads");

  const lbl =
    "padding:9px 12px;font-size:13px;color:#6b7280;vertical-align:top;white-space:nowrap;width:150px;";
  const val =
    "padding:9px 12px;font-size:13px;color:#18181b;word-break:break-word;overflow-wrap:break-word;hyphens:auto;white-space:pre-wrap;";
  const border = "border-top:1px solid #e5e7eb;";

  const rowsHtml = dataFieldKeys
    .map((key, i) => {
      const label = ADMIN_FIELD_LABELS[key];
      const value = adminFieldValue(key, payload, submittedDate, fullName);
      const topBorder = i === 0 ? "" : border;
      const cell =
        key === "email"
          ? `<a href="mailto:${esc(value)}" style="color:#0891b2;text-decoration:none;">${esc(value)}</a>`
          : esc(value) || "—";
      return `<tr>
            <td style="${lbl}${topBorder}">${esc(label)}</td>
            <td style="${val}${topBorder}">${cell}</td>
          </tr>`;
    })
    .join("");

  // Optional slots (e.g. "extra") are omitted when no file was uploaded.
  const presentFiles = FILE_LABELS.filter(([key]) => payload.fileUrls[key]);

  const filesHtml = presentFiles.map(
    ([key, label], i) => `<tr>
        <td style="${lbl}${i === 0 ? "" : border}">${esc(label)}</td>
        <td style="${val}${i === 0 ? "" : border}">
          <a href="${esc(payload.fileUrls[key])}" style="color:#0891b2;text-decoration:none;">View &rarr;</a>
        </td>
      </tr>`,
  ).join("");

  const detailsSection = dataFieldKeys.length
    ? `<tr><td class="section" style="padding:0 32px 16px 32px;">
          <h2 style="margin:0 0 8px 0;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Submission details</h2>
          <table role="presentation" class="dl" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;">
            ${rowsHtml}
          </table>
        </td></tr>`
    : "";

  const uploadsSection = showUploads
    ? `<tr><td class="section" style="padding:0 32px 24px 32px;">
          <h2 style="margin:0 0 8px 0;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Uploaded files</h2>
          <table role="presentation" class="dl" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;">
            ${filesHtml}
          </table>
        </td></tr>`
    : "";

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
          ${introHtml}
        </td></tr>

        ${detailsSection}
        ${uploadsSection}

        <tr><td class="foot" style="padding:10px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:right;">
          #${esc(payload.submissionId)}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textLines: string[] = ["New warranty claim", ""];
  if (settings.intro?.trim()) {
    textLines.push(settings.intro.trim(), "");
  }
  for (const key of dataFieldKeys) {
    const label = ADMIN_FIELD_LABELS[key];
    const value = adminFieldValue(key, payload, submittedDate, fullName);
    textLines.push(`${label}: ${value || "—"}`);
  }
  textLines.push("", `Receipt: ${receiptUrl}`);
  if (showUploads) {
    textLines.push("", "Uploaded files:");
    for (const [key, label] of presentFiles) {
      textLines.push(`  ${label}: ${payload.fileUrls[key]}`);
    }
  }
  textLines.push("", `#${payload.submissionId}`);

  return { subject, html, text: textLines.join("\n") };
}
