import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const plan = searchParams.get("plan") ?? "";
  const sortKey = searchParams.get("sortKey") ?? "createdAt";
  const sortDir = searchParams.get("sortDir") ?? "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

  // Build where clause
  const where: Prisma.TenantWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status as Prisma.EnumTenantStatusFilter;
  }

  if (plan) {
    where.plan = plan as Prisma.EnumTenantPlanFilter;
  }

  // Count
  const total = await prisma.tenant.count({ where });

  // Valid sort keys
  const validSortKeys: Record<string, string> = {
    name: "name",
    plan: "plan",
    status: "status",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  };
  const orderField = validSortKeys[sortKey] ?? "createdAt";
  const orderDir = sortDir === "asc" ? "asc" : "desc";

  // Fetch tenants with related counts
  const tenants = await prisma.tenant.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      settings: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users: true,
          employees: true,
          supportTickets: true,
        },
      },
      billingAccounts: {
        select: {
          monthlyAmount: true,
          status: true,
          paymentMethod: true,
          nextBillingDate: true,
          plan: {
            select: {
              name: true,
              maxSeats: true,
              storageGb: true,
              apiCallsPerMonth: true,
            },
          },
        },
        take: 1,
      },
    },
    orderBy: { [orderField]: orderDir },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // Status counts for filter chips
  const statusCounts = await prisma.tenant.groupBy({
    by: ["status"],
    _count: true,
  });

  const planCounts = await prisma.tenant.groupBy({
    by: ["plan"],
    _count: true,
  });

  const counts = {
    total,
    byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
    byPlan: Object.fromEntries(planCounts.map((p) => [p.plan, p._count])),
  };

  // Map tenants to response shape
  const data = tenants.map((t) => {
    const billing = t.billingAccounts[0] ?? null;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      domain: `${t.slug}.flowhr.io`,
      plan: t.plan,
      status: t.status,
      seats: t._count.users,
      employeeCount: t._count.employees,
      ticketCount: t._count.supportTickets,
      mrr: billing?.monthlyAmount ?? 0,
      billingStatus: billing?.status ?? null,
      paymentMethod: billing?.paymentMethod ?? null,
      nextBillingDate: billing?.nextBillingDate?.toISOString() ?? null,
      maxSeats: billing?.plan?.maxSeats ?? null,
      storageGb: billing?.plan?.storageGb ?? null,
      apiCallsPerMonth: billing?.plan?.apiCallsPerMonth ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({
    data,
    counts,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
