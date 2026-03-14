"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  KPICard,
  KPIGrid,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  QueueList,
  QueueItem,
  ProgressBar,
  StatusBadge,
} from "@/components/ui";
import type { BadgeVariant, QueuePriority } from "@/components/ui";
import type { ProgressBarVariant } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface KPIValue {
  value: number;
  delta?: number;
  slaViolations?: number;
}

interface QueueItemData {
  priority: QueuePriority;
  title: string;
  meta: string;
  actionLabel: string;
}

interface HealthSignal {
  label: string;
  value: number;
  variant: "success" | "warning" | "danger";
}

interface TenantChange {
  company: string;
  action: string;
  time: string;
}

interface SecuritySignal {
  label: string;
  value: number;
  variant: "danger" | "warning" | "info" | "neutral";
}

interface DashboardData {
  kpi: {
    activeTenants: KPIValue;
    suspendedTenants: KPIValue;
    paymentFailures: KPIValue;
    openTickets: KPIValue;
  };
  opsQueue: QueueItemData[];
  healthSignals: HealthSignal[];
  tenantChanges: TenantChange[];
  securitySignals: SecuritySignal[];
}

// ─── Helpers ────────────────────────────────────────────────

function healthVariantToProgress(
  variant: "success" | "warning" | "danger",
): ProgressBarVariant {
  if (variant === "success") return "success";
  if (variant === "warning") return "warning";
  return "danger";
}

function securityVariantToBadge(
  variant: "danger" | "warning" | "info" | "neutral",
): BadgeVariant {
  if (variant === "neutral") return "info";
  return variant;
}

function formatRelativeTime(isoTime: string): string {
  const diff = Date.now() - new Date(isoTime).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

// ─── Component ──────────────────────────────────────────────

export default function PlatformDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <PlatformDashboardContent />
    </Suspense>
  );
}

function PlatformDashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/dashboard");
      if (res.ok) {
        const json: DashboardData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">
          데이터를 불러올 수 없습니다
        </span>
      </div>
    );
  }

  const nowStr = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            플랫폼 콘솔
          </h1>
          <p className="mt-sp-1 text-md text-text-secondary">
            {nowStr} · 운영 현황
          </p>
        </div>
        <div className="flex items-center gap-sp-3">
          <Button variant="secondary">시스템 공지</Button>
          <Button variant="primary">테넌트 추가</Button>
        </div>
      </div>

      {/* KPI Row (4 cols) */}
      <KPIGrid columns={4}>
        <KPICard
          eyebrow="활성 테넌트"
          value={data.kpi.activeTenants.value}
          label="현재 활성"
          delta={
            data.kpi.activeTenants.delta
              ? `+${data.kpi.activeTenants.delta} 최근 7일`
              : undefined
          }
          deltaDirection={
            (data.kpi.activeTenants.delta ?? 0) > 0 ? "up" : "neutral"
          }
          emphasis
        />
        <KPICard
          eyebrow="유예 고객"
          value={data.kpi.suspendedTenants.value}
          label="결제 유예 상태"
        />
        <KPICard
          eyebrow="결제 실패"
          value={data.kpi.paymentFailures.value}
          label="최근 7일간"
        />
        <KPICard
          eyebrow="미해결 지원"
          value={data.kpi.openTickets.value}
          label={
            data.kpi.openTickets.slaViolations
              ? `SLA 위반 ${data.kpi.openTickets.slaViolations}건`
              : "지원 티켓"
          }
        />
      </KPIGrid>

      {/* Operations Queue + Platform Health (2:1) */}
      <div className="mt-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-3">
        {/* Operations Queue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>운영 대기열</CardTitle>
            <Button variant="ghost" size="sm">
              전체 보기 →
            </Button>
          </CardHeader>
          <CardBody>
            {data.opsQueue.length > 0 ? (
              <QueueList>
                {data.opsQueue.map((item, idx) => (
                  <QueueItem
                    key={idx}
                    priority={item.priority}
                    title={item.title}
                    meta={item.meta}
                    action={
                      <Button
                        variant={
                          item.priority === "critical" ? "primary" : "secondary"
                        }
                        size="sm"
                      >
                        {item.actionLabel}
                      </Button>
                    }
                  />
                ))}
              </QueueList>
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  대기열이 비어 있습니다
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Platform Health Signals */}
        <Card>
          <CardHeader>
            <CardTitle>플랫폼 헬스</CardTitle>
            <StatusBadge variant="success" dot>
              정상
            </StatusBadge>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-sp-4">
              {data.healthSignals.map((signal) => (
                <div key={signal.label}>
                  <div className="mb-sp-1 flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{signal.label}</span>
                    <span className="tabular-nums font-semibold text-text-primary">
                      {signal.value}%
                    </span>
                  </div>
                  <ProgressBar
                    value={signal.value}
                    variant={healthVariantToProgress(signal.variant)}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </CardBody>
          <CardFooter>
            <span className="text-xs text-text-tertiary">
              최종 업데이트: {new Date().toLocaleTimeString("ko-KR")}
            </span>
          </CardFooter>
        </Card>
      </div>

      {/* Tenant Changes + Security Signals (2:1) */}
      <div className="mt-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-3">
        {/* Recent Tenant Changes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>최근 테넌트 변경</CardTitle>
            <Button variant="ghost" size="sm">
              전체 이력 →
            </Button>
          </CardHeader>
          <CardBody>
            {data.tenantChanges.length > 0 ? (
              <div className="flex flex-col">
                {data.tenantChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-sp-3 border-b border-border-subtle py-sp-3 last:border-b-0"
                  >
                    <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-text-primary">
                        {change.company}
                      </span>
                      <p className="text-sm text-text-secondary">
                        {change.action}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-text-tertiary">
                      {formatRelativeTime(change.time)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  최근 변경 내역 없음
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Security Signals */}
        <Card>
          <CardHeader>
            <CardTitle>보안 시그널</CardTitle>
            <Badge variant="danger">주의</Badge>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col">
              {data.securitySignals.map((signal) => (
                <div
                  key={signal.label}
                  className="flex items-center justify-between border-b border-border-subtle py-sp-3 last:border-b-0"
                >
                  <span className="text-sm text-text-secondary">
                    {signal.label}
                  </span>
                  <Badge variant={securityVariantToBadge(signal.variant)}>
                    {signal.value}
                  </Badge>
                </div>
              ))}
            </div>
          </CardBody>
          <CardFooter>
            <Button variant="ghost" size="sm" className="w-full justify-center">
              보안 대시보드 →
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
