import type { Metadata } from "next";
import type { ReactNode } from "react";
import { directionForLocale, htmlLangForLocale } from "../lib/i18n";
import { getRequestLocale } from "../lib/i18n-server";
import "./globals.css";
import "./product-polish.css";

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
