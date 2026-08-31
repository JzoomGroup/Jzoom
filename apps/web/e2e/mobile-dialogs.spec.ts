import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const projectSpecialistEmail = process.env.E2E_PROJECT_SPECIALIST_EMAIL;

async function signIn(page: Page, email: string, destination: RegExp) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password!);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForURL(destination, { timeout: 20_000 });
}

async function expectDialogInsideViewport(page: Page) {
  const layout = await page.getByRole("dialog").evaluate((dialog) => {
    const rect = dialog.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      left: rect.left,
      right: rect.right,
      viewportWidth: document.documentElement.clientWidth,
      width: rect.width,
    };
  });

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.width).toBeGreaterThan(layout.viewportWidth * 0.88);
}

test("keeps the user management dialog usable on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile dialog coverage runs on mobile.");
  test.skip(!adminEmail || !password, "Missing UAT Admin credentials.");

  await signIn(page, adminEmail!, /\/admin(?:\/|$)/);
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "إدارة المستخدم" }).first().click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "الدور والوصول" })).toBeVisible();
  await expect(page.getByRole("button", { name: "أمان الحساب" })).toBeVisible();
  await expectDialogInsideViewport(page);
});

test("localizes the project output file picker inside the mobile dialog", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile dialog coverage runs on mobile.");
  test.skip(!projectSpecialistEmail || !password, "Missing UAT Project Specialist credentials.");

  await signIn(page, projectSpecialistEmail!, /\/projects(?:\/|$)/);
  await page.getByRole("link", { name: "فتح المشروع" }).first().click();
  await page.waitForURL(/\/projects\/[a-z0-9-]+$/i, { timeout: 20_000 });
  await page.getByRole("button", { name: "إضافة مخرج" }).click();

  const dialog = page.getByRole("dialog", { name: "إضافة مخرج" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("اختيار ملف")).toBeVisible();
  await expect(dialog.locator('input[type="file"]')).toHaveCSS("opacity", "0");
  await expectDialogInsideViewport(page);
});
