import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  manager: { id: string; name: string; position: string | null } | null;
  employeeCount: number;
  children: DepartmentNode[];
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const departments = await prisma.department.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          position: { select: { name: true } },
        },
      },
      _count: {
        select: {
          employees: {
            where: { status: { in: ["ACTIVE", "ON_LEAVE", "PENDING_RESIGNATION"] } },
          },
        },
      },
    },
  });

  const nodeMap = new Map<string, DepartmentNode>();
  for (const dept of departments) {
    nodeMap.set(dept.id, {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      description: dept.description,
      parentId: dept.parentId,
      sortOrder: dept.sortOrder,
      manager: dept.manager
        ? {
            id: dept.manager.id,
            name: dept.manager.name,
            position: dept.manager.position?.name ?? null,
          }
        : null,
      employeeCount: dept._count.employees,
      children: [],
    });
  }

  const roots: DepartmentNode[] = [];
  const nodes = Array.from(nodeMap.values());
  for (const node of nodes) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return NextResponse.json({ data: roots });
}
