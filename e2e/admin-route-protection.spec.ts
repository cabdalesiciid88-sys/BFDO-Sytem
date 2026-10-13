import { test, expect } from "@playwright/test";
import { E2E_TEAM_MEMBER } from "./seed";

/**
 * docs/permissions.md hard rule 4's spirit applied to admin-only routes:
 * direct navigation must be blocked at the route itself, not just absent
 * from the nav. A Team Member (no admin capabilities at all) is the
 * strictest role to probe with.
 */
test.describe("admin-only routes reject a signed-in non-admin", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_TEAM_MEMBER.email);
    await page.getByLabel("Password").fill(E2E_TEAM_MEMBER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  for (const path of ["/team", "/audit", "/settings"]) {
    test(`${path} 404s for a Team Member via direct navigation`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
    });
  }

  test("none of the admin-only links are even rendered in the sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    for (const label of ["Team", "Audit Logs", "Settings"]) {
      await expect(page.getByRole("link", { name: label })).toHaveCount(0);
    }
  });
});
