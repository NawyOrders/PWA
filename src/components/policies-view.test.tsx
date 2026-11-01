import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PoliciesView } from "@/components/policies-view";
import { renderApp } from "@/test/render";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string | { pathname?: string }; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

function tab(name: string | RegExp) {
  return screen.getByRole("tab", { name });
}

describe("PoliciesView", () => {
  it("opens on the privacy policy by default", async () => {
    renderApp(<PoliciesView />);

    expect(tab(/سياسة الخصوصية/)).toHaveAttribute("aria-selected", "true");
    expect(tab(/الشروط والاحكام/)).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("heading", { name: "مقدمة" })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "policy-tab-privacy");
  });

  it("honours a ?tab= deep link after mount", async () => {
    window.history.replaceState({}, "", "/help/policies?tab=terms");
    renderApp(<PoliciesView />);

    await waitFor(() => expect(tab(/الشروط والاحكام/)).toHaveAttribute("aria-selected", "true"));
    expect(screen.getByRole("heading", { name: "قبول الشروط" })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "policy-tab-terms");
  });

  it("ignores an unknown tab query and keeps the default", async () => {
    window.history.replaceState({}, "", "/help/policies?tab=hacked");
    renderApp(<PoliciesView />);

    expect(tab(/سياسة الخصوصية/)).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "مقدمة" })).toBeInTheDocument();
  });

  it("switches policies on click and moves the roving tab index", async () => {
    const user = userEvent.setup();
    renderApp(<PoliciesView />);

    await user.click(tab(/اتفاقية معالجة البيانات/));

    expect(tab(/اتفاقية معالجة البيانات/)).toHaveAttribute("aria-selected", "true");
    expect(tab(/اتفاقية معالجة البيانات/)).toHaveAttribute("tabindex", "0");
    expect(tab(/سياسة الخصوصية/)).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("heading", { name: "أطراف الاتفاقية" })).toBeInTheDocument();
  });

  it("supports arrow key navigation, wrapping at both ends", async () => {
    renderApp(<PoliciesView />);
    const privacy = tab(/سياسة الخصوصية/);
    privacy.focus();

    fireEvent.keyDown(privacy, { key: "ArrowRight" });
    expect(tab(/الشروط والاحكام/)).toHaveAttribute("aria-selected", "true");
    expect(tab(/الشروط والاحكام/)).toHaveFocus();

    fireEvent.keyDown(tab(/الشروط والاحكام/), { key: "ArrowRight" });
    expect(tab(/اتفاقية معالجة البيانات/)).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(tab(/اتفاقية معالجة البيانات/), { key: "ArrowRight" });
    expect(tab(/سياسة الخصوصية/)).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(tab(/سياسة الخصوصية/), { key: "ArrowLeft" });
    expect(tab(/اتفاقية معالجة البيانات/)).toHaveAttribute("aria-selected", "true");
  });

  it("supports Home and End jumps", async () => {
    renderApp(<PoliciesView />);
    const terms = tab(/الشروط والاحكام/);
    terms.focus();

    fireEvent.keyDown(terms, { key: "End" });
    expect(tab(/اتفاقية معالجة البيانات/)).toHaveAttribute("aria-selected", "true");
    expect(tab(/اتفاقية معالجة البيانات/)).toHaveFocus();

    fireEvent.keyDown(tab(/اتفاقية معالجة البيانات/), { key: "Home" });
    expect(tab(/سياسة الخصوصية/)).toHaveAttribute("aria-selected", "true");
    expect(tab(/سياسة الخصوصية/)).toHaveFocus();
  });

  it("renders the platform credit and app version", async () => {
    renderApp(<PoliciesView />);

    expect(screen.getAllByText("Nawy Orders").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Space Tech").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/الاصدار رقم 1.0/).length).toBeGreaterThan(0);
    expect(screen.getByText(/آخر تحديث: 13 أكتوبر 2026/)).toBeInTheDocument();
  });
});
