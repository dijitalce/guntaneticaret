import { test, expect } from "@playwright/test";

test("admin login and dashboard", async ({ page }) => {
  await page.goto("http://localhost:3001/login");
  await page.locator('input[name="password"]').fill("Admin123!");
  await page.getByRole("button", { name: "Giriş" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
