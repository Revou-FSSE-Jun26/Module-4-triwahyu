import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./RegisterForm";
import { ApiError } from "@/lib/errors";

const { register, push, handleError } = vi.hoisted(() => ({ register: vi.fn(), push: vi.fn(), handleError: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ api: { auth: { register } } }) }));
vi.mock("@/hooks/useErrorHandler", () => ({ useErrorHandler: () => handleError }));

beforeEach(() => {
  vi.clearAllMocks();
  register.mockResolvedValue({ user: {} });
});

async function fill(values: { name?: string; email?: string; password?: string; confirm?: string }) {
  const { name = "Ada", email = "ada@example.com", password = "Passw0rd1", confirm = password } = values;
  await userEvent.type(screen.getByLabelText("Name"), name);
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.type(screen.getByLabelText("Confirm password"), confirm);
}

// REQ-AUTH-5: controlled inputs, client-side validation, POST /api/auth/register.
describe("RegisterForm", () => {
  it("blocks submission and explains every invalid field without calling the API", async () => {
    render(<RegisterForm />);
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("validates a field when it loses focus", async () => {
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.tab();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("flags mismatched passwords", async () => {
    render(<RegisterForm />);
    await fill({ confirm: "Different1" });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("submits trimmed values (without the confirmation) and redirects to login", async () => {
    render(<RegisterForm />);
    await fill({ name: "  Ada  ", email: " ada@example.com " });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(register).toHaveBeenCalledWith({ name: "Ada", email: "ada@example.com", password: "Passw0rd1" });
    expect(push).toHaveBeenCalledWith("/login?registered=1");
  });

  it("shows a duplicate email from the server next to the email field", async () => {
    register.mockRejectedValue(new ApiError("Email is already registered", 409, "CONFLICT"));
    render(<RegisterForm />);
    await fill({});
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Email is already registered")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("reports unexpected failures through the shared error handler", async () => {
    register.mockRejectedValue(new ApiError("boom", 500));
    render(<RegisterForm />);
    await fill({});
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await vi.waitFor(() => expect(handleError).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled();
  });
});
