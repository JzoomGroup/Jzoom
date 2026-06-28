import { render, screen } from "@testing-library/react";
import LoginPage from "./page";
import { getRequestLocale } from "../../lib/i18n-server";

jest.mock("../../lib/i18n-server", () => ({
  getRequestLocale: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const getRequestLocaleMock = getRequestLocale as jest.MockedFunction<typeof getRequestLocale>;

describe("LoginPage", () => {
  beforeEach(() => {
    getRequestLocaleMock.mockResolvedValue("en");
  });

  it("renders a localized password form without demo credentials", async () => {
    render(await LoginPage());

    expect(screen.getByRole("heading", { name: "Welcome back." })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("button", { name: "تغيير اللغة إلى العربية" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.queryByText(/demo password/i)).not.toBeInTheDocument();
  });
});
