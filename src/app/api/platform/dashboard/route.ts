import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ─── KPI 1: 활성 테넌트 ─────────────────────────────────
  const activeTenants = await prisma.tenant.count({
    where: { status: "ACTIVE" },
  });
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTenants = await prisma.tenant.count({
    where: { status: "ACTIVE", createdAt: { gte: sevenDaysAgo } },
  });

  // ─── KPI 2: 유예 고객 ──────────────────────────────────
  const suspendedTenants = await prisma.tenant.count({
    where: { status: "SUSPENDED" },
  });

  // ─── KPI 3: 결제 실패 (mock — BillingAccount 미구현) ───
  const paymentFailures = 3;

  // ─── KPI 4: 미해결 지원 (mock — SupportTicket 미구현) ──
  const openTickets = 8;
  const slaViolations = 2;

  // ─── 운영 대기열 ────────────────────────────────────────
  interface QueueItemData {
    priority: "critical" | "high" | "medium" | "low";
    title: string;
    meta: string;
    actionLabel: string;
  }

  const opsQueue: QueueItemData[] = [];

  if (suspendedTenants > 0) {
    opsQueue.push({
      priority: "critical",
      title: `결제 유예 테넌트 ${suspendedTenants}건`,
      meta: "자동 정지 전 확인 필요",
      actionLabel: "확인",
    });
  }

  if (paymentFailures > 0) {
    opsQueue.push({
      priority: "high",
      title: `결제 실패 재시도 ${paymentFailures}건`,
      meta: "최근 7일 · 카드 만료 포함",
      actionLabel: "처리",
    });
  }

  if (slaViolations > 0) {
    opsQueue.push({
      priority: "high",
      title: `SLA 위반 티켓 ${slaViolations}건`,
      meta: "응답 시간 초과 · 에스컬레이션 필요",
      actionLabel: "조치",
    });
  }

  const expiredTenants = await prisma.tenant.count({
    where: { status: "EXPIRED" },
  });
  if (expiredTenants > 0) {
    opsQueue.push({
      priority: "medium",
      title: `만료 테넌트 정리 ${expiredTenants}건`,
      meta: "데이터 보존 기간 확인",
      actionLabel: "검토",
    });
  }

  opsQueue.push({
    priority: "low",
    title: "시스템 점검 알림 예약",
    meta: "다음 정기 점검 · 테넌트 공지 발송",
    actionLabel: "예약",
  });

  // ─── 플랫폼 헬스 시그널 ─────────────────────────────────
  const healthSignals = [
    { label: "API 성공률", value: 99.7, variant: "success" as const },
    { label: "Webhook 전송", value: 98.2, variant: "success" as const },
    { label: "SSO 인증", value: 94.5, variant: "warning" as const },
    { label: "데이터 동기화", value: 99.1, variant: "success" as const },
  ];

  // ─── 최근 테넌트 변경 ───────────────────────────────────
  const recentChanges = await prisma.tenant.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      name: true,
      plan: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const tenantChanges = recentChanges.map((t) => {
    const isNew =
      t.createdAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
    const action = isNew
      ? `${t.plan} 플랜으로 가입`
      : `${t.plan} 플랜 · 상태 ${t.status}`;
    return {
      company: t.name,
      action,
      time: t.updatedAt.toISOString(),
    };
  });

  // ─── 보안 시그널 ────────────────────────────────────────
  const securitySignals = [
    { label: "비정상 로그인 시도", value: 7, variant: "danger" as const },
    { label: "MFA 미설정 운영자", value: 2, variant: "warning" as const },
    { label: "만료 예정 인증서", value: 1, variant: "info" as const },
    { label: "API 키 만료 예정", value: 3, variant: "warning" as const },
    { label: "IP 차단 이벤트 (24h)", value: 14, variant: "neutral" as const },
  ];

  return NextResponse.json({
    kpi: {
      activeTenants: { value: activeTenants, delta: recentTenants },
      suspendedTenants: { value: suspendedTenants },
      paymentFailures: { value: paymentFailures },
      openTickets: { value: openTickets, slaViolations },
    },
    opsQueue,
    healthSignals,
    tenantChanges,
    securitySignals,
  });
}
