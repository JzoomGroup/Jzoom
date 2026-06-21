import { render, screen } from "@testing-library/react";
import FoundationPage from "./page";

describe("FoundationPage", () => {
  it("renders the PR 1 foundation boundary", () => {
    render(<FoundationPage />);

    expect(
      screen.getByRole("heading", { name: "Production foundation is ready." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Foundation only.")).toBeInTheDocument();
    expect(screen.getByText(/No mock catalog/)).toBeInTheDocument();
  });
});
