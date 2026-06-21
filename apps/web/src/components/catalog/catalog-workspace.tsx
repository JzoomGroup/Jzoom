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
  section,
}: {
  initialSnapshot: CatalogSnapshot;
  section: CatalogSection;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  if (section === "categories") {
    return <CategoryManager snapshot={snapshot} setSnapshot={setSnapshot} />;
  }
  if (section === "services") {
    return <ServiceManager snapshot={snapshot} setSnapshot={setSnapshot} />;
  }
  if (section === "items") {
    return <ItemManager snapshot={snapshot} setSnapshot={setSnapshot} />;
  }
  if (section === "levels") {
    return <LevelManager snapshot={snapshot} setSnapshot={setSnapshot} />;
  }
  return <CatalogOverview snapshot={snapshot} />;
}
