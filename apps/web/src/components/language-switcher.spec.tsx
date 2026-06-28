import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageSwitcher } from "./language-switcher";

const refreshMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.cookie = "jzoom_csrf=csrf-token; Path=/";
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(async () => ({ ok: true })),
    });
  });

  it("persists authenticated language changes and syncs document direction", async () => {
    render(<LanguageSwitcher locale="en" />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/auth/me/preferences",
      expect.objectContaining({
        body: JSON.stringify({ preferredLocale: "ar" }),
        credentials: "include",
        method: "PATCH",
      }),
    );
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("can switch public pages using only the locale cookie", async () => {
    render(<LanguageSwitcher locale="ar" persist="cookie" />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    expect(fetch).not.toHaveBeenCalled();
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
  });
});
