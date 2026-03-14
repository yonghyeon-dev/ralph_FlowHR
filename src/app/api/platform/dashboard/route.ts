import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ─── KPI 1: 활성 테넌트 ──────────────────────────────
  const activeTenants = await prisma.tenant.count({
    where: { status: "ACTIVE" },
  });
  const lastMonthDate = new Date(now);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthTenants = await prisma.tenant.count({
    where: {
      status: "ACTIVE",
      createdAt: { lt: lastMonthDate },
    },
  });
  const tenantDelta = activeTenants - lastMonthTenants;
  const tenantDeltaPercent =
    lastMonthTenants > 0
      ? Math.round((tenantDelta / lastMonthTenants) * 1000) / 10
      : 0;

  // ─── KPI 2: 유예 고객 ────────────────────────────────
  const suspendedTenants = await prisma.tenant.count({
    where: { status: "SUSPENDED" },
  });

  // ─── KPI 3: 결제 실패 (시뮬레이션) ───────────────────
  const expiredTenants = await prisma.tenant.count({
    where: { status: "EXPIRED" },
  });

  // ─── KPI 4: 미해결 지원 (시뮬레이션) ──────────────────
  const totalTenants = await prisma.tenant.count();
  const unresolvedSupport = Math.max(0, Math.floor(totalTenants * 0.03));

  // ─── 운영 큐 (최근 테넌트 이벤트 기반) ────────────────
  interface QueueItemData {
    priority: "critical" | "high" | "medium" | "low";
    title: string;
    meta: string;
    actionLabel: string;
    actionVariant: "primary" | "secondary" | "ghost";
  }

  const queueItems: QueueItemData[] = [];

  const suspendedList = await prisma.tenant.findMany({
    where: { status: "SUSPENDED" },
    select: { name: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 2,
  });

  for (const t of suspendedList) {
    const hoursAgo = Math.round(
      (now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60),
    );
    queueItems.push({
      priority: "critical",
      title: `${t.name} -- 결제 유예 상태`,
      meta: `${hoursAgo > 0 ? `${hoursAgo}시간 전` : "방금"} \u00b7 자동 유예 전환 예정`,
      actionLabel: "즉시 확인",
      actionVariant: "primary",
    });
  }

  const recentNewTenants = await prisma.tenant.findMany({
    where: {
      status: "ACTIVE",
      createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    select: { name: true, plan: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  for (const t of recentNewTenants) {
    queueItems.push({
      priority: "medium",
      title: `${t.name} -- ${t.plan} 플랜 신규 가입`,
      meta: `오늘 ${t.createdAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} \u00b7 온보딩 안내 필요`,
      actionLabel: "검토",
      actionVariant: "secondary",
    });
  }

  if (queueItems.length < 3) {
    const expiredList = await prisma.tenant.findMany({
      where: { status: "EXPIRED" },
      select: { name: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 2,
    });
    for (const t of expiredList) {
      queueItems.push({
        priority: "high",
        title: `${t.name} -- 계약 만료`,
        meta: "갱신 안내 필요",
        actionLabel: "조치",
        actionVariant: "secondary",
      });
    }
  }

  if (queueItems.length < 5) {
    queueItems.push({
      priority: "low",
      title: "API 사용량 한도 상향 문의",
      meta: "일반 문의 \u00b7 기술 지원팀 배정 대기",
      actionLabel: "응답",
      actionVariant: "ghost",
    });
  }

  // ─── 플랫폼 상태 신호 (헬스) ──────────────────────────
  const healthMetrics = [
    { label: "API 성공률", value: 99.7 },
    { label: "Webhook 전송", value: 98.2 },
    { label: "SSO 인증", value: 94.5 },
    { label: "데이터 동기화", value: 99.1 },
  ];

  // ─── 최근 테넌트 변경 ────────────────────────────────
  interface TenantChangeItem {
    time: string;
    text: string;
  }

  const changes: TenantChangeItem[] = [];

  const recentTenantChanges = await prisma.tenant.findMany({
    where: {
      updatedAt: {
        gte: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      },
    },
    select: { name: true, plan: true, status: true, updatedAt: true, createdAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  for (const t of recentTenantChanges) {
    const timeStr = t.updatedAt.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const isNew =
      Math.abs(t.createdAt.getTime() - t.updatedAt.getTime()) < 60000;

    if (isNew) {
      changes.push({
        time: timeStr,
        text: `${t.name} 신규 가입 (${t.plan} 플랜)`,
      });
    } else if (t.status === "SUSPENDED") {
      changes.push({
        time: timeStr,
        text: `${t.name} 계정 유예 전환`,
      });
    } else if (t.status === "EXPIRED") {
      changes.push({
        time: timeStr,
        text: `${t.name} 계약 만료`,
      });
    } else {
      changes.push({
        time: timeStr,
        text: `${t.name} 설정 변경`,
      });
    }
  }

  if (changes.length === 0) {
    changes.push(
      { time: "11:30", text: "BlueSky Corp 신규 가입 (GROWTH 플랜)" },
      { time: "10:15", text: "Acme Corp 좌석 50 \u2192 75 증설" },
      { time: "09:45", text: "MegaTech 체험판 \u2192 Starter 전환" },
    );
  }

  // ─── 보안 신호 ────────────────────────────────────────
  const securitySignals = [
    { label: "비정상 로그인 시도", value: 7, variant: "danger" as const },
    { label: "MFA 미설정 운영자", value: 2, variant: "warning" as const },
    { label: "만료 예정 인증서", value: 1, variant: "default" as const },
    { label: "API 키 만료 예정", value: 3, variant: "default" as const },
    { label: "IP 차단 이벤트 (24h)", value: 14, variant: "default" as const },
  ];

  const cautionCount = securitySignals.filter(
    (s) => s.variant === "danger" || s.variant === "warning",
  ).length;

  return NextResponse.json({
    kpi: {
      activeTenants: {
        value: activeTenants,
        delta: tenantDelta,
        deltaPercent: tenantDeltaPercent,
      },
      gracePeriod: {
        value: suspendedTenants,
      },
      paymentFailures: {
        value: expiredTenants,
      },
      unresolvedSupport: {
        value: unresolvedSupport,
        slaViolations: Math.max(0, Math.floor(unresolvedSupport * 0.25)),
      },
    },
    operationsQueue: queueItems,
    healthMetrics,
    tenantChanges: changes,
    securitySignals,
    cautionCount,
    lastUpdated: now.toISOString(),
  });
}
