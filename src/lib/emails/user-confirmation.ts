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

  const subject = `Your Patrik warranty claim — #${shortId}`;

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:32px 32px 16px 32px;">
          <h1 style="margin:0 0 16px 0;font-size:20px;line-height:1.3;color:#18181b;">Thank you for your warranty claim</h1>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
            Dear ${esc(fullName) || "Customer"},
          </p>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
            We have received your warranty submission. Our team will review it and get back to you as soon as possible.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin:16px 0;">
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Claim number</td>
              <td style="padding:12px 16px;font-size:13px;color:#18181b;font-family:monospace;">#${esc(shortId)}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Product</td>
              <td style="padding:12px 16px;font-size:13px;color:#18181b;border-top:1px solid #e5e7eb;">${esc(payload.productName) || "—"}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Serial number</td>
              <td style="padding:12px 16px;font-size:13px;color:#18181b;border-top:1px solid #e5e7eb;font-family:monospace;">${esc(payload.serialNumber) || "—"}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Submitted</td>
              <td style="padding:12px 16px;font-size:13px;color:#18181b;border-top:1px solid #e5e7eb;">${esc(submittedDate)}</td>
            </tr>
          </table>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
            You can view your submission at any time here:<br>
            <a href="${esc(receiptUrl)}" style="color:#2563eb;word-break:break-all;">${esc(receiptUrl)}</a>
          </p>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
            If you have any questions, reply to this email or write to
            <a href="mailto:${contactEmail}" style="color:#2563eb;">${contactEmail}</a>.
          </p>
          <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;">
            Best regards,<br>
            Patrik Warranty Team
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
          This is an automated confirmation. Please keep the claim number for your records.
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
    `Product: ${payload.productName || "—"}`,
    `Serial number: ${payload.serialNumber || "—"}`,
    `Submitted: ${submittedDate}`,
    "",
    `View your submission: ${receiptUrl}`,
    "",
    `If you have any questions, reply to this email or write to ${contactEmail}.`,
    "",
    "Best regards,",
    "Patrik Warranty Team",
  ].join("\n");

  return { subject, html, text };
}
