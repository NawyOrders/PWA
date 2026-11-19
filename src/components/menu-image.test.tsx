import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MenuImage } from "@/components/menu-image";

describe("MenuImage", () => {
  it("renders a lazy image with the localised name as alt", () => {
    render(<MenuImage src="/api/tenant-assets/pablo/images/antara.jpg" name="عنترة" className="size-12" />);

    const image = screen.getByRole("img", { name: "عنترة" });
    expect(image).toHaveAttribute("src", "/api/tenant-assets/pablo/images/antara.jpg");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
    expect(image).toHaveClass("object-cover");
  });

  it("shows the name plate when there is no image", () => {
    render(<MenuImage src={null} name="برجر لحم" className="size-12" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("برجر لحم")).toBeInTheDocument();
  });

  it("falls back to the name plate on error and recovers when src changes", () => {
    const { rerender } = render(<MenuImage src="https://cdn.example.com/broken.jpg" name="بيتزا" />);
    fireEvent.error(screen.getByRole("img", { name: "بيتزا" }));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("بيتزا")).toBeInTheDocument();

    rerender(<MenuImage src="https://cdn.example.com/fixed.jpg" name="بيتزا" />);

    expect(screen.getByRole("img", { name: "بيتزا" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/fixed.jpg",
    );
  });
});
