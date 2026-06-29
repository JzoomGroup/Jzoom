"use client";

import { useState } from "react";
import type { CatalogSection, CatalogSnapshot } from "../../lib/catalog-types";
import { CatalogOverview } from "./catalog-overview";
import { CategoryManager } from "./category-manager";
import { ItemManager } from "./item-manager";
import { LevelManager } from "./level-manager";
import { ServiceManager } from "./service-manager";

export function CatalogWorkspace({
  initialSnapshot,
  locale,
  section,
}: {
  initialSnapshot: CatalogSnapshot;
  locale?: string;
  section: CatalogSection;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const localeProps = locale ? { locale } : {};

  if (section === "categories") {
    return <CategoryManager {...localeProps} snapshot={snapshot} setSnapshot={setSnapshot} />;
  }
  if (section === "services") {
    return <ServiceManager {...localeProps} snapshot={snapshot} setSnapshot={setSnapshot} />;
  }
  if (section === "items") {
    return <ItemManager {...localeProps} snapshot={snapshot} setSnapshot={setSnapshot} />;
  }
  if (section === "levels") {
    return <LevelManager {...localeProps} snapshot={snapshot} setSnapshot={setSnapshot} />;
  }
  return <CatalogOverview {...localeProps} snapshot={snapshot} />;
}
