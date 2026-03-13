import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { ApprovalRequestStatus } from "@prisma/client";

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

const VALID_ACTIONS = ["approve", "reject", "hold"] as const;
type ActionType = (typeof VALID_ACTIONS)[number];

const ACTION_STATUS_MAP: Record<ActionType, ApprovalRequestStatus> = {
  approve: "APPROVED",
  reject: "REJECTED",
  hold: "PENDING",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = token.tenantId;
  const body = await request.json();
  const { action, comment } = body as { action: string; comment?: string };

  if (!action || !VALID_ACTIONS.includes(action as ActionType)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const approvalRequest = await prisma.approvalRequest.findFirst({
    where: { id, tenantId },
    include: {
      steps: { orderBy: { stepOrder: "asc" } },
    },
  });

  if (!approvalRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!["PENDING", "IN_PROGRESS", "ESCALATED"].includes(approvalRequest.status)) {
    return NextResponse.json(
      { error: "Already processed" },
      { status: 409 },
    );
  }

  const typedAction = action as ActionType;
  const newStepStatus = ACTION_STATUS_MAP[typedAction];

  // Find the current active step (first non-APPROVED step)
  const activeStep = approvalRequest.steps.find(
    (s) => s.status !== "APPROVED",
  );

  if (!activeStep) {
    return NextResponse.json(
      { error: "No active step" },
      { status: 409 },
    );
  }

  // Update the active step
  await prisma.approvalStep.update({
    where: { id: activeStep.id },
    data: {
      status: newStepStatus,
      comment: comment ?? null,
      actionAt: typedAction === "hold" ? null : new Date(),
    },
  });

  // Determine overall request status
  let requestStatus: ApprovalRequestStatus;

  if (typedAction === "reject") {
    // Rejection ends the entire request
    requestStatus = "REJECTED";
  } else if (typedAction === "hold") {
    // Hold keeps it in progress
    requestStatus = "IN_PROGRESS";
  } else {
    // Approve: check if this was the last step
    const isLastStep =
      activeStep.stepOrder === approvalRequest.steps.length;
    if (isLastStep) {
      requestStatus = "APPROVED";
    } else {
      // Move to next step
      const nextStep = approvalRequest.steps.find(
        (s) => s.stepOrder === activeStep.stepOrder + 1,
      );
      if (nextStep) {
        await prisma.approvalStep.update({
          where: { id: nextStep.id },
          data: { status: "IN_PROGRESS" },
        });
      }
      requestStatus = "IN_PROGRESS";
    }
  }

  const updated = await prisma.approvalRequest.update({
    where: { id },
    data: {
      status: requestStatus,
      completedAt:
        requestStatus === "APPROVED" || requestStatus === "REJECTED"
          ? new Date()
          : undefined,
    },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
  });
}
