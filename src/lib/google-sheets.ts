import { google } from "googleapis";
import type { WarrantyPayload } from "@/types/warranty";

function getSheetsClient() {
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL;
  if (!privateKey || !clientEmail) {
    throw new Error("Google service account env vars not set");
  }
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// Prevent formula injection — Sheets treats any cell starting with = + - @
// as a formula when valueInputOption is USER_ENTERED. Prefix a single quote.
function escapeCell(value: string): string {
  if (value.length === 0) return "";
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function appendWarrantyRow(
  p: WarrantyPayload,
  submittedAt: string,
): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID not set");
  const tab = process.env.GOOGLE_SHEET_TAB ?? "Submissions";

  const row = [
    p.submissionId,
    submittedAt,
    p.name,
    p.surname,
    p.company,
    p.email,
    p.phone,
    p.typeOfPartner,
    p.address,
    p.invoiceNumber,
    p.invoiceIssuedBy,
    p.dateOfPurchase,
    p.countryOfPurchase,
    p.productName,
    p.productCategory,
    p.serialNumber,
    p.dateOfFailure,
    p.problemDescription,
    p.fileUrls.invoice,
    p.fileUrls.serial,
    p.fileUrls.full,
    p.fileUrls.closeup,
    p.dataPolicyAccepted ? "TRUE" : "FALSE",
  ].map(escapeCell);

  await getSheetsClient().spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A:W`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}
