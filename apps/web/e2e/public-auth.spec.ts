import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: "jzoom_locale",
      value: "ar",
      domain: "localhost",
      path: "/",
    },
  ]);
});

test("renders an RTL Arabic login experience with client-side validation", async ({ page }) => {
  await page.goto("/login");

  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "مرحبًا بعودتك." })).toBeVisible();
  await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
  await expect(page.getByLabel("كلمة المرور")).toBeVisible();

  await page.getByLabel("البريد الإلكتروني").fill("invalid");
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page.locator(".form-error")).toHaveText(
    "أدخل بريداً إلكترونياً صحيحاً وكلمة المرور.",
  );
});

test("keeps the public shell inside the mobile viewport", async ({ page }) => {
  await page.goto("/login");
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await expect(page.locator(".auth-card")).toBeInViewport();
});
