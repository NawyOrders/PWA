import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AddButton,
  BackButton,
  BackLink,
  Breadcrumbs,
  Button,
  Chip,
  CustomerAvatar,
  DisplayPageHeader,
  EmptyState,
  FavoriteButton,
  HotBadge,
  MobilePageHeader,
  Price,
  QtyStepper,
  buttonStyles,
  chipStyles,
} from "@/components/ui";
import { renderApp } from "@/test/render";

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: router.back,
    push: router.push,
    replace: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string | { pathname?: string }; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

/** jsdom always reports a single entry; override it to model an in-app history. */
function setHistoryLength(value: number) {
  Object.defineProperty(window.history, "length", { configurable: true, value });
}

afterEach(() => {
  Reflect.deleteProperty(window.history, "length");
  router.back.mockReset();
  router.push.mockReset();
});

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

  it("scales the amount with the size recipe", () => {
    renderApp(
      <>
        <Price value={90} size="sm" />
        <Price value={90} size="lg" />
        <Price value={90} />
      </>,
    );

    const amounts = screen.getAllByText("90");
    expect(amounts[0]).toHaveClass("text-base");
    expect(amounts[1]).toHaveClass("text-2xl");
    expect(amounts[2]).toHaveClass("text-xl");
  });

  it("keeps the compact recipe readable, struck price included", () => {
    renderApp(<Price value={120} oldValue={150} compact />);

    const old = screen.getByLabelText("السعر قبل الخصم 150");
    expect(old).toHaveClass("text-[10px]");
    expect(old.querySelector("span")).toHaveClass("text-[9px]");
  });
});

describe("Breadcrumbs", () => {
  it("links the reachable steps and marks the current one", () => {
    renderApp(
      <Breadcrumbs
        items={[
          { label: "الرئيسية", href: "/" },
          { label: "الأقسام" },
          { label: "برجر", href: "/categories" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "الرئيسية" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "الأقسام" })).not.toBeInTheDocument();
    expect(screen.getByText("الأقسام")).not.toHaveClass("text-brand");
    // The last step stays plain text even when it carries a route.
    expect(screen.queryByRole("link", { name: "برجر" })).not.toBeInTheDocument();
    expect(screen.getByText("برجر")).toHaveClass("text-brand");
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

describe("BackButton", () => {
  it("falls back to the parent route when the tab has no previous screen", async () => {
    const user = userEvent.setup();
    renderApp(<BackButton href="/orders" />);

    const back = screen.getByRole("button", { name: "رجوع" });
    expect(back).toHaveAttribute("type", "button");

    await user.click(back);

    expect(router.push).toHaveBeenCalledWith("/orders");
    expect(router.back).not.toHaveBeenCalled();
  });

  it("uses real history when the customer navigated within the app", async () => {
    setHistoryLength(2);
    const user = userEvent.setup();
    renderApp(<BackButton href="/orders" />);

    await user.click(screen.getByRole("button", { name: "رجوع" }));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("is reachable by its accessible name inside the mobile header", () => {
    renderApp(<MobilePageHeader title="السلة" backHref="/cart" />);

    expect(screen.getByRole("heading", { name: "السلة" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "رجوع" })).toBeInTheDocument();
  });
});

describe("BackLink", () => {
  it("renders a deterministic, labelled link for screens that must not bounce", () => {
    renderApp(<BackLink href="/" />);

    const link = screen.getByRole("link", { name: "رجوع" });
    expect(link).toHaveAttribute("href", "/");
  });
});

describe("DisplayPageHeader", () => {
  it("falls back to the overlay back button and offers the subtitle", () => {
    renderApp(<DisplayPageHeader title="ناوي أوردرز" subtitle="جوعك بيوصل بسرعة" backHref="/cart" />);

    expect(screen.getByRole("heading", { name: "ناوي أوردرز" })).toBeInTheDocument();
    expect(screen.getByText("جوعك بيوصل بسرعة")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "رجوع" })).toBeInTheDocument();
  });

  it("replaces the back control when the screen supplies its own action", () => {
    renderApp(
      <DisplayPageHeader title="الطلبات" action={<Button>مسح</Button>} />,
    );

    expect(screen.getByRole("button", { name: "مسح" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "رجوع" })).not.toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("points at the categories fallback when the caller gives no call to action", () => {
    renderApp(<EmptyState title="السلة فاضية" description="اختار أطباقك الأول." />);

    expect(screen.getByRole("heading", { name: "السلة فاضية" })).toBeInTheDocument();
    expect(screen.getByText("اختار أطباقك الأول.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "تصفح الأقسام" })).toHaveAttribute("href", "/categories");
  });

  it("uses the supplied label and route", () => {
    renderApp(
      <EmptyState title="مفيش نتائج" description="جرّب كلمة تانية." ctaLabel="ارجع للرئيسية" ctaHref="/" />,
    );

    expect(screen.getByRole("link", { name: "ارجع للرئيسية" })).toHaveAttribute("href", "/");
  });
});

describe("CustomerAvatar", () => {
  it("shows the picture the customer added", () => {
    renderApp(<CustomerAvatar name="أحمد" src="data:image/jpeg;base64,AAAA" className="size-[112px] rounded-full" />);

    expect(screen.getByRole("img", { name: "أحمد" })).toHaveAttribute("src", "data:image/jpeg;base64,AAAA");
  });

  it("shows a neutral disc instead of a stock face while the account has no picture", () => {
    renderApp(
      <CustomerAvatar name="أحمد" src="" className="size-[112px] rounded-full">
        <button type="button" aria-label="أضف صورة شخصية">
          camera
        </button>
      </CustomerAvatar>,
    );

    expect(screen.getByRole("img", { name: "أحمد" })).toBeInTheDocument();
    // The control a customer uses to add their own picture shares the disc's box.
    expect(screen.getByRole("img").parentElement).toContainElement(
      screen.getByRole("button", { name: "أضف صورة شخصية" }),
    );
  });
});
