import { test, expect } from "@playwright/test";
import { E2E_ADMIN } from "./seed";

test("login -> dashboard -> logout golden path", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();

  // Protected-route redirect: an authenticated user hitting /login again is
  // bounced straight back to the dashboard (features/auth/actions.ts's
  // redirectIfAuthenticated), not shown the form a second time.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "E2E SYSTEM_ADMIN" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login$/);

  // The session is actually gone server-side, not just the client
  // redirected — going straight back to a protected route bounces to login.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("wrong password shows a generic error, not an account-enumeration hint", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill("DefinitelyWrongPassword1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Scoped past Next's own route-announcer div, which also has role="alert".
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
