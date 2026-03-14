import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../../__mocks__/prisma";
import { mockGetToken } from "../../../__mocks__/next-auth-jwt";
import { createMockRequest, createMockToken } from "../../../__mocks__/helpers";

// Setup mocks before importing route
import "../../../__mocks__/prisma";
import "../../../__mocks__/next-auth-jwt";

import { GET } from "../employees/route";

describe("GET /api/employees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("토큰 없으면 401 반환", async () => {
    mockGetToken.mockResolvedValue(null);

    const request = createMockRequest("/api/employees");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("tenantId 없으면 401 반환", async () => {
    mockGetToken.mockResolvedValue({ id: "user-1", tenantId: null });

    const request = createMockRequest("/api/employees");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("기본 페이지네이션으로 직원 목록 반환", async () => {
    const token = createMockToken();
    mockGetToken.mockResolvedValue(token);

    const mockEmployees = [
      {
        id: "emp-1",
        name: "김철수",
        email: "kim@flowhr.com",
        employeeNumber: "EMP001",
        status: "ACTIVE",
        department: { id: "dept-1", name: "개발팀" },
        position: { id: "pos-1", name: "시니어 개발자", level: 3 },
      },
      {
        id: "emp-2",
        name: "이영희",
        email: "lee@flowhr.com",
        employeeNumber: "EMP002",
        status: "ACTIVE",
        department: { id: "dept-2", name: "인사팀" },
        position: { id: "pos-2", name: "매니저", level: 4 },
      },
    ];

    prismaMock.employee.findMany.mockResolvedValue(mockEmployees);
    prismaMock.employee.count.mockResolvedValue(2);

    const request = createMockRequest("/api/employees");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1,
    });
  });

  it("검색어로 필터링", async () => {
    const token = createMockToken();
    mockGetToken.mockResolvedValue(token);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.employee.count.mockResolvedValue(0);

    const request = createMockRequest("/api/employees?search=김철수");
    await GET(request);

    expect(prismaMock.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          OR: expect.arrayContaining([
            expect.objectContaining({
              name: { contains: "김철수", mode: "insensitive" },
            }),
          ]),
        }),
      }),
    );
  });

  it("상태 필터링", async () => {
    const token = createMockToken();
    mockGetToken.mockResolvedValue(token);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.employee.count.mockResolvedValue(0);

    const request = createMockRequest("/api/employees?status=ACTIVE");
    await GET(request);

    expect(prismaMock.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          status: "ACTIVE",
        }),
      }),
    );
  });

  it("유효하지 않은 상태는 필터 적용 안 됨", async () => {
    const token = createMockToken();
    mockGetToken.mockResolvedValue(token);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.employee.count.mockResolvedValue(0);

    const request = createMockRequest("/api/employees?status=INVALID");
    await GET(request);

    expect(prismaMock.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          status: "INVALID",
        }),
      }),
    );
  });

  it("페이지네이션 파라미터 적용", async () => {
    const token = createMockToken();
    mockGetToken.mockResolvedValue(token);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.employee.count.mockResolvedValue(50);

    const request = createMockRequest("/api/employees?page=3&pageSize=20");
    const response = await GET(request);
    const body = await response.json();

    expect(prismaMock.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 40,
        take: 20,
      }),
    );
    expect(body.pagination.page).toBe(3);
    expect(body.pagination.pageSize).toBe(20);
  });

  it("pageSize 최대 100 제한", async () => {
    const token = createMockToken();
    mockGetToken.mockResolvedValue(token);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.employee.count.mockResolvedValue(0);

    const request = createMockRequest("/api/employees?pageSize=500");
    const response = await GET(request);
    const body = await response.json();

    expect(body.pagination.pageSize).toBe(100);
  });

  it("page 최소 1 제한", async () => {
    const token = createMockToken();
    mockGetToken.mockResolvedValue(token);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.employee.count.mockResolvedValue(0);

    const request = createMockRequest("/api/employees?page=-1");
    const response = await GET(request);
    const body = await response.json();

    expect(body.pagination.page).toBe(1);
  });
});
