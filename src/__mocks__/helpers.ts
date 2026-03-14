import { NextRequest } from "next/server";

export function createMockRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
): NextRequest {
  const fullUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;
  const init: RequestInit = {
    method: options?.method ?? "GET",
    headers: options?.headers ?? {},
  };

  if (options?.body) {
    init.body = JSON.stringify(options.body);
    (init.headers as Record<string, string>)["content-type"] =
      "application/json";
  }

  return new NextRequest(fullUrl, init);
}

export function createMockToken(overrides?: Record<string, unknown>) {
  return {
    id: "user-1",
    email: "admin@flowhr.com",
    role: "SUPER_ADMIN",
    tenantId: "tenant-1",
    tenantSlug: "demo",
    employeeId: "emp-1",
    employeeNumber: "EMP001",
    ...overrides,
  };
}
