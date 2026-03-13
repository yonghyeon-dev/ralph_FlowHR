import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// ─── GET: 역할 목록 조회 ────────────────────────────────
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const roles = await prisma.role.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      permissions: true,
      isSystem: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { users: true },
      },
    },
  });

  const mapped = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: r.permissions,
    isSystem: r.isSystem,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    userCount: r._count.users,
  }));

  return NextResponse.json({ roles: mapped });
}

// ─── POST: 역할 생성 ───────────────────────────────────
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const body = await request.json();
  const { name, description } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "역할명은 필수입니다" },
      { status: 400 },
    );
  }

  // 동일 tenant + name 중복 검사
  const existing = await prisma.role.findUnique({
    where: { tenantId_name: { tenantId, name: name.trim() } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 동일한 이름의 역할이 존재합니다" },
      { status: 409 },
    );
  }

  const role = await prisma.role.create({
    data: {
      tenantId,
      name: name.trim(),
      description: description || null,
      permissions: [],
      isSystem: false,
    },
  });

  return NextResponse.json({ role }, { status: 201 });
}
