import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { Prisma, EmployeeChangeType } from "@prisma/client";

const VALID_TYPES: EmployeeChangeType[] = [
  "HIRE",
  "TRANSFER",
  "PROMOTION",
  "RESIGNATION",
  "TERMINATION",
];

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)),
  );

  const where: Prisma.EmployeeChangeWhereInput = {
    tenantId: token.tenantId,
  };

  if (type && VALID_TYPES.includes(type as EmployeeChangeType)) {
    where.type = type as EmployeeChangeType;
  }

  if (search) {
    where.employee = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { employeeNumber: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [changes, total] = await Promise.all([
    prisma.employeeChange.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
          },
        },
        fromDepartment: { select: { name: true } },
        toDepartment: { select: { name: true } },
        fromPosition: { select: { name: true } },
        toPosition: { select: { name: true } },
      },
      orderBy: { effectiveDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employeeChange.count({ where }),
  ]);

  return NextResponse.json({
    data: changes,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
