import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// ─── GET: 문서 템플릿 목록 조회 ──────────────────────────
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const templates = await prisma.documentTemplate.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      version: true,
      usageCount: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ templates });
}

// ─── POST: 문서 템플릿 생성 ─────────────────────────────
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const body = await request.json();
  const { name, description, category, content, version } = body;

  if (!name || !category) {
    return NextResponse.json(
      { error: "템플릿명과 카테고리는 필수입니다" },
      { status: 400 },
    );
  }

  const validCategories = ["CONTRACT", "NOTICE", "NDA", "CERTIFICATE"];
  if (!validCategories.includes(category)) {
    return NextResponse.json(
      { error: "유효하지 않은 카테고리입니다" },
      { status: 400 },
    );
  }

  // 동일 tenant + name 중복 검사
  const existing = await prisma.documentTemplate.findUnique({
    where: { tenantId_name: { tenantId, name: name.trim() } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 동일한 이름의 템플릿이 존재합니다" },
      { status: 409 },
    );
  }

  const template = await prisma.documentTemplate.create({
    data: {
      tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      category,
      content: content || {},
      version: version?.trim() || "1.0",
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
