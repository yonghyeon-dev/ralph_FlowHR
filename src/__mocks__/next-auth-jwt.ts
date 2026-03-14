import { vi } from "vitest";

export const mockGetToken = vi.fn();

vi.mock("next-auth/jwt", () => ({
  getToken: mockGetToken,
}));
