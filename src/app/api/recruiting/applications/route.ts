import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// ─── GET: 지원자 목록 조회 (공고별, 파이프라인 스테이지별) ────
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { searchParams } = new URL(request.url);
  const jobPostingId = searchParams.get("jobPostingId");

  const where: Record<string, unknown> = { tenantId };
  if (jobPostingId) {
    where.jobPostingId = jobPostingId;
  }

  const applications = await prisma.application.findMany({
    where,
    orderBy: [{ stage: "asc" }, { appliedAt: "desc" }],
    select: {
      id: true,
      candidateName: true,
      candidateEmail: true,
      candidatePhone: true,
      status: true,
      stage: true,
      rating: true,
      notes: true,
      appliedAt: true,
      hiredAt: true,
      rejectedAt: true,
      jobPostingId: true,
      jobPosting: {
        select: { title: true },
      },
    },
  });

  return NextResponse.json({ applications });
}
