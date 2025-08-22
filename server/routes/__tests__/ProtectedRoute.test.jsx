import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
// ⬇️ Adjust this import to your actual file location if needed:
// e.g. "../ProtectedRoute" or "../../components/ProtectedRoute"
import ProtectedRoute from "../ProtectedRoute";

// i18n stub so components using useTranslation don't explode
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { changeLanguage: vi.fn() } }),
  Trans: ({ children }) => children,
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

function PrivatePage() {
  return <div>Private OK</div>;
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("redirects to /login when no token", () => {
    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute>
                <PrivatePage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/login page/i)).toBeInTheDocument();
  });

  test("renders child when token present and role allowed", () => {
    localStorage.setItem("token", "t");
    localStorage.setItem("role", "teacher");

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute roles={["teacher", "admin"]}>
                <PrivatePage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/denied" element={<div>Denied</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/private ok/i)).toBeInTheDocument();
  });

  test("redirects to /denied when role not allowed", () => {
    localStorage.setItem("token", "t");
    localStorage.setItem("role", "student");

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <PrivatePage />
              </ProtectedRoute>
            }
          />
          <Route path="/denied" element={<div>Denied</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/denied/i)).toBeInTheDocument();
  });
});
