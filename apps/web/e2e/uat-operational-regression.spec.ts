import { expect, test, type Browser, type Page } from "@playwright/test";

const allowMutations = process.env.E2E_ALLOW_MUTATIONS === "true";
const password = process.env.E2E_PASSWORD;
const clientEmail = process.env.E2E_CLIENT_EMAIL;
const specialistEmail = process.env.E2E_SPECIALIST_EMAIL;
const supervisorEmail = process.env.E2E_SUPERVISOR_EMAIL;

async function authenticatedPage(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password!);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
  return { context, page };
}

async function acceptNextDialog(page: Page) {
  page.once("dialog", (dialog) => dialog.accept());
}

async function expectDownloadAvailable(page: Page, link: ReturnType<Page["locator"]>) {
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  const response = await page.request.get(new URL(href!, page.url()).toString());
  expect(response.status()).toBe(200);
  expect((await response.body()).byteLength).toBeGreaterThan(0);
}

test("completes the monthly request, document, hours, output, and client decision cycle", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  test.skip(testInfo.project.name !== "desktop", "Operational mutation coverage runs once.");
  test.skip(!allowMutations, "Explicit UAT mutation opt-in is required.");
  test.skip(
    !password || !clientEmail || !specialistEmail || !supervisorEmail,
    "Missing UAT role credentials.",
  );

  const runId = Date.now().toString(36).toUpperCase();
  const requestTitle = `تحقق تشغيلي شهري ${runId}`;
  const documentTitle = `مستند تحقق ${runId}`;
  const outputTitle = `مخرج تحقق ${runId}`;
  const visibleComment = `تعليق عميل ظاهر ${runId}`;

  const client = await authenticatedPage(browser, clientEmail!);
  await client.page.goto("/client/requests");
  const intake = client.page.locator("form.client-request-form");
  await expect(intake).toBeVisible();
  await expect(intake.locator("select").first()).not.toHaveValue("");
  await intake.getByLabel("العنوان").fill(requestTitle);
  await intake.getByLabel("الوصف").fill("طلب تحقق حي يغطي الربط بين العميل وفريق التشغيل.");
  await intake.getByRole("button", { name: "إرسال الطلب إلى جزوم" }).click();
  await client.page.waitForURL(/\/client\/requests\/[a-z0-9-]+$/i, { timeout: 20_000 });
  const requestId = client.page.url().split("/").pop()!;
  await expect(client.page.getByRole("heading", { level: 1 })).toContainText(requestTitle);

  const specialist = await authenticatedPage(browser, specialistEmail!);
  await specialist.page.goto(`/requests/${requestId}`);
  await expect(specialist.page.getByRole("heading", { level: 1 })).toContainText(requestTitle);
  const startWork = specialist.page.getByRole("button", { name: "بدء العمل" });
  if (await startWork.isVisible()) await startWork.click();

  const documents = specialist.page.locator("#request-documents");
  await documents.getByLabel("عنوان المستند").fill(documentTitle);
  await documents.getByLabel("التعليمات").fill("ارفع ملف التحقق بصيغة نصية.");
  await documents.getByRole("button", { name: "طلب مستند" }).click();
  await expect(documents.locator("article").filter({ hasText: documentTitle })).toBeVisible();

  const comments = specialist.page.locator("#request-comments");
  await comments.getByLabel("تعليق").fill("طلب المستند جاهز للعميل.");
  await comments.getByLabel("ظاهر للعميل").check();
  await comments.getByRole("button", { name: "إضافة تعليق" }).click();
  await expect(comments).toContainText("طلب المستند جاهز للعميل.");

  const hours = specialist.page.locator("#request-hours");
  await hours.locator('input[type="date"]').fill(new Date().toISOString().slice(0, 10));
  await hours.getByLabel("الساعات").fill("1.25");
  await hours.getByLabel("ملاحظة").fill(`ساعات تحقق ${runId}`);
  await hours.getByRole("button", { name: "إضافة وقت" }).click();
  const timeEntry = hours.locator("article").filter({ hasText: `ساعات تحقق ${runId}` });
  await expect(timeEntry).toBeVisible();
  await timeEntry.getByRole("button", { name: "إرسال" }).click();

  const outputs = specialist.page.locator("#request-outputs");
  await outputs.getByLabel("رمز المخرج").fill(`QA-${runId}`);
  await outputs.getByLabel("العنوان").fill(outputTitle);
  await outputs.getByLabel("الوصف").fill("نسخة أولى لاختبار دورة المراجعة والملفات.");
  await outputs.locator('form input[type="file"]').setInputFiles({
    name: `output-${runId}-v1.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from(`Jzoom output ${runId} revision 1`),
  });
  await outputs.getByRole("button", { name: "إنشاء مخرج داخلي" }).click();
  let outputCard = outputs.locator("article").filter({ hasText: outputTitle }).first();
  await expect(outputCard).toBeVisible();
  await acceptNextDialog(specialist.page);
  await outputCard.getByRole("button", { name: "إرسال" }).click();

  await client.page.reload();
  await expect(client.page.locator("#client-documents")).toContainText(documentTitle);
  const clientDocuments = client.page.locator("#client-documents");
  await clientDocuments.getByLabel("الطلب").selectOption({ index: 1 });
  await clientDocuments.locator('form input[type="file"]').setInputFiles({
    name: `client-${runId}-v1.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from(`Jzoom client document ${runId} revision 1`),
  });
  await clientDocuments.getByRole("button", { name: "رفع الملف" }).click();
  let clientDocumentCard = clientDocuments.locator("article").filter({ hasText: documentTitle });
  await expect(clientDocumentCard).toContainText(`client-${runId}-v1.txt`);
  await expectDownloadAvailable(
    client.page,
    clientDocumentCard.getByRole("link", { name: "تحميل الملف" }),
  );
  await acceptNextDialog(client.page);
  await clientDocumentCard.getByRole("button", { name: "إزالة الملف" }).click();
  await expect(clientDocuments.getByRole("button", { name: "رفع الملف" })).toBeVisible();
  await clientDocuments.getByLabel("الطلب").selectOption({ index: 1 });
  await clientDocuments.locator('form input[type="file"]').setInputFiles({
    name: `client-${runId}-v2.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from(`Jzoom client document ${runId} revision 2`),
  });
  await clientDocuments.getByRole("button", { name: "رفع الملف" }).click();
  clientDocumentCard = clientDocuments.locator("article").filter({ hasText: documentTitle });
  await expect(clientDocumentCard).toContainText(`client-${runId}-v2.txt`);

  const clientComments = client.page.locator("#client-comments");
  await clientComments.getByLabel("إضافة تعليق").fill(visibleComment);
  await clientComments.getByRole("button", { name: "إضافة تعليق" }).click();
  await expect(clientComments).toContainText(visibleComment);

  const supervisor = await authenticatedPage(browser, supervisorEmail!);
  await supervisor.page.goto(`/requests/${requestId}`);
  await expect(supervisor.page.getByRole("heading", { level: 1 })).toContainText(requestTitle);
  let supervisorOutput = supervisor.page
    .locator("#request-outputs article")
    .filter({ hasText: outputTitle })
    .first();
  await supervisorOutput.getByLabel(`سبب مراجعة المشرف - ${outputTitle}`).fill("أعد النسخة الأولى.");
  await acceptNextDialog(supervisor.page);
  await supervisorOutput.getByRole("button", { name: "إرجاع للتعديل" }).click();
  const supervisorTime = supervisor.page
    .locator("#request-hours article")
    .filter({ hasText: `ساعات تحقق ${runId}` });
  await supervisorTime.getByRole("button", { name: "اعتماد" }).click();

  await specialist.page.reload();
  outputCard = specialist.page
    .locator("#request-outputs article")
    .filter({ hasText: outputTitle })
    .first();
  await outputCard.locator('input[type="file"]').setInputFiles({
    name: `output-${runId}-v2.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from(`Jzoom output ${runId} revision 2`),
  });
  await outputCard.getByRole("button", { name: "رفع نسخة جديدة" }).click();
  await acceptNextDialog(specialist.page);
  await outputCard.getByRole("button", { name: "إرسال" }).click();

  await supervisor.page.reload();
  supervisorOutput = supervisor.page
    .locator("#request-outputs article")
    .filter({ hasText: outputTitle })
    .first();
  await acceptNextDialog(supervisor.page);
  await supervisorOutput.getByRole("button", { name: "اعتماد" }).click();
  await acceptNextDialog(supervisor.page);
  await supervisorOutput.getByRole("button", { name: "مشاركة مع العميل" }).click();

  await client.page.reload();
  let clientOutput = client.page
    .locator("#client-deliverables article")
    .filter({ hasText: outputTitle })
    .first();
  await expectDownloadAvailable(
    client.page,
    clientOutput.getByRole("link", { name: "تحميل الملف" }),
  );
  await clientOutput.getByLabel("ملاحظة الإرجاع").fill("يرجى تحديث النسخة النهائية.");
  await acceptNextDialog(client.page);
  await clientOutput.getByRole("button", { name: "إرجاع المخرج" }).click();

  await specialist.page.reload();
  outputCard = specialist.page
    .locator("#request-outputs article")
    .filter({ hasText: outputTitle })
    .first();
  await outputCard.locator('input[type="file"]').setInputFiles({
    name: `output-${runId}-v3.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from(`Jzoom output ${runId} revision 3`),
  });
  await outputCard.getByRole("button", { name: "رفع نسخة جديدة" }).click();
  await acceptNextDialog(specialist.page);
  await outputCard.getByRole("button", { name: "إرسال" }).click();

  await supervisor.page.reload();
  supervisorOutput = supervisor.page
    .locator("#request-outputs article")
    .filter({ hasText: outputTitle })
    .first();
  await acceptNextDialog(supervisor.page);
  await supervisorOutput.getByRole("button", { name: "اعتماد" }).click();
  await acceptNextDialog(supervisor.page);
  await supervisorOutput.getByRole("button", { name: "مشاركة مع العميل" }).click();

  await client.page.reload();
  clientOutput = client.page
    .locator("#client-deliverables article")
    .filter({ hasText: outputTitle })
    .first();
  await acceptNextDialog(client.page);
  await clientOutput.getByRole("button", { name: "اعتماد المخرج" }).click();
  await expect(clientOutput).toContainText("تم اعتماد هذا المخرج");
  await expect(client.page.locator("#client-timeline")).toContainText("اعتمد العميل المخرج");

  await specialist.page.reload();
  const specialistDocument = specialist.page
    .locator("#request-documents article")
    .filter({ hasText: documentTitle });
  await expect(specialistDocument).toContainText(`client-${runId}-v2.txt`);
  await specialistDocument.getByRole("button", { name: "إغلاق" }).click();
  await expect(specialist.page.locator("#request-comments")).toContainText(visibleComment);

  await Promise.all([
    client.context.close(),
    specialist.context.close(),
    supervisor.context.close(),
  ]);
});
