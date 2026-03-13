import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// ─── GET: 채용 공고 목록 조회 ────────────────────────────
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const postings = await prisma.jobPosting.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      departmentId: true,
      positionId: true,
      hiringManagerId: true,
      status: true,
      description: true,
      requirements: true,
      location: true,
      employmentType: true,
      headcount: true,
      openDate: true,
      closeDate: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { applications: true },
      },
    },
  });

  return NextResponse.json({ postings });
}

// ─── POST: 채용 공고 생성 ───────────────────────────────
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const body = await request.json();
  const {
    title,
    departmentId,
    positionId,
    hiringManagerId,
    status,
    description,
    requirements,
    location,
    employmentType,
    headcount,
    openDate,
    closeDate,
  } = body;

  if (!title || !hiringManagerId) {
    return NextResponse.json(
      { error: "title, hiringManagerId는 필수입니다" },
      { status: 400 },
    );
  }

  const validStatuses = ["DRAFT", "OPEN", "CLOSED", "CANCELLED"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "유효하지 않은 공고 상태입니다" },
      { status: 400 },
    );
  }

  const validTypes = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"];
  if (employmentType && !validTypes.includes(employmentType)) {
    return NextResponse.json(
      { error: "유효하지 않은 고용 유형입니다" },
      { status: 400 },
    );
  }

  // 동일 tenant + title 중복 검사
  const existing = await prisma.jobPosting.findUnique({
    where: { tenantId_title: { tenantId, title: title.trim() } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 동일한 제목의 공고가 존재합니다" },
      { status: 409 },
    );
  }

  const posting = await prisma.jobPosting.create({
    data: {
      tenantId,
      title: title.trim(),
      departmentId: departmentId || null,
      positionId: positionId || null,
      hiringManagerId,
      status: status || "DRAFT",
      description: description?.trim() || null,
      requirements: requirements?.trim() || null,
      location: location?.trim() || null,
      employmentType: employmentType || "FULL_TIME",
      headcount: Number(headcount ?? 1),
      openDate: openDate ? new Date(openDate) : null,
      closeDate: closeDate ? new Date(closeDate) : null,
    },
  });

  return NextResponse.json({ posting }, { status: 201 });
}
