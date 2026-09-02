import { test, expect } from "@playwright/test";

test("senaryo A: guntan marka model kategori", async ({ page }) => {
  await page.goto("http://guntan.localhost:3000/");
  await expect(page.getByRole("heading", { name: /Aracına uygun/i })).toBeVisible();
  await page.getByRole("link", { name: "Alfa Romeo" }).first().click();
  await expect(page.getByRole("heading", { name: /Alfa Romeo Yedek Parça/ })).toBeVisible();
  await page.getByRole("link", { name: "147" }).first().click();
  await expect(page.getByRole("heading", { name: /147/ })).toBeVisible();
});

test("senaryo B: japon sitesinde BMW yok", async ({ page }) => {
  await page.goto("http://japon.localhost:3000/");
  await expect(page.getByRole("link", { name: "Honda" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BMW" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Alfa Romeo" })).toHaveCount(0);
});

test("senaryo F: placeholder görsel", async ({ page }) => {
  await page.goto("http://guntan.localhost:3000/alfa-romeo/147");
  const img = page.locator(".product-card img").first();
  await expect(img).toHaveAttribute("src", /placeholder-product\.jpg|http/);
});
