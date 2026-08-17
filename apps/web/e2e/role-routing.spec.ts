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
