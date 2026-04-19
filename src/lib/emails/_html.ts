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
