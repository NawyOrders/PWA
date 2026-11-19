import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "@/lib/clipboard";

/** jsdom ships no clipboard and no execCommand, so both are installed by hand. */
function mockClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(writeText) }, configurable: true });
}

function mockExecCommand(result: boolean) {
  const exec = vi.fn(() => result);
  Object.defineProperty(document, "execCommand", { value: exec, configurable: true, writable: true });
  return exec;
}

afterEach(() => {
  delete (navigator as { clipboard?: unknown }).clipboard;
  delete (document as { execCommand?: unknown }).execCommand;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("copyText", () => {
  it("uses the async clipboard when the browser offers it", async () => {
    const writeText = vi.fn(async () => undefined);
    mockClipboard(writeText);

    await expect(copyText("123456")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("123456");
  });

  it("never claims success for an empty value", async () => {
    const writeText = vi.fn(async () => undefined);
    mockClipboard(writeText);

    await expect(copyText("")).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to execCommand when the clipboard write is refused", async () => {
    mockClipboard(() => Promise.reject(new Error("NotAllowedError")));
    const exec = mockExecCommand(true);

    await expect(copyText("246810")).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("reports the fallback result when execCommand itself fails", async () => {
    mockClipboard(() => Promise.reject(new Error("NotAllowedError")));
    const exec = mockExecCommand(false);

    await expect(copyText("246810")).resolves.toBe(false);
    expect(exec).toHaveBeenCalledWith("copy");
  });

  it("uses execCommand in a web view that exposes no clipboard", async () => {
    const exec = mockExecCommand(true);

    await expect(copyText("135790")).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
  });

  it("returns false rather than throwing when there is no copy path at all", async () => {
    vi.spyOn(document, "createElement").mockImplementation(() => {
      throw new Error("no DOM");
    });

    await expect(copyText("135790")).resolves.toBe(false);
  });

  it("copies through a hidden readonly field and cleans it up", async () => {
    const captured: HTMLTextAreaElement[] = [];
    const exec = vi.fn(() => {
      const field = document.querySelector("textarea");
      if (field) captured.push(field);
      return true;
    });
    Object.defineProperty(document, "execCommand", { value: exec, configurable: true, writable: true });

    await expect(copyText("112233")).resolves.toBe(true);
    expect(captured).toHaveLength(1);
    expect(captured[0].value).toBe("112233");
    expect(captured[0].hasAttribute("readonly")).toBe(true);
    expect(captured[0].style.position).toBe("fixed");
    expect(captured[0].style.opacity).toBe("0");
    expect(document.querySelector("textarea")).toBeNull();
  });
});
