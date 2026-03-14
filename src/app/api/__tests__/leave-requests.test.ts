import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../../__mocks__/prisma";
import { mockGetToken } from "../../../__mocks__/next-auth-jwt";
import { createMockRequest, createMockToken } from "../../../__mocks__/helpers";

import "../../../__mocks__/prisma";
import "../../../__mocks__/next-auth-jwt";

import { GET, PATCH } from "../leave/requests/route";

describe("GET /api/leave/requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("토큰 없으면 401 반환", async () => {
    mockGetToken.mockResolvedValue(null);

    const request = createMockRequest("/api/leave/requests");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("휴가 요청 목록과 요약 반환", async () => {
    mockGetToken.mockResolvedValue(createMockToken());

    const mockRequests = [
      {
        id: "lr-1",
        status: "PENDING",
        startDate: new Date("2026-03-20"),
        endDate: new Date("2026-03-21"),
        days: 2,
        reason: "개인 사유",
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectReason: null,
        createdAt: new Date("2026-03-14"),
        employee: {
          id: "emp-1",
          name: "김철수",
          employeeNumber: "EMP001",
          department: { name: "개발팀" },
        },
        policy: { name: "연차", type: "ANNUAL" },
      },
      {
        id: "lr-2",
        status: "APPROVED",
        startDate: new Date("2026-03-18"),
        endDate: new Date("2026-03-18"),
        days: 1,
        reason: null,
        approvedBy: "emp-2",
        approvedAt: new Date("2026-03-15"),
        rejectedBy: null,
        rejectedAt: null,
        rejectReason: null,
        createdAt: new Date("2026-03-13"),
        employee: {
          id: "emp-3",
          name: "박지민",
          employeeNumber: "EMP003",
          department: { name: "인사팀" },
        },
        policy: { name: "연차", type: "ANNUAL" },
      },
    ];

    prismaMock.leaveRequest.findMany.mockResolvedValue(mockRequests);

    const request = createMockRequest("/api/leave/requests");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.summary).toEqual({
      total: 2,
      pending: 1,
      approved: 1,
      rejected: 0,
    });
  });

  it("상태 필터 적용", async () => {
    mockGetToken.mockResolvedValue(createMockToken());
    prismaMock.leaveRequest.findMany.mockResolvedValue([]);

    const request = createMockRequest("/api/leave/requests?status=PENDING");
    await GET(request);

    expect(prismaMock.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING",
        }),
      }),
    );
  });

  it("검색어 필터 적용", async () => {
    mockGetToken.mockResolvedValue(createMockToken());
    prismaMock.leaveRequest.findMany.mockResolvedValue([]);

    const request = createMockRequest("/api/leave/requests?search=김철수");
    await GET(request);

    expect(prismaMock.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employee: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: "김철수", mode: "insensitive" },
              }),
            ]),
          }),
        }),
      }),
    );
  });
});

describe("PATCH /api/leave/requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("토큰 없으면 401 반환", async () => {
    mockGetToken.mockResolvedValue(null);

    const request = createMockRequest("/api/leave/requests", {
      method: "PATCH",
      body: { id: "lr-1", action: "approve" },
    });
    const response = await PATCH(request);

    expect(response.status).toBe(401);
  });

  it("employeeId 없으면 401 반환", async () => {
    mockGetToken.mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-1",
      employeeId: null,
    });

    const request = createMockRequest("/api/leave/requests", {
      method: "PATCH",
      body: { id: "lr-1", action: "approve" },
    });
    const response = await PATCH(request);

    expect(response.status).toBe(401);
  });

  it("id 또는 action 없으면 400 반환", async () => {
    mockGetToken.mockResolvedValue(createMockToken());

    const request = createMockRequest("/api/leave/requests", {
      method: "PATCH",
      body: { id: "lr-1" },
    });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
  });

  it("존재하지 않는 요청이면 404 반환", async () => {
    mockGetToken.mockResolvedValue(createMockToken());
    prismaMock.leaveRequest.findFirst.mockResolvedValue(null);

    const request = createMockRequest("/api/leave/requests", {
      method: "PATCH",
      body: { id: "lr-999", action: "approve" },
    });
    const response = await PATCH(request);

    expect(response.status).toBe(404);
  });

  it("승인 시 트랜잭션으로 상태 변경 + 잔여일수 업데이트", async () => {
    mockGetToken.mockResolvedValue(createMockToken());
    prismaMock.leaveRequest.findFirst.mockResolvedValue({
      id: "lr-1",
      tenantId: "tenant-1",
      employeeId: "emp-1",
      policyId: "policy-1",
      days: 2,
      status: "PENDING",
      policy: { name: "연차", type: "ANNUAL" },
    });

    const request = createMockRequest("/api/leave/requests", {
      method: "PATCH",
      body: { id: "lr-1", action: "approve" },
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.anything(), // leaveRequest.update
        expect.anything(), // leaveBalance.updateMany
      ]),
    );
  });

  it("반려 시 트랜잭션으로 상태 변경 + 보류일수 감소", async () => {
    mockGetToken.mockResolvedValue(createMockToken());
    prismaMock.leaveRequest.findFirst.mockResolvedValue({
      id: "lr-1",
      tenantId: "tenant-1",
      employeeId: "emp-1",
      policyId: "policy-1",
      days: 2,
      status: "PENDING",
      policy: { name: "연차", type: "ANNUAL" },
    });

    const request = createMockRequest("/api/leave/requests", {
      method: "PATCH",
      body: { id: "lr-1", action: "reject", rejectReason: "사유 부족" },
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});
