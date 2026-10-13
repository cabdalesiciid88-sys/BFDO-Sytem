import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, PASSWORD_MIN_LENGTH } from "@/lib/auth/password";

describe("lib/auth/password", () => {
  it("never stores the plaintext password in the hash", async () => {
    const plain = "CorrectHorseBatteryStaple1!";
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(hash).not.toContain(plain);
  });

  it("verifies the correct password", async () => {
    const plain = "CorrectHorseBatteryStaple1!";
    const hash = await hashPassword(plain);
    expect(await verifyPassword(plain, hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("CorrectHorseBatteryStaple1!");
    expect(await verifyPassword("WrongPassword1!", hash)).toBe(false);
  });

  it("produces a different hash each time (bcrypt salting)", async () => {
    const plain = "SamePasswordTwice1!";
    const [a, b] = await Promise.all([hashPassword(plain), hashPassword(plain)]);
    expect(a).not.toBe(b);
    expect(await verifyPassword(plain, a)).toBe(true);
    expect(await verifyPassword(plain, b)).toBe(true);
  });

  it("exposes a minimum length constant consistent with the login form's expectations", () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(8);
  });
});
