import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { Prisma, ApprovalRequestStatus } from "@prisma/client";

const COMPLETED_STATUSES: ApprovalRequestStatus[] = [
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId;
  const { searchParams } = request.nextUrl;

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const sortKey = searchParams.get("sortKey") ?? "completedAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)),
  );

  const where: Prisma.ApprovalRequestWhereInput = {
    tenantId,
    status: {
      in: COMPLETED_STATUSES,
    },
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { requester: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (status && COMPLETED_STATUSES.includes(status as ApprovalRequestStatus)) {
    where.status = status as ApprovalRequestStatus;
  }

  type OrderByType = Prisma.ApprovalRequestOrderByWithRelationInput;
  let orderBy: OrderByType;

  switch (sortKey) {
    case "title":
      orderBy = { title: sortDir };
      break;
    case "requester":
      orderBy = { requester: { name: sortDir } };
      break;
    case "requestType":
      orderBy = { requestType: sortDir };
      break;
    case "createdAt":
      orderBy = { createdAt: sortDir };
      break;
    case "status":
      orderBy = { status: sortDir };
      break;
    default:
      orderBy = { completedAt: sortDir };
  }

  const [records, total] = await Promise.all([
    prisma.approvalRequest.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.approvalRequest.count({ where }),
  ]);

  const data = records.map((r) => {
    const createdDate = new Date(r.createdAt);
    const completedDate = r.completedAt ? new Date(r.completedAt) : null;

    let processingDays = 0;
    if (completedDate) {
      const diffMs = completedDate.getTime() - createdDate.getTime();
      processingDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
      id: r.id,
      title: r.title,
      requesterName: r.requester.name,
      department: r.requester.department?.name ?? "—",
      requestType: r.requestType,
      createdAt: createdDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      completedAt: completedDate
        ? completedDate.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
        : "—",
      status: r.status,
      processingDays,
    };
  });

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
