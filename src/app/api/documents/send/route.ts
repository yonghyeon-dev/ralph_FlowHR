import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// ─── POST: 문서 발송 ──────────────────────────────────
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId || !token.employeeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const senderId = token.employeeId as string;

  const body = await request.json();
  const {
    templateId,
    recipientIds,
    deadline,
    memo,
    notifyEmail,
    notifyReminder,
    isDraft,
  } = body;

  if (!templateId) {
    return NextResponse.json(
      { error: "문서 템플릿을 선택해주세요" },
      { status: 400 },
    );
  }

  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return NextResponse.json(
      { error: "수신자를 1명 이상 선택해주세요" },
      { status: 400 },
    );
  }

  // 템플릿 조회
  const template = await prisma.documentTemplate.findFirst({
    where: { id: templateId, tenantId, isActive: true },
  });

  if (!template) {
    return NextResponse.json(
      { error: "유효하지 않은 템플릿입니다" },
      { status: 404 },
    );
  }

  // 수신자 유효성 검증
  const recipients = await prisma.employee.findMany({
    where: { id: { in: recipientIds }, tenantId },
    select: { id: true, name: true },
  });

  if (recipients.length !== recipientIds.length) {
    return NextResponse.json(
      { error: "유효하지 않은 수신자가 포함되어 있습니다" },
      { status: 400 },
    );
  }

  const status = isDraft ? "DRAFT" : "SENT";
  const sentAt = isDraft ? undefined : new Date();

  // 각 수신자별 문서 생성
  const documents = await prisma.$transaction(
    recipientIds.map((recipientId: string) =>
      prisma.document.create({
        data: {
          tenantId,
          templateId,
          senderId,
          recipientId,
          title: template.name,
          status,
          deadline: deadline ? new Date(deadline) : null,
          sentAt,
          memo: memo?.trim() || null,
          notifyEmail: notifyEmail ?? true,
          notifyReminder: notifyReminder ?? false,
        },
        include: {
          recipient: { select: { id: true, name: true } },
        },
      }),
    ),
  );

  // 템플릿 사용 횟수 증가
  await prisma.documentTemplate.update({
    where: { id: templateId },
    data: { usageCount: { increment: recipientIds.length } },
  });

  return NextResponse.json(
    {
      documents,
      message: isDraft
        ? `${documents.length}건 임시 저장 완료`
        : `${documents.length}건 발송 완료`,
    },
    { status: 201 },
  );
}
