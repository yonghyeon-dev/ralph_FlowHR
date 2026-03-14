import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockGetToken } from "../__mocks__/next-auth-jwt";

// Must import mock setup before importing the module under test
import "../__mocks__/next-auth-jwt";

import { middleware } from "../middleware";
import { NextRequest } from "next/server";

function createRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, "http://localhost:3000"));
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("공개 경로", () => {
    it("/ 경로는 인증 없이 통과", async () => {
      const response = await middleware(createRequest("/"));
      expect(response.status).toBe(200);
    });

    it("/login 경로는 인증 없이 통과", async () => {
      const response = await middleware(createRequest("/login"));
      expect(response.status).toBe(200);
    });

    it("/api/auth/* 경로는 인증 없이 통과", async () => {
      const response = await middleware(createRequest("/api/auth/callback"));
      expect(response.status).toBe(200);
    });

    it("/landing 경로는 인증 없이 통과", async () => {
      const response = await middleware(createRequest("/landing"));
      expect(response.status).toBe(200);
    });

    it("/forbidden 경로는 인증 없이 통과", async () => {
      const response = await middleware(createRequest("/forbidden"));
      expect(response.status).toBe(200);
    });
  });

  describe("정적 자산", () => {
    it("/_next 경로는 통과", async () => {
      const response = await middleware(createRequest("/_next/static/chunk.js"));
      expect(response.status).toBe(200);
    });

    it("/favicon 경로는 통과", async () => {
      const response = await middleware(createRequest("/favicon.ico"));
      expect(response.status).toBe(200);
    });

    it("파일 확장자 포함 경로는 통과", async () => {
      const response = await middleware(createRequest("/images/logo.png"));
      expect(response.status).toBe(200);
    });
  });

  describe("인증 필요 경로", () => {
    it("토큰 없으면 /login으로 리다이렉트", async () => {
      mockGetToken.mockResolvedValue(null);

      const response = await middleware(createRequest("/admin/dashboard"));
      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("callbackUrl=%2Fadmin%2Fdashboard");
    });

    it("토큰 있으면 통과하고 사용자 헤더 설정", async () => {
      mockGetToken.mockResolvedValue({
        id: "user-1",
        role: "SUPER_ADMIN",
        tenantId: "tenant-1",
      });

      const response = await middleware(createRequest("/admin/dashboard"));
      expect(response.status).toBe(200);
      expect(response.headers.get("x-user-id")).toBe("user-1");
      expect(response.headers.get("x-user-role")).toBe("SUPER_ADMIN");
      expect(response.headers.get("x-tenant-id")).toBe("tenant-1");
    });
  });

  describe("RBAC 제어", () => {
    it("EMPLOYEE가 /admin 접근 시 /forbidden으로 리다이렉트", async () => {
      mockGetToken.mockResolvedValue({
        id: "user-2",
        role: "EMPLOYEE",
        tenantId: "tenant-1",
      });

      const response = await middleware(createRequest("/admin/dashboard"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/forbidden");
    });

    it("PLATFORM_OPERATOR가 /platform 접근 허용", async () => {
      mockGetToken.mockResolvedValue({
        id: "user-3",
        role: "PLATFORM_OPERATOR",
        tenantId: "tenant-1",
      });

      const response = await middleware(createRequest("/platform/dashboard"));
      expect(response.status).toBe(200);
    });

    it("SUPER_ADMIN이 /platform 접근 시 /forbidden으로 리다이렉트", async () => {
      mockGetToken.mockResolvedValue({
        id: "user-1",
        role: "SUPER_ADMIN",
        tenantId: "tenant-1",
      });

      const response = await middleware(createRequest("/platform/dashboard"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/forbidden");
    });

    it("EMPLOYEE가 /employee 접근 허용", async () => {
      mockGetToken.mockResolvedValue({
        id: "user-4",
        role: "EMPLOYEE",
        tenantId: "tenant-1",
      });

      const response = await middleware(createRequest("/employee/home"));
      expect(response.status).toBe(200);
    });

    it("규칙 없는 경로는 인증만 확인", async () => {
      mockGetToken.mockResolvedValue({
        id: "user-1",
        role: "EMPLOYEE",
        tenantId: "tenant-1",
      });

      const response = await middleware(createRequest("/some-page"));
      expect(response.status).toBe(200);
    });
  });
});
