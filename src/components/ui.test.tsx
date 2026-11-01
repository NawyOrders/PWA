import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  AddButton,
  Button,
  Chip,
  FavoriteButton,
  HotBadge,
  Price,
  QtyStepper,
  buttonStyles,
  chipStyles,
} from "@/components/ui";
import { renderApp } from "@/test/render";

describe("buttonStyles", () => {
  it("builds the default brand button recipe", () => {
    const styles = buttonStyles();

    expect(styles).toContain("rounded-full");
    expect(styles).toContain("bg-brand");
    expect(styles).toContain("h-12");
    expect(styles).not.toContain("w-full");
  });

  it("merges variant, size, block and custom classes", () => {
    const styles = buttonStyles({ variant: "outline", size: "lg", block: true, className: "mt-5" });

    expect(styles).toContain("border-line");
    expect(styles).toContain("h-14");
    expect(styles).toContain("w-full");
    expect(styles.endsWith("mt-5")).toBe(true);
  });

  it("keeps disabled affordances in every variant", () => {
    for (const variant of ["brand", "soft", "outline", "ghost", "dark"] as const) {
      expect(buttonStyles({ variant })).toContain("disabled:pointer-events-none");
    }
  });
});

describe("chipStyles", () => {
  it("uses the filled brand style when selected", () => {
    const styles = chipStyles(true);

    expect(styles).toContain("bg-brand");
    expect(styles).toContain("text-white");
    expect(styles).not.toContain("border-line");
  });

  it("uses the bordered surface style when unselected", () => {
    const styles = chipStyles(false);

    expect(styles).toContain("border-line");
    expect(styles).toContain("bg-white");
    expect(styles).not.toContain("bg-brand ");
  });
});

describe("Button", () => {
  it("defaults to type=button and forwards native props", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderApp(<Button onClick={onClick}>حفظ</Button>);

    const button = screen.getByRole("button", { name: "حفظ" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("bg-brand");

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("honours submit type, disabled state and size", () => {
    renderApp(
      <Button type="submit" disabled size="sm">
        إرسال
      </Button>,
    );

    const button = screen.getByRole("button", { name: "إرسال" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("h-11");
  });
});

describe("Chip", () => {
  it("exposes selection through aria-pressed and stays type=button", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderApp(
      <Chip selected onClick={onClick}>
        الكل
      </Chip>,
    );

    const chip = screen.getByRole("button", { name: "الكل" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveAttribute("type", "button");

    await user.click(chip);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("marks unselected chips as not pressed", () => {
    renderApp(<Chip>برجر</Chip>);
    expect(screen.getByRole("button", { name: "برجر" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("Price", () => {
  it("formats the amount and currency", () => {
    renderApp(<Price value={1250} />);

    expect(screen.getByText("1,250")).toBeInTheDocument();
    expect(screen.getByText("جنيه")).toBeInTheDocument();
  });

  it("labels a struck-through old price for assistive tech", () => {
    renderApp(<Price value={1250} oldValue={1500} />);

    const old = screen.getByLabelText("السعر قبل الخصم 1,500");
    expect(old.tagName).toBe("DEL");
    expect(old).toHaveTextContent("1,500");
  });
});

describe("FavoriteButton", () => {
  it("reflects and toggles the persisted favorite state", async () => {
    const user = userEvent.setup();
    renderApp(<FavoriteButton productId="beef-burger" />);

    const button = screen.getByRole("button", { name: "إزالة من المفضلة" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await user.click(button);

    expect(screen.getByRole("button", { name: "إضافة إلى المفضلة" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("AddButton", () => {
  it("invokes the add handler once without bubbling navigation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderApp(<AddButton onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "أضف إلى السلة" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("QtyStepper", () => {
  it("increments and decrements within bounds", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderApp(<QtyStepper value={2} onChange={onChange} />);

    expect(screen.getByRole("group", { name: "الكمية" })).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: "زيادة الكمية" }));
    expect(onChange).toHaveBeenLastCalledWith(3);

    await user.click(screen.getByRole("button", { name: "إنقاص الكمية" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("disables the buttons at the configured limits", () => {
    renderApp(<QtyStepper value={5} min={5} max={5} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "زيادة الكمية" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "إنقاص الكمية" })).toBeDisabled();
  });
});

describe("HotBadge", () => {
  it("renders the translated default label", () => {
    renderApp(<HotBadge />);
    expect(screen.getByText("الأكثر طلباً")).toBeInTheDocument();
  });
});
