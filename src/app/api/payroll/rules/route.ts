import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// ─── GET: 급여 규칙 목록 조회 ────────────────────────────
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const rules = await prisma.payrollRule.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      formula: true,
      rate: true,
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ rules });
}

// ─── POST: 급여 규칙 생성 ───────────────────────────────
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const body = await request.json();
  const { name, type, description, formula, rate } = body;

  if (!name || !type || !formula) {
    return NextResponse.json(
      { error: "규칙명, 유형, 계산 방식은 필수입니다" },
      { status: 400 },
    );
  }

  const validTypes = ["FIXED", "VARIABLE", "DEDUCTION"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: "유효하지 않은 규칙 유형입니다" },
      { status: 400 },
    );
  }

  // 동일 tenant + name 중복 검사
  const existing = await prisma.payrollRule.findUnique({
    where: { tenantId_name: { tenantId, name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 동일한 이름의 규칙이 존재합니다" },
      { status: 409 },
    );
  }

  // 다음 sortOrder 계산
  const maxSort = await prisma.payrollRule.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  });
  const nextSort = (maxSort._max.sortOrder ?? 0) + 1;

  const rule = await prisma.payrollRule.create({
    data: {
      tenantId,
      name,
      type,
      description: description || null,
      formula,
      rate: rate !== undefined && rate !== null ? Number(rate) : null,
      sortOrder: nextSort,
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
