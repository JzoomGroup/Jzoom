import { render, screen } from "@testing-library/react";
import PermissionDeniedPage from "./page";

describe("PermissionDeniedPage", () => {
  it("explains the forbidden state and provides a safe destination", () => {
    render(<PermissionDeniedPage />);

    expect(screen.getByRole("heading", { name: "You cannot open this page." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to profile" })).toHaveAttribute(
      "href",
      "/profile",
    );
  });
});
