import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: params.id,
      tenantId: token.tenantId,
    },
    include: {
      department: {
        select: { id: true, name: true, manager: { select: { id: true, name: true } } },
      },
      position: { select: { id: true, name: true, level: true } },
      changes: {
        orderBy: { effectiveDate: "desc" },
        take: 5,
        include: {
          fromDepartment: { select: { name: true } },
          toDepartment: { select: { name: true } },
          fromPosition: { select: { name: true } },
          toPosition: { select: { name: true } },
        },
      },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: employee });
}
