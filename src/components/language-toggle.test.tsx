import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LanguageToggle } from "@/components/language-toggle";
import { renderApp } from "@/test/render";

describe("LanguageToggle", () => {
  it("offers the language the app is not currently using", () => {
    renderApp(<LanguageToggle />);

    const button = screen.getByRole("button", { name: "تغيير اللغة إلى الإنجليزية" });
    expect(button).toHaveTextContent("EN");
    expect(document.documentElement.lang).toBe("ar");
  });

  it("flips the whole app to English and back", async () => {
    const user = userEvent.setup();
    renderApp(<LanguageToggle />);

    await user.click(screen.getByRole("button", { name: "تغيير اللغة إلى الإنجليزية" }));

    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(document.documentElement.dir).toBe("ltr");
    expect(window.localStorage.getItem("nawy-lang-v1")).toBe('"en"');

    // The control now advertises the way back, in the new language.
    const back = screen.getByRole("button", { name: "Switch to Arabic" });
    expect(back).toHaveTextContent("ع");

    await user.click(back);
    await waitFor(() => expect(document.documentElement.dir).toBe("rtl"));
    expect(window.localStorage.getItem("nawy-lang-v1")).toBe('"ar"');
  });

  it("keeps the compact chip variant icon-only for the mobile header", async () => {
    const user = userEvent.setup();
    renderApp(<LanguageToggle variant="chip" />);

    const button = screen.getByRole("button", { name: "تغيير اللغة إلى الإنجليزية" });
    expect(button.textContent).toBe("");
    expect(button.querySelector("svg")).not.toBeNull();

    await user.click(button);
    await waitFor(() => expect(window.localStorage.getItem("nawy-lang-v1")).toBe('"en"'));
  });
});
