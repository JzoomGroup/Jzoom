import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../lib/auth";
import { requireRequestIntakeOptions, requireRequests } from "../../lib/request-server";
import { RequestsPage } from "./requests-page";

jest.mock("../../lib/auth", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("../../lib/request-server", () => ({
  requireRequest: jest.fn(),
  requireRequestAssignmentCandidates: jest.fn(),
  requireRequestIntakeOptions: jest.fn(),
  requireRequests: jest.fn(),
}));

jest.mock("../app-shell", () => ({
  AppShell: ({
    children,
    mode,
    activePath,
  }: {
    children: ReactNode;
    mode: string;
    activePath?: string;
  }) => (
    <>
      <nav
        aria-label={mode === "admin" ? "إدارة المنصة" : "تنقل منصة التشغيل"}
        data-active-path={activePath}
      />
      {children}
    </>
  ),
}));

jest.mock("./request-list", () => ({
  RequestList: () => <div>Request list</div>,
}));

jest.mock("./request-detail", () => ({
  RequestDetail: () => <div>Request detail</div>,
}));

const getCurrentUserMock = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const requireRequestsMock = requireRequests as jest.MockedFunction<typeof requireRequests>;
const requireRequestIntakeOptionsMock = requireRequestIntakeOptions as jest.MockedFunction<
  typeof requireRequestIntakeOptions
>;

const baseUser = {
  id: "user-1",
  email: "user@example.com",
  displayName: "Portal User",
  preferredLocale: "ar",
  userType: "INTERNAL" as const,
  mustChangePassword: false,
  permissions: [],
};

describe("RequestsPage shell context", () => {
  beforeEach(() => {
    requireRequestsMock.mockResolvedValue([]);
    requireRequestIntakeOptionsMock.mockResolvedValue(
      {} as Awaited<ReturnType<typeof requireRequestIntakeOptions>>,
    );
  });

  it("keeps admins inside the platform-administration navigation", async () => {
    getCurrentUserMock.mockResolvedValue({ ...baseUser, roles: ["ROLE-ADMIN"] });

    render(await RequestsPage({}));

    expect(screen.getByRole("navigation", { name: "إدارة المنصة" })).toHaveAttribute(
      "data-active-path",
      "/requests",
    );
    expect(screen.queryByRole("navigation", { name: "تنقل منصة التشغيل" })).not.toBeInTheDocument();
  });

  it("keeps specialists inside the operating navigation", async () => {
    getCurrentUserMock.mockResolvedValue({ ...baseUser, roles: ["ROLE-SPECIALIST"] });

    render(await RequestsPage({}));

    expect(screen.getByRole("navigation", { name: "تنقل منصة التشغيل" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "إدارة المنصة" })).not.toBeInTheDocument();
  });
});
