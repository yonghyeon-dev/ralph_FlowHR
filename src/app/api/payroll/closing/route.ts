import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { PayrollRunStatus } from "@prisma/client";

const STATUS_STEP_MAP: Record<PayrollRunStatus, number> = {
  DRAFT: 0,
  DATA_COLLECTION: 1,
  CHANGE_REVIEW: 2,
  CALCULATION: 3,
  REVIEW: 4,
  CONFIRMED: 5,
  CANCELLED: 0,
};

const VALID_TRANSITIONS: Record<PayrollRunStatus, PayrollRunStatus | null> = {
  DRAFT: "DATA_COLLECTION",
  DATA_COLLECTION: "CHANGE_REVIEW",
  CHANGE_REVIEW: "CALCULATION",
  CALCULATION: "REVIEW",
  REVIEW: "CONFIRMED",
  CONFIRMED: null,
  CANCELLED: null,
};

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const { searchParams } = request.nextUrl;

  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  // Get or create PayrollRun for the month
  let payrollRun = await prisma.payrollRun.findUnique({
    where: { tenantId_year_month: { tenantId, year, month } },
  });

  if (!payrollRun) {
    const totalEmployees = await prisma.employee.count({
      where: { tenantId, status: "ACTIVE" },
    });
    payrollRun = await prisma.payrollRun.create({
      data: { tenantId, year, month, status: "DRAFT", currentStep: 1, totalEmployees },
    });
  }

  const currentStep = STATUS_STEP_MAP[payrollRun.status] || payrollRun.currentStep;

  // Build checklist from actual data
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // 1. Attendance data sync
  const attendanceCount = await prisma.attendanceRecord.count({
    where: { tenantId, date: { gte: monthStart, lte: monthEnd } },
  });

  // 2. Employee changes (promotions, adjustments, new hires)
  const employeeChanges = await prisma.employeeChange.groupBy({
    by: ["type"],
    where: { tenantId, effectiveDate: { gte: monthStart, lte: monthEnd } },
    _count: true,
  });

  const changeSummary = employeeChanges.map((c) => {
    const typeLabel: Record<string, string> = {
      PROMOTION: "승진",
      SALARY_ADJUSTMENT: "연봉 조정",
      NEW_HIRE: "신규 입사",
      TRANSFER: "부서 이동",
      TERMINATION: "퇴사",
    };
    return `${typeLabel[c.type] ?? c.type} ${c._count}명`;
  });
  const totalChanges = employeeChanges.reduce((sum, c) => sum + c._count, 0);

  // 3. Pending exceptions (unresolved corrections)
  const pendingExceptions = await prisma.attendanceException.count({
    where: {
      tenantId,
      status: "PENDING",
      date: { gte: monthStart, lte: monthEnd },
    },
  });

  // 4. Payroll calculation (based on payslip count)
  const payslipCount = await prisma.payslip.count({
    where: { payrollRunId: payrollRun.id },
  });

  // 5. Department review
  const departments = await prisma.department.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const totalDepartments = departments.length;
  let approvedDepartments = 0;
  if (payrollRun.status === "CONFIRMED") {
    approvedDepartments = totalDepartments;
  } else if (payrollRun.status === "REVIEW") {
    approvedDepartments = Math.ceil(totalDepartments / 2);
  }

  type ChecklistItemStatus = "complete" | "pending" | "progress" | "not_started";

  interface ChecklistItem {
    id: string;
    title: string;
    meta: string;
    status: ChecklistItemStatus;
    statusLabel: string;
    priority: "low" | "medium" | "high" | "critical";
  }

  const isStepDone = (step: number): boolean => currentStep > step;
  const isStepActive = (step: number): boolean => currentStep === step;

  const checklist: ChecklistItem[] = [
    {
      id: "attendance_sync",
      title: "근태 데이터 연동 완료",
      meta:
        attendanceCount > 0
          ? `${attendanceCount.toLocaleString()}명 출퇴근 기록 수집 완료`
          : "근태 데이터 수집 대기 중",
      status: isStepDone(1) ? "complete" : isStepActive(1) ? "progress" : "not_started",
      statusLabel: isStepDone(1) ? "완료" : isStepActive(1) ? "수집 중" : "대기",
      priority: "low",
    },
    {
      id: "employee_changes",
      title: "인사 변동 반영",
      meta:
        totalChanges > 0
          ? changeSummary.join(", ")
          : "변동 사항 없음",
      status: isStepDone(2) ? "complete" : isStepActive(2) ? "progress" : "not_started",
      statusLabel: isStepDone(2) ? "완료" : isStepActive(2) ? "확인 중" : "대기",
      priority: "low",
    },
    {
      id: "pending_corrections",
      title: "미확인 변동 사항 처리",
      meta:
        pendingExceptions > 0
          ? `수동 보정 ${pendingExceptions}건 (체크아웃 누락 보정, 초과근무 재확인)`
          : "미확인 변동 사항 없음",
      status: pendingExceptions === 0 && isStepDone(2) ? "complete" : pendingExceptions > 0 ? "progress" : "not_started",
      statusLabel:
        pendingExceptions === 0 && isStepDone(2) ? "완료" : pendingExceptions > 0 ? "처리 중" : "대기",
      priority: pendingExceptions > 0 ? "high" : "medium",
    },
    {
      id: "payroll_calculation",
      title: "급여 계산 실행",
      meta: `전체 ${payrollRun.totalEmployees.toLocaleString()}명 급여 산출${payslipCount > 0 ? ` (${payslipCount}건 완료)` : ""}`,
      status: isStepDone(3) ? "complete" : isStepActive(3) ? "progress" : "not_started",
      statusLabel: isStepDone(3) ? "완료" : isStepActive(3) ? "계산 중" : "대기",
      priority: "medium",
    },
    {
      id: "department_review",
      title: "부서장 검토 및 서명",
      meta:
        totalDepartments > 0
          ? `${totalDepartments}개 부서${approvedDepartments > 0 ? ` 중 ${approvedDepartments}개 승인 완료` : " 부서장 확인 필요"}`
          : "부서 정보 없음",
      status:
        approvedDepartments === totalDepartments && totalDepartments > 0
          ? "complete"
          : approvedDepartments > 0
            ? "progress"
            : isStepActive(4) ? "pending" : "not_started",
      statusLabel:
        approvedDepartments === totalDepartments && totalDepartments > 0
          ? "완료"
          : approvedDepartments > 0
            ? `${approvedDepartments}/${totalDepartments}`
            : "대기",
      priority: "medium",
    },
  ];

  return NextResponse.json({
    year,
    month,
    status: payrollRun.status,
    currentStep,
    totalSteps: 5,
    totalEmployees: payrollRun.totalEmployees,
    totalAmount: payrollRun.totalAmount,
    confirmedBy: payrollRun.confirmedBy,
    confirmedAt: payrollRun.confirmedAt
      ? new Date(payrollRun.confirmedAt).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : null,
    checklist,
  });
}

export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId || !token.employeeNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const body = await request.json();
  const { year, month, action } = body as {
    year: number;
    month: number;
    action: "advance";
  };

  if (!year || !month || action !== "advance") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const payrollRun = await prisma.payrollRun.findUnique({
    where: { tenantId_year_month: { tenantId, year, month } },
  });

  if (!payrollRun) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextStatus = VALID_TRANSITIONS[payrollRun.status];
  if (!nextStatus) {
    return NextResponse.json(
      { error: "Cannot transition from current status" },
      { status: 409 },
    );
  }

  const nextStep = STATUS_STEP_MAP[nextStatus] ?? payrollRun.currentStep + 1;

  const updateData: {
    status: PayrollRunStatus;
    currentStep: number;
    confirmedBy?: string;
    confirmedAt?: Date;
  } = { status: nextStatus, currentStep: nextStep };

  if (nextStatus === "CONFIRMED") {
    updateData.confirmedBy = token.employeeNumber as string;
    updateData.confirmedAt = new Date();
  }

  const updated = await prisma.payrollRun.update({
    where: { id: payrollRun.id },
    data: updateData,
  });

  return NextResponse.json({
    status: updated.status,
    currentStep: updated.currentStep,
    confirmedBy: updated.confirmedBy,
    confirmedAt: updated.confirmedAt,
  });
}
