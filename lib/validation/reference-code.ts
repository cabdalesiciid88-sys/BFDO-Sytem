import "server-only";
import { randomBytes } from "crypto";

// Avoids visually ambiguous characters (0/O, 1/I, etc.) since these codes
// are meant to be read and typed by humans (e.g. referencing a project in
// an email or a printed report).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSuffix(length = 5): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** e.g. generateReferenceCode("PRJ") -> "PRJ-2026-A3F9K" */
export function generateReferenceCode(prefix: string): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${randomSuffix()}`;
}
