import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../../__mocks__/prisma";
import { mockGetToken } from "../../../__mocks__/next-auth-jwt";
import { createMockRequest, createMockToken } from "../../../__mocks__/helpers";

import "../../../__mocks__/prisma";
import "../../../__mocks__/next-auth-jwt";

import { GET, PATCH } from "../attendance/closing/route";

describe("GET /api/attendance/closing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("토큰 없으면 401 반환", async () => {
    mockGetToken.mockResolvedValue(null);

    const request = createMockRequest("/api/attendance/closing");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("기존 마감 레코드가 있으면 체크리스트 반환", async () => {
    mockGetToken.mockResolvedValue(createMockToken());

    prismaMock.attendanceClosing.findUnique.mockResolvedValue({
      id: "closing-1",
      tenantId: "tenant-1",
      year: 2026,
      month: 3,
      status: "OPEN",
      closedBy: null,
      closedAt: null,
      totalDays: 0,
      totalHours: 0,
    });

    // Missing checkouts
    prismaMock.attendanceRecord.count.mockResolvedValueOnce(3);
    // Pending overtime
    prismaMock.attendanceException.count.mockResolvedValue(1);
    // Departments
    prismaMock.department.findMany.mockResolvedValue([
      { id: "dept-1" },
      { id: "dept-2" },
    ]);
    // Total records
    prismaMock.attendanceRecord.count.mockResolvedValue(100);
    // Work minutes aggregate
    prismaMock.attendanceRecord.aggregate.mockResolvedValue({
      _sum: { workMinutes: 48000 },
    });

    const request = createMockRequest("/api/attendance/closing?year=2026&month=3");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.year).toBe(2026);
    expect(body.month).toBe(3);
    expect(body.status).toBe("OPEN");
    expect(body.checklist).toHaveLength(4);
    expect(body.checklist[0].id).toBe("checkout_correction");
    expect(body.checklist[1].id).toBe("overtime_verification");
    expect(body.checklist[2].id).toBe("department_approval");
    expect(body.checklist[3].id).toBe("final_closing");
  });

  it("마감 레코드 없으면 새로 생성", async () => {
    mockGetToken.mockResolvedValue(createMockToken());

    prismaMock.attendanceClosing.findUnique.mockResolvedValue(null);
    prismaMock.attendanceClosing.create.mockResolvedValue({
      id: "closing-new",
      tenantId: "tenant-1",
      year: 2026,
      month: 3,
      status: "OPEN",
      closedBy: null,
      closedAt: null,
      totalDays: 0,
      totalHours: 0,
    });
    prismaMock.attendanceRecord.count.mockResolvedValue(0);
    prismaMock.attendanceException.count.mockResolvedValue(0);
    prismaMock.department.findMany.mockResolvedValue([]);
    prismaMock.attendanceRecord.aggregate.mockResolvedValue({
      _sum: { workMinutes: 0 },
    });

    const request = createMockRequest("/api/attendance/closing");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prismaMock.attendanceClosing.create).toHaveBeenCalled();
  });
});

describe("PATCH /api/attendance/closing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("토큰 없으면 401 반환", async () => {
    mockGetToken.mockResolvedValue(null);

    const request = createMockRequest("/api/attendance/closing", {
      method: "PATCH",
      body: { year: 2026, month: 3, action: "advance" },
    });
    const response = await PATCH(request);

    expect(response.status).toBe(401);
  });

  it("employeeNumber 없으면 401 반환", async () => {
    mockGetToken.mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-1",
      employeeNumber: null,
    });

    const request = createMockRequest("/api/attendance/closing", {
      method: "PATCH",
      body: { year: 2026, month: 3, action: "advance" },
    });
    const response = await PATCH(request);

    expect(response.status).toBe(401);
  });

  it("잘못된 요청이면 400 반환", async () => {
    mockGetToken.mockResolvedValue(createMockToken());

    const request = createMockRequest("/api/attendance/closing", {
      method: "PATCH",
      body: { year: 2026, month: 3, action: "invalid" },
    });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
  });

  it("마감 레코드 없으면 404 반환", async () => {
    mockGetToken.mockResolvedValue(createMockToken());
    prismaMock.attendanceClosing.findUnique.mockResolvedValue(null);

    const request = createMockRequest("/api/attendance/closing", {
      method: "PATCH",
      body: { year: 2026, month: 3, action: "advance" },
    });
    const response = await PATCH(request);

    expect(response.status).toBe(404);
  });

  it("OPEN → IN_REVIEW 전환 성공", async () => {
    mockGetToken.mockResolvedValue(createMockToken());
    prismaMock.attendanceClosing.findUnique.mockResolvedValue({
      id: "closing-1",
      status: "OPEN",
    });
    prismaMock.attendanceClosing.update.mockResolvedValue({
      status: "IN_REVIEW",
      closedBy: null,
      closedAt: null,
    });

    const request = createMockRequest("/api/attendance/closing", {
      method: "PATCH",
      body: { year: 2026, month: 3, action: "advance" },
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("IN_REVIEW");
  });

  it("IN_REVIEW → CLOSED 전환 시 closedBy, closedAt 설정", async () => {
    mockGetToken.mockResolvedValue(createMockToken());
    prismaMock.attendanceClosing.findUnique.mockResolvedValue({
      id: "closing-1",
      status: "IN_REVIEW",
    });
    prismaMock.attendanceClosing.update.mockResolvedValue({
      status: "CLOSED",
      closedBy: "EMP001",
      closedAt: new Date(),
    });

    const request = createMockRequest("/api/attendance/closing", {
      method: "PATCH",
      body: { year: 2026, month: 3, action: "advance" },
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("CLOSED");
    expect(prismaMock.attendanceClosing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CLOSED",
          closedBy: "EMP001",
        }),
      }),
    );
  });

  it("CLOSED 상태에서 더 이상 전환 불가 (409)", async () => {
    mockGetToken.mockResolvedValue(createMockToken());
    prismaMock.attendanceClosing.findUnique.mockResolvedValue({
      id: "closing-1",
      status: "CLOSED",
    });

    const request = createMockRequest("/api/attendance/closing", {
      method: "PATCH",
      body: { year: 2026, month: 3, action: "advance" },
    });
    const response = await PATCH(request);

    expect(response.status).toBe(409);
  });
});
