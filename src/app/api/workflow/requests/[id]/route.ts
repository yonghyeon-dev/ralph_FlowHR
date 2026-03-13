import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = token.tenantId;

  const approvalRequest = await prisma.approvalRequest.findFirst({
    where: { id, tenantId },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          employeeNumber: true,
          department: { select: { name: true } },
          position: { select: { name: true } },
        },
      },
      workflow: {
        select: {
          id: true,
          name: true,
          steps: true,
        },
      },
      steps: {
        orderBy: { stepOrder: "asc" },
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              position: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!approvalRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const workflowSteps = (approvalRequest.workflow.steps as { order: number; role: string; label: string }[]) ?? [];

  const chain = approvalRequest.steps.map((step) => {
    const wfStep = workflowSteps.find((ws) => ws.order === step.stepOrder);
    return {
      stepOrder: step.stepOrder,
      label: wfStep?.label ?? `단계 ${step.stepOrder}`,
      role: wfStep?.role ?? "",
      approverName: step.approver.name,
      approverPosition: step.approver.position?.name ?? "",
      status: step.status,
      comment: step.comment,
      actionAt: step.actionAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({
    data: {
      id: approvalRequest.id,
      title: approvalRequest.title,
      description: approvalRequest.description,
      status: approvalRequest.status,
      priority: approvalRequest.priority,
      requestType: approvalRequest.requestType,
      data: approvalRequest.data,
      createdAt: approvalRequest.createdAt.toISOString(),
      completedAt: approvalRequest.completedAt?.toISOString() ?? null,
      escalatedAt: approvalRequest.escalatedAt?.toISOString() ?? null,
      requester: {
        id: approvalRequest.requester.id,
        name: approvalRequest.requester.name,
        employeeNumber: approvalRequest.requester.employeeNumber,
        department: approvalRequest.requester.department?.name ?? "",
        position: approvalRequest.requester.position?.name ?? "",
      },
      workflow: {
        id: approvalRequest.workflow.id,
        name: approvalRequest.workflow.name,
      },
      chain,
    },
  });
}
