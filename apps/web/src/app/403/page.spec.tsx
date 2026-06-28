import { render, screen } from "@testing-library/react";
import PermissionDeniedPage from "./page";
import { getRequestLocale } from "../../lib/i18n-server";

jest.mock("../../lib/i18n-server", () => ({
  getRequestLocale: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

const getRequestLocaleMock = getRequestLocale as jest.MockedFunction<typeof getRequestLocale>;

describe("PermissionDeniedPage", () => {
  beforeEach(() => {
    getRequestLocaleMock.mockResolvedValue("en");
  });

  it("explains the forbidden state and provides a safe destination", async () => {
    render(await PermissionDeniedPage());

    expect(screen.getByRole("heading", { name: "You cannot open this page." })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("link", { name: "Return to profile" })).toHaveAttribute(
      "href",
      "/profile",
    );
  });
});
