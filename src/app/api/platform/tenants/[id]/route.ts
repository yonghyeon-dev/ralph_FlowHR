import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
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
          departments: true,
          supportTickets: true,
        },
      },
      billingAccounts: {
        select: {
          monthlyAmount: true,
          status: true,
          paymentMethod: true,
          nextBillingDate: true,
          billingEmail: true,
          plan: {
            select: {
              name: true,
              maxSeats: true,
              storageGb: true,
              apiCallsPerMonth: true,
              supportLevel: true,
            },
          },
        },
        take: 1,
      },
      supportTickets: {
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const billing = tenant.billingAccounts[0] ?? null;

  return NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    domain: `${tenant.slug}.flowhr.io`,
    plan: tenant.plan,
    status: tenant.status,
    settings: tenant.settings,
    seats: tenant._count.users,
    employeeCount: tenant._count.employees,
    departmentCount: tenant._count.departments,
    ticketCount: tenant._count.supportTickets,
    mrr: billing?.monthlyAmount ?? 0,
    billingStatus: billing?.status ?? null,
    paymentMethod: billing?.paymentMethod ?? null,
    billingEmail: billing?.billingEmail ?? null,
    nextBillingDate: billing?.nextBillingDate?.toISOString() ?? null,
    maxSeats: billing?.plan?.maxSeats ?? null,
    storageGb: billing?.plan?.storageGb ?? null,
    apiCallsPerMonth: billing?.plan?.apiCallsPerMonth ?? null,
    supportLevel: billing?.plan?.supportLevel ?? null,
    recentTickets: tenant.supportTickets.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  });
}
