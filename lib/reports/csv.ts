/**
 * Minimal CSV serializer (RFC 4180-ish) — no dependency pulled in for this
 * since the only cases here are flat rows of strings/numbers/dates. Quotes
 * any field containing a comma, quote, or newline; doubles embedded quotes.
 */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function toCsv(columns: string[], rows: unknown[][]): string {
  const lines = [columns.map(csvField).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvField).join(","));
  }
  // CRLF per RFC 4180; also makes Excel happier on Windows (the deploy target).
  return lines.join("\r\n") + "\r\n";
}
