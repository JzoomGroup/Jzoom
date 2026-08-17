import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_PASSWORD;
const targetEmail = process.env.E2E_MUTATION_TARGET_EMAIL;
const allowMutations = process.env.E2E_ALLOW_MUTATIONS === "true";

const existingManagementPermissions = [
  "PERM-MANAGE-CLIENTS",
  "PERM-USE-PRICING-STUDIO",
  "PERM-MANAGE-QUOTES",
  "PERM-MANAGE-INVOICES",
] as const;

test("persists and restores user profile and permission exceptions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Access mutations run once on desktop.");
  test.skip(!allowMutations, "Explicit UAT mutation opt-in is required.");
  test.skip(!adminEmail || !password || !targetEmail, "Missing UAT access mutation credentials.");

  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(adminEmail!);
  await page.getByLabel("كلمة المرور").fill(password!);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 20_000 });
  await page.goto("/admin/users");

  const userCard = page.locator(".access-user-card").filter({ hasText: targetEmail! });
  await expect(userCard).toHaveCount(1);
  await userCard.getByRole("button", { name: "إدارة المستخدم" }).click();

  const userCenter = page.getByRole("region", { name: "ملف المستخدم" });
  const nameInput = userCenter.getByLabel("الاسم");
  const originalName = await nameInput.inputValue();
  const temporaryName = `${originalName} - تحقق UAT`;

  try {
    await nameInput.fill(temporaryName);
    await userCenter.getByRole("button", { name: "حفظ البيانات" }).click();
    await expect(userCenter.getByRole("status")).toContainText("تم تحديث بيانات المستخدم بنجاح");
    await expect(nameInput).toHaveValue(temporaryName);
  } finally {
    await nameInput.fill(originalName);
    await userCenter.getByRole("button", { name: "حفظ البيانات" }).click();
    await expect(userCenter.getByRole("status")).toContainText("تم تحديث بيانات المستخدم بنجاح");
    await expect(nameInput).toHaveValue(originalName);
  }

  await userCenter.getByRole("button", { name: "الدور والوصول" }).click();
  const permissionSelect = userCenter.getByLabel("الصلاحية");
  const optionValues = await permissionSelect
    .locator("option")
    .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  const permissionCode = existingManagementPermissions.find((code) => optionValues.includes(code));
  expect(permissionCode).toBeTruthy();

  let exceptionAdded = false;
  try {
    await permissionSelect.selectOption(permissionCode!);
    await userCenter.getByRole("button", { name: "إضافة استثناء" }).click();
    const exception = userCenter.locator(".permission-exception-list article").filter({
      hasText: permissionCode!,
    });
    await exception.getByLabel("سبب الاستثناء").fill("اختبار ربط مركز الوصول على UAT");
    await userCenter.getByRole("button", { name: "حفظ الاستثناءات" }).click();
    await expect(userCenter.getByRole("status")).toContainText(
      "تم تحديث استثناءات صلاحيات المستخدم",
    );
    exceptionAdded = true;
  } finally {
    const exception = userCenter.locator(".permission-exception-list article").filter({
      hasText: permissionCode!,
    });
    if (exceptionAdded || (await exception.count()) > 0) {
      await exception.getByRole("button", { name: "إزالة" }).click();
      await userCenter.getByRole("button", { name: "حفظ الاستثناءات" }).click();
      await expect(userCenter.getByRole("status")).toContainText(
        "تم تحديث استثناءات صلاحيات المستخدم",
      );
      await expect(exception).toHaveCount(0);
    }
  }
});
