const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function esc(value: string | undefined | null): string {
  if (value == null) return "";
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/**
 * Render free-form text (blank-line-separated paragraphs) as a series of
 * <p style="..."> blocks. Single newlines become <br>. All content escaped.
 * Empty input returns "".
 */
export function paragraphs(text: string | undefined | null, style: string): string {
  if (!text) return "";
  const trimmed = String(text).trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para.split(/\n/).map((l) => esc(l)).join("<br>");
      return `<p style="${style}">${lines}</p>`;
    })
    .join("");
}

/**
 * Render template tokens like {{productName}} against a values map.
 * Unknown tokens are replaced with "". Used for subject lines.
 */
export function renderTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const v = values[key];
    return typeof v === "string" ? v : "";
  });
}
