import bcrypt from "bcryptjs";

// Cost factor 12 is a reasonable balance for a Node process on shared
// hosting (no GPU/queue to offload hashing to) — high enough to resist
// offline cracking, low enough not to make every login noticeably slow.
const BCRYPT_COST_FACTOR = 12;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, BCRYPT_COST_FACTOR);
}

export async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

export const PASSWORD_MIN_LENGTH = 10;
