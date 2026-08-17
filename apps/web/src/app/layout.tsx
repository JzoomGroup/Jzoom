import type { Metadata } from "next";
import type { ReactNode } from "react";
import { directionForLocale, htmlLangForLocale } from "../lib/i18n";
import { getRequestLocale } from "../lib/i18n-server";
import "./styles/globals-foundation.css";
import "./styles/design-foundation.css";
import "./styles/application-shell.css";
import "./styles/request-intake.css";
import "./styles/access-management.css";
import "./styles/catalog-management.css";
import "./styles/operations.css";
import "./styles/responsive.css";
import "./styles/compatibility.css";
import "./styles/premium-refinement.css";
import "./styles/system-shell.css";
import "./styles/system-components.css";
import "./styles/system-forms.css";
import "./styles/system-workflows.css";
import "./styles/system-responsive.css";

export const metadata: Metadata = {
  title: "Jzoom | منصة التشغيل",
  description: "منصة جزوم لإدارة الخدمات والطلبات والمشاريع والمخرجات.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();

  return (
    <html lang={htmlLangForLocale(locale)} dir={directionForLocale(locale)}>
      <body>{children}</body>
    </html>
  );
}
