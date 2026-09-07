import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import { useAuthStore } from "@/lib/auth";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/login",
}));

describe("Sentinel NER — Stage 2 Authentication UI", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it("renders the accessible login form with email, password, and security notice", () => {
    render(<LoginPage />);

    expect(screen.getByText("OPERATIONAL AUTHENTICATION")).toBeDefined();
    expect(screen.getByText(/Authoritative Role-Based Access Control/i)).toBeDefined();

    const emailInput = screen.getByLabelText(/official agency email/i);
    expect(emailInput).toBeDefined();

    const passwordInput = screen.getByLabelText(/credential password/i);
    expect(passwordInput).toBeDefined();

    const submitButton = screen.getByRole("button", { name: /authenticate operational session/i });
    expect(submitButton).toBeDefined();
  });

  it("populates form fields when clicking quick-select demo role credentials", () => {
    render(<LoginPage />);

    const ddmaButton = screen.getByRole("button", { name: /DDMA Incident Commander/i });
    expect(ddmaButton).toBeDefined();

    fireEvent.click(ddmaButton);

    const emailInput = screen.getByLabelText(/official agency email/i) as HTMLInputElement;
    expect(emailInput.value).toBe("ddma.aizawl@sentinel.ner.internal");

    const adminButton = screen.getByRole("button", { name: /Platform Admin/i });
    fireEvent.click(adminButton);
    expect(emailInput.value).toBe("admin@sentinel.ner.internal");
  });

  it("displays server-side error message if authentication fails", async () => {
    // Mock fetch failure
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { message: "Invalid credentials. Authentication denied." },
      }),
    });

    render(<LoginPage />);

    // Provide credentials so required check passes
    const emailInput = screen.getByLabelText(/official agency email/i);
    const passwordInput = screen.getByLabelText(/credential password/i);
    fireEvent.change(emailInput, { target: { value: "officer@sentinel.ner.internal" } });
    fireEvent.change(passwordInput, { target: { value: "WrongPassword" } });

    const submitButton = screen.getByRole("button", { name: /authenticate operational session/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials\. Authentication denied\./i)).toBeDefined();
    });
  });
});

