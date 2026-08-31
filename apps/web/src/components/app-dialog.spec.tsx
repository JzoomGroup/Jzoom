import { fireEvent, render, screen } from "@testing-library/react";
import { AppDialog } from "./app-dialog";

describe("AppDialog", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("renders through a modal portal and closes with Escape", () => {
    const onClose = jest.fn();
    render(
      <AppDialog closeLabel="Close" onClose={onClose} title="Edit user">
        <label>
          Name
          <input />
        </label>
      </AppDialog>,
    );

    expect(screen.getByRole("dialog", { name: "Edit user" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("dialog", { name: "Edit user" }).parentElement).not.toHaveAttribute(
      "aria-hidden",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not discard a form when its backdrop is clicked by default", () => {
    const onClose = jest.fn();
    render(
      <AppDialog onClose={onClose} title="Edit service">
        <p>Form</p>
      </AppDialog>,
    );

    fireEvent.mouseDown(screen.getByRole("dialog", { name: "Edit service" }).parentElement!);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "إغلاق" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("isolates the background and restores it after closing", () => {
    const { container, unmount } = render(
      <AppDialog onClose={jest.fn()} title="Edit client">
        <p>Form</p>
      </AppDialog>,
    );

    expect(container).toHaveAttribute("aria-hidden", "true");
    expect(container).toHaveProperty("inert", true);
    unmount();
    expect(container).not.toHaveAttribute("aria-hidden");
    expect(container).not.toHaveProperty("inert", true);
  });

  it("cannot be dismissed while a save is in progress", () => {
    const onClose = jest.fn();
    render(
      <AppDialog busy closeLabel="Close" onClose={onClose} title="Saving user">
        <p>Saving</p>
      </AppDialog>,
    );

    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
