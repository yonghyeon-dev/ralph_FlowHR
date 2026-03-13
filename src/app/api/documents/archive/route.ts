import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { Prisma, DocumentStatus } from "@prisma/client";

const VALID_STATUSES: DocumentStatus[] = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "SIGNED",
  "EXPIRED",
  "CANCELLED",
];

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId;
  const { searchParams } = request.nextUrl;

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const sortKey = searchParams.get("sortKey") ?? "sentAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)),
  );

  const where: Prisma.DocumentWhereInput = {
    tenantId,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { recipient: { name: { contains: search, mode: "insensitive" } } },
      { sender: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (status && VALID_STATUSES.includes(status as DocumentStatus)) {
    where.status = status as DocumentStatus;
  }

  type OrderByType = Prisma.DocumentOrderByWithRelationInput;
  let orderBy: OrderByType;

  switch (sortKey) {
    case "title":
      orderBy = { title: sortDir };
      break;
    case "recipientName":
      orderBy = { recipient: { name: sortDir } };
      break;
    case "status":
      orderBy = { status: sortDir };
      break;
    case "deadline":
      orderBy = { deadline: sortDir };
      break;
    default:
      orderBy = { sentAt: sortDir };
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, category: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ]);

  const data = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    senderName: doc.sender.name,
    recipientName: doc.recipient.name,
    recipientId: doc.recipient.id,
    templateName: doc.template.name,
    templateCategory: doc.template.category,
    templateId: doc.templateId,
    status: doc.status,
    sentAt: doc.sentAt?.toISOString() ?? null,
    viewedAt: doc.viewedAt?.toISOString() ?? null,
    completedAt: doc.completedAt?.toISOString() ?? null,
    deadline: doc.deadline?.toISOString() ?? null,
    memo: doc.memo,
    notifyEmail: doc.notifyEmail,
    notifyReminder: doc.notifyReminder,
  }));

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

// ─── Resend document ───────────────────────────────────────

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId;
  const body = await request.json();
  const { documentId } = body as { documentId: string };

  if (!documentId) {
    return NextResponse.json(
      { error: "documentId가 필요합니다" },
      { status: 400 },
    );
  }

  const original = await prisma.document.findFirst({
    where: { id: documentId, tenantId },
  });

  if (!original) {
    return NextResponse.json(
      { error: "문서를 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const resent = await prisma.document.create({
    data: {
      tenantId,
      templateId: original.templateId,
      senderId: original.senderId,
      recipientId: original.recipientId,
      title: original.title,
      status: "SENT",
      deadline: original.deadline,
      sentAt: new Date(),
      memo: original.memo,
      notifyEmail: original.notifyEmail,
      notifyReminder: original.notifyReminder,
    },
  });

  return NextResponse.json({
    message: "문서가 재발송되었습니다",
    documentId: resent.id,
  });
}
