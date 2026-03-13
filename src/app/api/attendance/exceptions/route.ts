import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { ExceptionType, ExceptionStatus } from "@prisma/client";

const VALID_TYPES: ExceptionType[] = [
  "CORRECTION",
  "OVERTIME",
  "BUSINESS_TRIP",
  "REMOTE_WORK",
];

const VALID_STATUSES: ExceptionStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId;
  const { searchParams } = request.nextUrl;

  const typeFilter = searchParams.get("type") ?? "";
  const statusFilter = searchParams.get("status") ?? "";

  const where: {
    tenantId: string;
    type?: ExceptionType;
    status?: ExceptionStatus;
  } = { tenantId };

  if (typeFilter && VALID_TYPES.includes(typeFilter as ExceptionType)) {
    where.type = typeFilter as ExceptionType;
  }
  if (
    statusFilter &&
    VALID_STATUSES.includes(statusFilter as ExceptionStatus)
  ) {
    where.status = statusFilter as ExceptionStatus;
  }

  const exceptions = await prisma.attendanceException.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Group by type with counts
  const grouped: Record<
    string,
    {
      type: string;
      total: number;
      pending: number;
      items: {
        id: string;
        employeeName: string;
        department: string;
        type: string;
        status: string;
        date: string;
        reason: string;
        approvedBy: string | null;
        approvedAt: string | null;
        createdAt: string;
      }[];
    }
  > = {};

  for (const t of VALID_TYPES) {
    grouped[t] = { type: t, total: 0, pending: 0, items: [] };
  }

  for (const ex of exceptions) {
    const group = grouped[ex.type];
    if (!group) continue;
    group.total += 1;
    if (ex.status === "PENDING") group.pending += 1;
    group.items.push({
      id: ex.id,
      employeeName: ex.employee.name,
      department: ex.employee.department?.name ?? "—",
      type: ex.type,
      status: ex.status,
      date: new Date(ex.date).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      reason: ex.reason,
      approvedBy: ex.approvedBy,
      approvedAt: ex.approvedAt
        ? new Date(ex.approvedAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
        : null,
      createdAt: new Date(ex.createdAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    });
  }

  return NextResponse.json({ groups: Object.values(grouped) });
}

export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId || !token.employeeNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId;
  const body = await request.json();
  const { id, action } = body as { id: string; action: string };

  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const exception = await prisma.attendanceException.findFirst({
    where: { id, tenantId },
  });

  if (!exception) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (exception.status !== "PENDING") {
    return NextResponse.json(
      { error: "Already processed" },
      { status: 409 },
    );
  }

  const updated = await prisma.attendanceException.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      approvedBy: token.employeeNumber as string,
      approvedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
  });
}
