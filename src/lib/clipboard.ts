/**
 * Clipboard write with a fallback.
 *
 * `navigator.clipboard` needs a secure context and a user gesture, and it is
 * simply missing in some in-app web views, so the classic hidden-textarea
 * `execCommand` path stays as the escape hatch. Returns whether the copy
 * actually happened — callers must not claim success otherwise.
 */
export async function copyText(value: string): Promise<boolean> {
  if (!value) return false;

  const clipboard = navigator.clipboard;
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(value);
      return true;
    } catch {
      // Permission denied or the write failed: fall through to the manual path.
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
