import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom doesn't implement alert; stub it
globalThis.alert = vi.fn();
