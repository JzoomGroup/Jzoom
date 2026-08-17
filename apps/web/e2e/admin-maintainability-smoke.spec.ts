import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_PASSWORD;

async function signInAsAdmin(page: import("@playwright/test").Page) {
  test.skip(!adminEmail || !password, "Missing E2E credentials for Admin.");

  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(adminEmail!);
  await page.getByLabel("كلمة المرور").fill(password!);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 20_000 });
}

test("keeps the refactored Admin access and catalog screens intact", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Admin screen coverage runs once on desktop.");
  await signInAsAdmin(page);

  const screens = [
    { path: "/admin/users", heading: "مستخدمو البوابة" },
    { path: "/admin/roles", heading: "الأدوار" },
    { path: "/admin/permissions", heading: "مركز إدارة الصلاحيات" },
    { path: "/admin/audit-logs", heading: "سجل التدقيق" },
    { path: "/admin/catalog/categories", heading: "تصنيفات الخدمات" },
  ] as const;

  for (const screen of screens) {
    await page.goto(screen.path);
    await expect(page.getByRole("heading", { level: 1, name: screen.heading })).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page).not.toHaveURL(/\/403(?:\/|$)/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  }

  await page.goto("/admin/users");
  await page.getByRole("button", { name: "إدارة المستخدم" }).first().click();
  await expect(page.getByRole("region", { name: "ملف المستخدم" })).toBeVisible();
  await expect(page.getByRole("button", { name: "الدور والوصول" })).toBeVisible();
  await expect(page.getByRole("button", { name: "أمان الحساب" })).toBeVisible();

  await page.goto("/admin/permissions");
  await expect(page.getByLabel("اختر الدور")).toBeVisible();
  await expect(
    page.locator(".permission-matrix-list input[type='checkbox']").first(),
  ).toBeVisible();
});

test("opens and dismisses the Admin navigation on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation runs on the mobile project.");
  await signInAsAdmin(page);

  const menuButton = page.getByRole("button", { exact: true, name: "القائمة" });
  const sidebar = page.locator("#premium-shell-navigation");

  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar).not.toHaveClass(/\bis-open\b/);
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar).toHaveClass(/\bis-open\b/);
  await page.getByRole("button", { name: "إغلاق القائمة" }).click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar).not.toHaveClass(/\bis-open\b/);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});
