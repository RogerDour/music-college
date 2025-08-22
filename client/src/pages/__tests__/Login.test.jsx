/* eslint-env jest */
/* global describe, test, beforeEach, expect */
// client/src/pages/__tests__/Login.test.jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import Login from "../Login";

// --- router mock (only what Login uses) ---
vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

// --- i18n mock so useTranslation works ---
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

// --- mock *your* API helper that Login actually calls ---
const fake = { token: "fake-jwt", role: "teacher" };
const loginMock = vi.fn().mockResolvedValue({
  ...fake, // supports code that reads res.token
  data: { ...fake }, // supports code that reads res.data.token
});
vi.mock("../../api/auth", () => ({
  login: (...args) => loginMock(...args),
}));

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // jsdom doesn't implement alert; stub it so tests don't crash if called
    globalThis.alert = vi.fn();
  });

  test("renders email & password and login button", () => {
    render(<Login />);

    // MUI TextField => query by label
    const email = screen.getByLabelText(/email/i);
    const pass = screen.getByLabelText(/password/i);
    const btn = screen.getByRole("button", { name: /login/i });

    expect(email).toBeInTheDocument();
    expect(pass).toBeInTheDocument();
    expect(btn).toBeInTheDocument();
  });

  test("submits with filled fields and stores token", async () => {
    render(<Login />);

    await userEvent.type(screen.getByLabelText(/email/i), "u@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(loginMock).toHaveBeenCalledWith("u@test.com", "secret123");

    // wait for component to write to localStorage
    await waitFor(() => expect(localStorage.getItem("token")).toBe("fake-jwt"));
  });
});
