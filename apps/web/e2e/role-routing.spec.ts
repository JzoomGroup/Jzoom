import { expect, test } from "@playwright/test";

const password = process.env.E2E_PASSWORD;
const accounts = [
  { role: "Admin", email: process.env.E2E_ADMIN_EMAIL, path: /\/admin(?:\/|$)/ },
  { role: "Client", email: process.env.E2E_CLIENT_EMAIL, path: /\/client(?:\/|$)/ },
  { role: "Specialist", email: process.env.E2E_SPECIALIST_EMAIL, path: /\/specialist(?:\/|$)/ },
  {
    role: "Project Specialist",
    email: process.env.E2E_PROJECT_SPECIALIST_EMAIL,
    path: /\/projects(?:\/|$)/,
  },
  { role: "Supervisor", email: process.env.E2E_SUPERVISOR_EMAIL, path: /\/supervisor(?:\/|$)/ },
  {
    role: "Account Manager",
    email: process.env.E2E_ACCOUNT_MANAGER_EMAIL,
    path: /\/account-manager(?:\/|$)/,
  },
  { role: "Management", email: process.env.E2E_MANAGEMENT_EMAIL, path: /\/management(?:\/|$)/ },
] as const;

for (const account of accounts) {
  test(`${account.role} reaches the correct protected workspace`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Role routing runs once on desktop.");
    test.skip(!account.email || !password, `Missing E2E credentials for ${account.role}.`);

    await page.goto("/login");
    await page.getByLabel("البريد الإلكتروني").fill(account.email!);
    await page.getByLabel("كلمة المرور").fill(password!);
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();

    await page.waitForURL(account.path, { timeout: 20_000 });
    await expect(page.locator("main")).toBeVisible();
    await expect(page).not.toHaveURL(/\/403(?:\/|$)/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
}

test("keeps an authenticated session across refresh, direct URLs, tabs, and browser history", async ({
  context,
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Session persistence runs once on desktop.");
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  test.skip(!adminEmail || !password, "Missing E2E credentials for Admin.");

  await page.goto("/login?returnTo=%2Fadmin%2Fusers");
  await page.getByLabel("البريد الإلكتروني").fill(adminEmail!);
  await page.getByLabel("كلمة المرور").fill(password!);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForURL(/\/admin\/users(?:\?|$)/, { timeout: 20_000 });

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "مستخدمو البوابة" })).toBeVisible();

  const secondTab = await context.newPage();
  await secondTab.goto("/admin/permissions");
  await expect(
    secondTab.getByRole("heading", { level: 1, name: "مركز إدارة الصلاحيات" }),
  ).toBeVisible();
  await secondTab.close();

  await page.goto("/admin/permissions");
  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/users(?:\?|$)/);
  await page.goForward();
  await expect(page).toHaveURL(/\/admin\/permissions(?:\?|$)/);

  await context.clearCookies();
  await page.reload();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
});
