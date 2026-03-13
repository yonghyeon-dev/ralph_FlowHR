import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const monthParam = url.searchParams.get("month");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? "10")));

  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;

  // Find the payroll run for the selected month
  const payrollRun = await prisma.payrollRun.findUnique({
    where: {
      tenantId_year_month: { tenantId, year, month },
    },
  });

  if (!payrollRun) {
    return NextResponse.json({
      payslips: [],
      total: 0,
      page,
      pageSize,
      year,
      month,
    });
  }

  const where = {
    tenantId,
    payrollRunId: payrollRun.id,
  };

  const [payslips, total] = await Promise.all([
    prisma.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { employee: { name: "asc" } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payslip.count({ where }),
  ]);

  const mapped = payslips.map((p) => ({
    id: p.id,
    employeeName: p.employee.name,
    department: p.employee.department?.name ?? "-",
    baseSalary: p.baseSalary,
    allowances: p.allowances,
    deductions: p.deductions,
    netAmount: p.netAmount,
    status: p.status,
    sentAt: p.sentAt?.toISOString() ?? null,
  }));

  return NextResponse.json({
    payslips: mapped,
    total,
    page,
    pageSize,
    year,
    month,
  });
}
