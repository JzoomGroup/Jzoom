import { render, screen } from "@testing-library/react";
import { BentoGrid, MetricCard } from "./premium-os";

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
