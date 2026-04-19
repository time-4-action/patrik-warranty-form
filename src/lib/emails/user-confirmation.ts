import type { WarrantyPayload } from "@/types/warranty";
import { esc } from "./_html";

export type BuiltEmail = { subject: string; html: string; text: string };

export function buildUserConfirmation(
  payload: WarrantyPayload,
  submittedAt: string,
): BuiltEmail {
  const shortId = payload.submissionId.slice(0, 8);
  const receiptUrl = `${process.env.BASE_URL}/warranty/${payload.submissionId}`;
  const submittedDate = new Date(submittedAt).toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const contactEmail = "info@patrik-windsurf.com";
  const fullName = [payload.name, payload.surname].filter(Boolean).join(" ");

  const subject = `Your PATRIK warranty request`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    @media only screen and (max-width:480px){
      .wrap{padding:12px 0!important;}
      .card{border-radius:0!important;}
      .body{padding:24px 16px 16px 16px!important;}
      .foot{padding:12px 16px!important;}
      .dl td{display:block;width:100%!important;box-sizing:border-box;}
      .dl .lbl{border-top:1px solid #e5e7eb;padding-bottom:2px!important;}
      .dl .val{border-top:none!important;padding-top:2px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" class="wrap" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td class="body" style="padding:32px 32px 16px 32px;">
          <h1 style="margin:0 0 16px 0;font-size:20px;line-height:1.3;color:#18181b;">Thank you for your warranty claim</h1>
          <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;">Dear ${esc(fullName) || "Customer"},</p>
          <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;">
            We have received your warranty submission. Our team will review it and get back to you as soon as possible.
          </p>

          <table role="presentation" class="dl" cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;margin-bottom:24px;">
            <tr>
              <td class="lbl" style="padding:10px 14px;font-size:13px;color:#6b7280;width:130px;white-space:nowrap;">Claim number</td>
              <td class="val" style="padding:10px 14px;font-size:13px;color:#18181b;font-family:monospace;">#${esc(shortId)}</td>
            </tr>
            <tr>
              <td class="lbl" style="padding:10px 14px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;white-space:nowrap;">Product</td>
              <td class="val" style="padding:10px 14px;font-size:13px;color:#18181b;border-top:1px solid #e5e7eb;">${esc(payload.productName) || "—"}</td>
            </tr>
            <tr>
              <td class="lbl" style="padding:10px 14px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;white-space:nowrap;">Serial number</td>
              <td class="val" style="padding:10px 14px;font-size:13px;color:#18181b;border-top:1px solid #e5e7eb;font-family:monospace;">${esc(payload.serialNumber) || "—"}</td>
            </tr>
            <tr>
              <td class="lbl" style="padding:10px 14px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;white-space:nowrap;">Submitted</td>
              <td class="val" style="padding:10px 14px;font-size:13px;color:#18181b;border-top:1px solid #e5e7eb;">${esc(submittedDate)}</td>
            </tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="border-radius:5px;background:#0891b2;">
                <a href="${esc(receiptUrl)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;letter-spacing:0.03em;">View your receipt &rarr;</a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#6b7280;">
            Questions? Reply to this email or contact us at
            <a href="mailto:${contactEmail}" style="color:#0891b2;text-decoration:none;">${contactEmail}</a>.
          </p>
          <p style="margin:20px 0 0 0;font-size:14px;line-height:1.6;">
            Best regards,<br>
            Patrik Warranty Team
          </p>
        </td></tr>
        <tr><td class="foot" style="padding:14px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
          Automated confirmation &mdash; keep your claim number <strong>#${esc(shortId)}</strong> for reference.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Dear ${fullName || "Customer"},`,
    "",
    "We have received your warranty submission. Our team will review it and get back to you as soon as possible.",
    "",
    `Claim number: #${shortId}`,
    `Product:      ${payload.productName || "—"}`,
    `Serial:       ${payload.serialNumber || "—"}`,
    `Submitted:    ${submittedDate}`,
    "",
    `View your receipt: ${receiptUrl}`,
    "",
    `Questions? Reply to this email or write to ${contactEmail}.`,
    "",
    "Best regards,",
    "Patrik Warranty Team",
  ].join("\n");

  return { subject, html, text };
}
