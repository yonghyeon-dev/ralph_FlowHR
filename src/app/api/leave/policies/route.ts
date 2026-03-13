import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// ─── GET: 휴가 정책 목록 조회 ────────────────────────────
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const policies = await prisma.leavePolicy.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      defaultDays: true,
      carryOverLimit: true,
      requiresApproval: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ policies });
}

// ─── POST: 휴가 정책 생성 ───────────────────────────────
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const body = await request.json();
  const { name, type, description, defaultDays, carryOverLimit, requiresApproval } = body;

  if (!name || !type || defaultDays === undefined) {
    return NextResponse.json(
      { error: "name, type, defaultDays는 필수입니다" },
      { status: 400 },
    );
  }

  const validTypes = ["ANNUAL", "HALF_DAY", "SICK", "FAMILY_EVENT", "COMPENSATORY"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: "유효하지 않은 휴가 유형입니다" },
      { status: 400 },
    );
  }

  // 동일 tenant + type 중복 검사
  const existing = await prisma.leavePolicy.findUnique({
    where: { tenantId_type: { tenantId, type } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 해당 유형의 정책이 존재합니다" },
      { status: 409 },
    );
  }

  const policy = await prisma.leavePolicy.create({
    data: {
      tenantId,
      name,
      type,
      description: description || null,
      defaultDays: Number(defaultDays),
      carryOverLimit: Number(carryOverLimit ?? 0),
      requiresApproval: requiresApproval !== false,
    },
  });

  return NextResponse.json({ policy }, { status: 201 });
}
