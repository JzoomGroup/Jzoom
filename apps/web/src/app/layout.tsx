import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { directionForLocale, htmlLangForLocale } from "../lib/i18n";
import { getRequestLocale } from "../lib/i18n-server";
import { resolvePortalMetadataBase } from "../lib/site-metadata";
import "./styles/globals-foundation.css";
import "./styles/design-foundation.css";
import "./styles/application-shell.css";
import "./styles/request-intake.css";
import "./styles/access-management.css";
import "./styles/catalog-management.css";
import "./styles/request-template-studio.css";
import "./styles/commercial-pricing.css";
import "./styles/operations.css";
import "./styles/responsive.css";
import "./styles/compatibility.css";
import "./styles/premium-refinement.css";
import "./styles/system-shell.css";
import "./styles/system-components.css";
import "./styles/dialogs.css";
import "./styles/system-forms.css";
import "./styles/system-workflows.css";
import "./styles/system-responsive.css";

const siteTitle = "Jzoom | منصة التشغيل";
const siteDescription = "منصة جزوم لإدارة الخدمات والطلبات والمشاريع والمخرجات.";
const socialPreviewPath = "/branding/jzoom-social-preview.png";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  return {
    metadataBase: resolvePortalMetadataBase(forwardedHost),
    title: siteTitle,
    description: siteDescription,
    applicationName: "Jzoom",
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: "/",
      siteName: "Jzoom",
      locale: "ar_SA",
      type: "website",
      images: [
        {
          url: socialPreviewPath,
          width: 1200,
          height: 630,
          alt: "منصة جزوم للتشغيل",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: [socialPreviewPath],
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();

  return (
    <html lang={htmlLangForLocale(locale)} dir={directionForLocale(locale)}>
      <body>{children}</body>
    </html>
  );
}
