import { describe, it, expect } from "vitest";
import {
  ROLES,
  TENANT_ROLES,
  ADMIN_ROLES,
  ROUTE_ROLE_MAP,
  PUBLIC_ROUTES,
  isRoleAllowed,
  getDefaultRedirect,
} from "../rbac";

describe("RBAC Constants", () => {
  it("ROLES에 5개 역할이 정의되어야 함", () => {
    expect(Object.keys(ROLES)).toHaveLength(5);
    expect(ROLES.PLATFORM_OPERATOR).toBe("PLATFORM_OPERATOR");
    expect(ROLES.SUPER_ADMIN).toBe("SUPER_ADMIN");
    expect(ROLES.HR_ADMIN).toBe("HR_ADMIN");
    expect(ROLES.MANAGER).toBe("MANAGER");
    expect(ROLES.EMPLOYEE).toBe("EMPLOYEE");
  });

  it("TENANT_ROLES에 PLATFORM_OPERATOR 제외 4개 역할 포함", () => {
    expect(TENANT_ROLES).toHaveLength(4);
    expect(TENANT_ROLES).toContain(ROLES.SUPER_ADMIN);
    expect(TENANT_ROLES).toContain(ROLES.HR_ADMIN);
    expect(TENANT_ROLES).toContain(ROLES.MANAGER);
    expect(TENANT_ROLES).toContain(ROLES.EMPLOYEE);
    expect(TENANT_ROLES).not.toContain(ROLES.PLATFORM_OPERATOR);
  });

  it("ADMIN_ROLES에 EMPLOYEE 제외 3개 역할 포함", () => {
    expect(ADMIN_ROLES).toHaveLength(3);
    expect(ADMIN_ROLES).toContain(ROLES.SUPER_ADMIN);
    expect(ADMIN_ROLES).toContain(ROLES.HR_ADMIN);
    expect(ADMIN_ROLES).toContain(ROLES.MANAGER);
    expect(ADMIN_ROLES).not.toContain(ROLES.EMPLOYEE);
  });

  it("ROUTE_ROLE_MAP에 3개 라우트 규칙 정의", () => {
    expect(ROUTE_ROLE_MAP).toHaveLength(3);
    expect(ROUTE_ROLE_MAP[0].prefix).toBe("/platform");
    expect(ROUTE_ROLE_MAP[1].prefix).toBe("/admin");
    expect(ROUTE_ROLE_MAP[2].prefix).toBe("/employee");
  });

  it("PUBLIC_ROUTES에 공개 경로 5개 포함", () => {
    expect(PUBLIC_ROUTES).toContain("/");
    expect(PUBLIC_ROUTES).toContain("/login");
    expect(PUBLIC_ROUTES).toContain("/api/auth");
    expect(PUBLIC_ROUTES).toContain("/landing");
    expect(PUBLIC_ROUTES).toContain("/forbidden");
  });
});

describe("isRoleAllowed", () => {
  describe("/platform 경로", () => {
    it("PLATFORM_OPERATOR만 접근 허용", () => {
      expect(isRoleAllowed("/platform", ROLES.PLATFORM_OPERATOR)).toBe(true);
      expect(isRoleAllowed("/platform/dashboard", ROLES.PLATFORM_OPERATOR)).toBe(true);
    });

    it("다른 역할은 접근 거부", () => {
      expect(isRoleAllowed("/platform", ROLES.SUPER_ADMIN)).toBe(false);
      expect(isRoleAllowed("/platform", ROLES.HR_ADMIN)).toBe(false);
      expect(isRoleAllowed("/platform", ROLES.MANAGER)).toBe(false);
      expect(isRoleAllowed("/platform", ROLES.EMPLOYEE)).toBe(false);
    });

    it("역할 없으면 접근 거부", () => {
      expect(isRoleAllowed("/platform", null)).toBe(false);
      expect(isRoleAllowed("/platform", undefined)).toBe(false);
    });
  });

  describe("/admin 경로", () => {
    it("ADMIN_ROLES만 접근 허용", () => {
      expect(isRoleAllowed("/admin", ROLES.SUPER_ADMIN)).toBe(true);
      expect(isRoleAllowed("/admin", ROLES.HR_ADMIN)).toBe(true);
      expect(isRoleAllowed("/admin", ROLES.MANAGER)).toBe(true);
      expect(isRoleAllowed("/admin/dashboard", ROLES.SUPER_ADMIN)).toBe(true);
    });

    it("EMPLOYEE와 PLATFORM_OPERATOR는 접근 거부", () => {
      expect(isRoleAllowed("/admin", ROLES.EMPLOYEE)).toBe(false);
      expect(isRoleAllowed("/admin", ROLES.PLATFORM_OPERATOR)).toBe(false);
    });
  });

  describe("/employee 경로", () => {
    it("모든 테넌트 역할 접근 허용", () => {
      expect(isRoleAllowed("/employee", ROLES.SUPER_ADMIN)).toBe(true);
      expect(isRoleAllowed("/employee", ROLES.HR_ADMIN)).toBe(true);
      expect(isRoleAllowed("/employee", ROLES.MANAGER)).toBe(true);
      expect(isRoleAllowed("/employee", ROLES.EMPLOYEE)).toBe(true);
    });

    it("PLATFORM_OPERATOR는 접근 거부", () => {
      expect(isRoleAllowed("/employee", ROLES.PLATFORM_OPERATOR)).toBe(false);
    });
  });

  describe("규칙 미매칭 경로", () => {
    it("규칙에 없는 경로는 null 반환 (제한 없음)", () => {
      expect(isRoleAllowed("/api/something", ROLES.EMPLOYEE)).toBeNull();
      expect(isRoleAllowed("/dashboard", ROLES.MANAGER)).toBeNull();
      expect(isRoleAllowed("/settings", null)).toBeNull();
    });
  });
});

describe("getDefaultRedirect", () => {
  it("PLATFORM_OPERATOR는 /platform 리다이렉트", () => {
    expect(getDefaultRedirect(ROLES.PLATFORM_OPERATOR)).toBe("/platform");
  });

  it("SUPER_ADMIN은 /admin 리다이렉트", () => {
    expect(getDefaultRedirect(ROLES.SUPER_ADMIN)).toBe("/admin");
  });

  it("HR_ADMIN은 /admin 리다이렉트", () => {
    expect(getDefaultRedirect(ROLES.HR_ADMIN)).toBe("/admin");
  });

  it("MANAGER는 /admin 리다이렉트", () => {
    expect(getDefaultRedirect(ROLES.MANAGER)).toBe("/admin");
  });

  it("EMPLOYEE는 /employee 리다이렉트", () => {
    expect(getDefaultRedirect(ROLES.EMPLOYEE)).toBe("/employee");
  });

  it("역할 없으면 / 리다이렉트", () => {
    expect(getDefaultRedirect(null)).toBe("/");
    expect(getDefaultRedirect(undefined)).toBe("/");
    expect(getDefaultRedirect("UNKNOWN_ROLE")).toBe("/");
  });
});
