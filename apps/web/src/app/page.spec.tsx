import HomePage from "./page";
import { getCurrentUser } from "../lib/auth";
import { redirect } from "next/navigation";

jest.mock("../lib/auth", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

const getCurrentUserMock = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const redirectMock = redirect as unknown as jest.MockedFunction<(path: string) => never>;

describe("HomePage", () => {
  it("redirects anonymous visitors to login", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await HomePage();

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects authenticated admins to their default route", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      displayName: "Admin",
      preferredLocale: "ar",
      userType: "INTERNAL",
      roles: ["ROLE-ADMIN"],
      permissions: [],
    });

    await HomePage();

    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });
});
