import Link from "next/link";
import { LocaleDocumentSync } from "../components/locale-document-sync";
import { systemStateCopy } from "../i18n/pages";
import { directionForLocale, htmlLangForLocale } from "../lib/i18n";
import { getRequestLocale } from "../lib/i18n-server";

export default async function NotFound() {
  const locale = await getRequestLocale();
  const copy = systemStateCopy[locale];

  return (
    <main
      className="system-state-shell"
      dir={directionForLocale(locale)}
      lang={htmlLangForLocale(locale)}
    >
      <LocaleDocumentSync locale={locale} />
      <section className="system-state-card" aria-labelledby="not-found-title">
        <p className="eyebrow">{copy.notFoundEyebrow}</p>
        <h1 id="not-found-title">{copy.notFoundTitle}</h1>
        <p>{copy.notFoundLead}</p>
        <Link className="os-button os-button-primary" href="/">
          {copy.home}
        </Link>
      </section>
    </main>
  );
}
