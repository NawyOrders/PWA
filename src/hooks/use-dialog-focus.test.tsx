import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDialogFocus } from "@/hooks/use-dialog-focus";

function Dialog({
  active,
  onClose,
  withControls = true,
}: {
  active: boolean;
  onClose?: () => void;
  withControls?: boolean;
}) {
  const ref = useDialogFocus<HTMLDivElement>(active, onClose);
  return (
    <div>
      <button type="button">خارج النافذة</button>
      <div ref={ref} tabIndex={-1} data-testid="panel">
        {withControls ? (
          <>
            <button type="button">الأول</button>
            <button type="button">الأخير</button>
          </>
        ) : null}
      </div>
    </div>
  );
}

describe("useDialogFocus", () => {
  it("focuses the first control, locks scroll and restores focus on close", async () => {
    const { getByRole, rerender } = render(<Dialog active={false} />);
    const opener = getByRole("button", { name: "خارج النافذة" });
    opener.focus();

    rerender(<Dialog active />);
    await waitFor(() => expect(screen.getByRole("button", { name: "الأول" })).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<Dialog active={false} />);
    expect(document.body.style.overflow).toBe("");
    expect(opener).toHaveFocus();
  });

  it("closes on Escape and traps Tab at both ends", async () => {
    const onClose = vi.fn();
    render(<Dialog active onClose={onClose} />);
    const first = screen.getByRole("button", { name: "الأول" });
    const last = screen.getByRole("button", { name: "الأخير" });
    await waitFor(() => expect(first).toHaveFocus());

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(first).toHaveFocus();

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    screen.getByTestId("panel").focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("tolerates a missing close handler and an unattached ref", async () => {
    const { unmount } = render(<Dialog active />);
    await waitFor(() => expect(screen.getByRole("button", { name: "الأول" })).toHaveFocus());
    expect(() => fireEvent.keyDown(document, { key: "Escape" })).not.toThrow();
    unmount();

    function Detached() {
      useDialogFocus<HTMLDivElement>(true, vi.fn());
      return <button type="button">منفصل</button>;
    }
    render(<Detached />);
    expect(screen.getByRole("button", { name: "منفصل" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps focus on the panel when it has no controls", async () => {
    render(<Dialog active withControls={false} />);
    const panel = screen.getByTestId("panel");
    await waitFor(() => expect(panel).toHaveFocus());

    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(panel).toHaveFocus();
  });

  it("does nothing while inactive", () => {
    const onClose = vi.fn();
    render(<Dialog active={false} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.keyDown(document, { key: "Tab" });
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("");
  });
});
