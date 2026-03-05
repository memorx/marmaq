import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserAvatar } from "@/components/ui/UserAvatar";

describe("UserAvatar", () => {
  it("renderiza <img> cuando hay avatarUrl", () => {
    render(
      <UserAvatar
        user={{ name: "Juan Pérez", avatarUrl: "https://example.com/avatar.jpg" }}
      />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(img).toHaveAttribute("alt", "Juan Pérez");
  });

  it("renderiza iniciales cuando no hay avatarUrl", () => {
    render(<UserAvatar user={{ name: "María López" }} />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("ML")).toBeInTheDocument();
  });

  it("muestra iniciales como fallback cuando imagen falla (onError)", () => {
    render(
      <UserAvatar
        user={{ name: "Carlos García", avatarUrl: "https://bad-url.com/nope.jpg" }}
      />
    );

    // Initially shows image
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();

    // Trigger error
    fireEvent.error(img);

    // Now should show initials fallback
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("CG")).toBeInTheDocument();
  });
});
