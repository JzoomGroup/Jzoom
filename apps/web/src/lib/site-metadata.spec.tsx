import { resolvePortalMetadataBase } from "./site-metadata";

describe("resolvePortalMetadataBase", () => {
  it("uses the UAT host for UAT social preview URLs", () => {
    expect(resolvePortalMetadataBase("uat-portal.jzoom.sa").href).toBe(
      "https://uat-portal.jzoom.sa/",
    );
  });

  it("uses the production host for production social preview URLs", () => {
    expect(resolvePortalMetadataBase("portal.jzoom.sa:443").href).toBe(
      "https://portal.jzoom.sa/",
    );
  });

  it("uses the first host supplied by a trusted proxy", () => {
    expect(resolvePortalMetadataBase("uat-portal.jzoom.sa, internal-proxy").href).toBe(
      "https://uat-portal.jzoom.sa/",
    );
  });

  it("falls back to production for an untrusted host", () => {
    expect(resolvePortalMetadataBase("attacker.example").href).toBe(
      "https://portal.jzoom.sa/",
    );
  });

  it("supports the local development server", () => {
    expect(resolvePortalMetadataBase("localhost:3000").href).toBe("http://localhost:3000/");
  });
});
