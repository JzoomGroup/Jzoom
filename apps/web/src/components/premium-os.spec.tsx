import { render, screen } from "@testing-library/react";
import { BentoGrid, FilterBar, MetricCard, PageHeader, PageSkeleton } from "./premium-os";

describe("BentoGrid", () => {
  it("limits page-level metric strips to four cards", () => {
    const { container } = render(
      <BentoGrid compact>
        <MetricCard label="First" value="1" />
        <MetricCard label="Second" value="2" />
        <MetricCard label="Third" value="3" />
        <MetricCard label="Fourth" value="4" />
        <MetricCard label="Fifth" value="5" />
      </BentoGrid>,
    );

    expect(container.querySelectorAll(".os-metric-card")).toHaveLength(4);
    expect(screen.queryByText("Fifth")).not.toBeInTheDocument();
  });
});

describe("shared product surfaces", () => {
  it("keeps the page title and primary action in one stable header", () => {
    const { container } = render(
      <PageHeader
        title="Users"
        description="Manage portal access"
        actions={[{ label: "Add user", onClick: jest.fn(), variant: "primary" }]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add user" })).toBeInTheDocument();
    expect(container.querySelector(".os-page-header-tools")).toBeInTheDocument();
  });

  it("announces integrated filter results", () => {
    render(
      <FilterBar results="12 results">
        <label>
          Search
          <input />
        </label>
      </FilterBar>,
    );

    expect(screen.getByText("12 results")).toHaveAttribute("aria-live", "polite");
  });

  it("renders a layout-matched loading skeleton", () => {
    const { container } = render(<PageSkeleton variant="detail" />);
    expect(screen.getByLabelText("جاري تحميل المحتوى")).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll(".os-skeleton-row")).toHaveLength(4);
  });
});
