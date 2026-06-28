import { postLoginRoute, protectedRouteRedirect } from "./route-access";

const user = {
  id: "user-1",
  email: "person@example.com",
  displayName: "Person",
  preferredLocale: "en",
  userType: "INTERNAL" as const,
  permissions: [],
};

describe("frontend authorization routing", () => {
  it("redirects anonymous users to login", () => {
    expect(protectedRouteRedirect(null)).toBe("/login");
  });

  it("allows every authenticated user to open profile", () => {
    expect(protectedRouteRedirect({ ...user, roles: ["ROLE-CLIENT"] })).toBeNull();
  });

  it("redirects non-Admins away from settings", () => {
    expect(protectedRouteRedirect({ ...user, roles: ["ROLE-AM"] }, true)).toBe("/403");
    expect(protectedRouteRedirect({ ...user, roles: ["ROLE-ADMIN"] }, true)).toBeNull();
  });

  it("uses a role-aware destination after login", () => {
    expect(postLoginRoute(["ROLE-ADMIN"])).toBe("/admin");
    expect(postLoginRoute(["ROLE-CLIENT"])).toBe("/client");
    expect(postLoginRoute(["ROLE-MGMT"])).toBe("/management");
    expect(postLoginRoute(["ROLE-AM"])).toBe("/account-manager");
    expect(postLoginRoute(["ROLE-SUPERVISOR"])).toBe("/supervisor");
    expect(postLoginRoute(["ROLE-SPECIALIST"])).toBe("/specialist");
    expect(postLoginRoute(["ROLE-UNKNOWN"])).toBe("/profile");
  });
});
