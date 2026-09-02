const productionPortalUrl = "https://portal.jzoom.sa";

const deployedPortalHosts = new Set([
  "portal.jzoom.sa",
  "uat-portal.jzoom.sa",
  "staging2-portal.jzoom.sa",
]);

function firstForwardedHost(value: string | null): string {
  return value?.split(",", 1)[0]?.trim().toLowerCase() ?? "";
}

export function resolvePortalMetadataBase(hostHeader: string | null): URL {
  const host = firstForwardedHost(hostHeader);
  const hostname = host.replace(/:443$/, "");

  if (deployedPortalHosts.has(hostname)) {
    return new URL(`https://${hostname}`);
  }

  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
    return new URL(`http://${host}`);
  }

  return new URL(productionPortalUrl);
}
