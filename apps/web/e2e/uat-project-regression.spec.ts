import { expect, test, type Browser, type Page } from "@playwright/test";

const allowMutations = process.env.E2E_ALLOW_MUTATIONS === "true";
const password = process.env.E2E_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const clientEmail = process.env.E2E_CLIENT_EMAIL;
const projectSpecialistEmail = process.env.E2E_PROJECT_SPECIALIST_EMAIL;
const supervisorEmail = process.env.E2E_PROJECT_SUPERVISOR_EMAIL;

async function authenticatedPage(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password!);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
  await page.waitForLoadState("networkidle");
  return { context, page };
}

async function gotoInteractive(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

async function reloadInteractive(page: Page) {
  await page.reload();
  await page.waitForLoadState("networkidle");
}

async function chooseProjectRevisionFile(
  outputCard: ReturnType<Page["locator"]>,
  outputTitle: string,
  name: string,
  contents: string,
) {
  const revisionInput = outputCard.getByLabel(new RegExp(`ملف المخرج - ${outputTitle}`));
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await revisionInput.setInputFiles([]);
    await revisionInput.setInputFiles({
      name,
      mimeType: "text/plain",
      buffer: Buffer.from(contents),
    });
    if ((await outputCard.innerText()).includes(name)) return;
    await outputCard.page().waitForTimeout(400);
  }
  await expect(outputCard).toContainText(name);
}

function acceptNextDialog(page: Page) {
  page.once("dialog", (dialog) => dialog.accept());
}

async function expectDownloadAvailable(page: Page, link: ReturnType<Page["locator"]>) {
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  const response = await page.request.get(new URL(href!, page.url()).toString());
  expect(response.status()).toBe(200);
  expect((await response.body()).byteLength).toBeGreaterThan(0);
  return href!;
}

test("completes one-time quote onboarding and project output approval", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  test.skip(testInfo.project.name !== "desktop", "Operational mutation coverage runs once.");
  test.skip(!allowMutations, "Explicit UAT mutation opt-in is required.");
  test.skip(
    !password ||
      !adminEmail ||
      !clientEmail ||
      !projectSpecialistEmail ||
      !supervisorEmail,
    "Missing UAT role credentials.",
  );

  const runId = Date.now().toString(36).toUpperCase();
  const draftTitle = `تحقق مشروع مرة واحدة ${runId}`;
  const outputTitle = `مخرج مشروع تحقق ${runId}`;
  const serviceName = "أتمتة سير عمل داخلي";

  const admin = await authenticatedPage(browser, adminEmail!);
  await gotoInteractive(admin.page, "/pricing");
  await admin.page
    .getByLabel("العميل")
    .selectOption({ label: "عميل UAT التجريبي (UAT-CLIENT-001)" });
  await admin.page.getByLabel("عنوان المسودة").fill(draftTitle);
  await admin.page.getByRole("tab", { name: /خدمات المرة الواحدة/ }).click();
  await admin.page.getByLabel(`اختيار ${serviceName}`).check();
  await admin.page.getByRole("button", { name: "إعادة حساب المعاينة" }).click();
  await expect(admin.page.getByText("تم تحديث معاينة التسعير من محرك النظام.")).toBeVisible();
  await admin.page.getByRole("button", { name: "حفظ مسودة التسعير" }).click();
  await admin.page.waitForURL(/\/pricing\/[a-z0-9-]+$/i, { timeout: 20_000 });

  await admin.page.getByRole("button", { name: "إنشاء عرض سعر" }).click();
  const quoteForm = admin.page.locator("form.quote-create-form");
  await expect(quoteForm).toBeVisible();
  await quoteForm.getByLabel("شروط الدفع").fill("دفعة تحقق UAT");
  await quoteForm.getByRole("button", { name: "إنشاء لقطة عرض السعر" }).click();
  await admin.page.waitForURL(/\/pricing\/quotes\/[a-z0-9-]+$/i, { timeout: 20_000 });

  acceptNextDialog(admin.page);
  await admin.page.getByRole("button", { name: "إصدار العرض" }).click();
  await expect(admin.page.getByRole("button", { name: "تسجيل موافقة العميل" })).toBeVisible();
  acceptNextDialog(admin.page);
  await admin.page.getByRole("button", { name: "تسجيل موافقة العميل" }).click();
  await expect(admin.page.getByRole("button", { name: "تأكيد الدفع" })).toBeVisible();
  await admin.page.getByRole("button", { name: "تأكيد الدفع" }).click();
  const paymentDialog = admin.page.getByRole("dialog", { name: "تأكيد استلام الدفع" });
  await paymentDialog.getByLabel("مرجع الدفعة").fill(`UAT-${runId}`);
  await paymentDialog.getByRole("button", { name: "تأكيد استلام الدفع" }).click();

  const onboardingDialog = admin.page.getByRole("dialog", { name: "تفعيل خدمات العميل" });
  await expect(onboardingDialog).toBeVisible();
  const projectSpecialist = onboardingDialog
    .locator(".quote-onboarding-specialists label")
    .filter({ hasText: /Project Specialist|مختص مشاريع/i })
    .first();
  await expect(projectSpecialist).toBeVisible();
  await projectSpecialist.locator('input[type="checkbox"]').check();
  await onboardingDialog.getByRole("button", { name: "تفعيل وحفظ الإسناد" }).click();
  await expect(onboardingDialog).toBeHidden({ timeout: 20_000 });

  const specialist = await authenticatedPage(browser, projectSpecialistEmail!);
  await gotoInteractive(specialist.page, "/projects");
  const projectLink = specialist.page.getByRole("link", { name: new RegExp(serviceName) }).first();
  await expect(projectLink).toBeVisible();
  await projectLink.click();
  await specialist.page.waitForURL(/\/projects\/[a-z0-9-]+$/i, { timeout: 20_000 });
  const projectPath = new URL(specialist.page.url()).pathname;

  await specialist.page.getByRole("button", { name: "إضافة مخرج" }).click();
  const outputDialog = specialist.page.getByRole("dialog", { name: "إضافة مخرج" });
  await outputDialog.getByLabel("الاسم").fill(outputTitle);
  await outputDialog.getByLabel("رمز المخرج").fill(`PRJ-${runId}`);
  await outputDialog.getByLabel("الوصف").fill("نسخة أولى لاختبار المراجعة والتخزين.");
  await outputDialog.locator('input[type="file"]').setInputFiles({
    name: `project-${runId}-v1.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from(`Jzoom project ${runId} revision 1`),
  });
  await outputDialog.getByRole("button", { name: "حفظ المخرج" }).click();

  let outputCard = specialist.page.locator("article.entity-card").filter({ hasText: outputTitle });
  await expect(outputCard).toContainText(`project-${runId}-v1.txt`);
  await expectDownloadAvailable(
    specialist.page,
    outputCard.getByRole("link", { name: "تحميل الملف" }).last(),
  );
  await outputCard.getByRole("button", { name: "إرسال للمراجعة" }).click();

  const supervisor = await authenticatedPage(browser, supervisorEmail!);
  await gotoInteractive(supervisor.page, projectPath);
  let supervisorOutput = supervisor.page.locator("article.entity-card").filter({ hasText: outputTitle });
  await expect(supervisorOutput).toBeVisible();
  await supervisorOutput.getByLabel("ملاحظة المراجعة").fill("أعد النسخة الأولى للمشروع.");
  await supervisorOutput.getByRole("button", { name: "إعادة للمختص" }).click();

  await reloadInteractive(specialist.page);
  outputCard = specialist.page.locator("article.entity-card").filter({ hasText: outputTitle });
  await chooseProjectRevisionFile(
    outputCard,
    outputTitle,
    `project-${runId}-v2.txt`,
    `Jzoom project ${runId} revision 2`,
  );
  await outputCard.getByRole("button", { name: "رفع ملف" }).click();
  await outputCard.getByRole("button", { name: "إرسال للمراجعة" }).click();

  await reloadInteractive(supervisor.page);
  supervisorOutput = supervisor.page.locator("article.entity-card").filter({ hasText: outputTitle });
  await supervisorOutput.getByRole("button", { name: "اعتماد داخلي" }).click();
  await supervisorOutput.getByRole("button", { name: "مشاركة المخرج" }).click();

  const client = await authenticatedPage(browser, clientEmail!);
  await gotoInteractive(client.page, projectPath.replace("/projects/", "/client/projects/"));
  let clientOutput = client.page.locator("article.entity-card").filter({ hasText: outputTitle });
  await expect(clientOutput).toBeVisible();
  await expectDownloadAvailable(
    client.page,
    clientOutput.getByRole("link", { name: "تحميل الملف" }).last(),
  );
  await clientOutput.getByLabel("سبب طلب التعديل").fill("أضف خاتمة تنفيذية واضحة.");
  await clientOutput.getByRole("button", { name: "طلب تعديل" }).click();

  await reloadInteractive(specialist.page);
  outputCard = specialist.page.locator("article.entity-card").filter({ hasText: outputTitle });
  await chooseProjectRevisionFile(
    outputCard,
    outputTitle,
    `project-${runId}-v3.txt`,
    `Jzoom project ${runId} revision 3`,
  );
  await outputCard.getByRole("button", { name: "رفع ملف" }).click();
  await outputCard.getByRole("button", { name: "إرسال للمراجعة" }).click();

  await reloadInteractive(supervisor.page);
  supervisorOutput = supervisor.page.locator("article.entity-card").filter({ hasText: outputTitle });
  await supervisorOutput.getByRole("button", { name: "اعتماد داخلي" }).click();
  await supervisorOutput.getByRole("button", { name: "مشاركة المخرج" }).click();

  await reloadInteractive(client.page);
  clientOutput = client.page.locator("article.entity-card").filter({ hasText: outputTitle });
  await expect(clientOutput).toContainText(`project-${runId}-v3.txt`);
  await clientOutput.getByRole("button", { name: "اعتماد المخرج" }).click();
  await expect(clientOutput).toContainText("معتمد من العميل");

  await Promise.all([
    admin.context.close(),
    specialist.context.close(),
    supervisor.context.close(),
    client.context.close(),
  ]);
});
