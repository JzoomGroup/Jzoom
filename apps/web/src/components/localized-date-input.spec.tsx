import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocalizedDateInput, LocalizedDateTimeInput } from "./localized-date-input";

describe("localized date inputs", () => {
  it("renders a Gregorian Arabic date while preserving the native value", () => {
    render(
      <label>
        الموعد
        <LocalizedDateInput locale="ar" value="2026-08-31" onChange={() => undefined} />
      </label>,
    );

    expect(screen.getByText("31‏/08‏/2026")).toBeInTheDocument();
    expect(screen.getByLabelText(/^الموعد/)).toHaveValue("2026-08-31");
  });

  it("updates the localized date-time preview for uncontrolled form fields", () => {
    render(
      <label>
        وقت الدفع
        <LocalizedDateTimeInput defaultValue="2026-08-31T23:23" locale="ar" name="paidAt" />
      </label>,
    );

    const input = screen.getByLabelText(/^وقت الدفع/);
    fireEvent.change(input, { target: { value: "2026-09-01T10:30" } });

    expect(input).toHaveValue("2026-09-01T10:30");
    expect(screen.getByText(/سبتمبر/)).toBeInTheDocument();
  });
});
