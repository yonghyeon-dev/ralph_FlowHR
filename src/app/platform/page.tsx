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
} from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface KPIValue {
  value: number;
  delta?: number;
  deltaPercent?: number;
  slaViolations?: number;
}

interface QueueItemData {
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  meta: string;
  actionLabel: string;
  actionVariant: "primary" | "secondary" | "ghost";
}

interface HealthMetric {
  label: string;
  value: number;
}

interface TenantChangeItem {
  time: string;
  text: string;
}

interface SecuritySignal {
  label: string;
  value: number;
  variant: "danger" | "warning" | "default";
}

interface DashboardData {
  kpi: {
    activeTenants: KPIValue;
    gracePeriod: KPIValue;
    paymentFailures: KPIValue;
    unresolvedSupport: KPIValue;
  };
  operationsQueue: QueueItemData[];
  healthMetrics: HealthMetric[];
  tenantChanges: TenantChangeItem[];
  securitySignals: SecuritySignal[];
  cautionCount: number;
  lastUpdated: string;
}

// ─── Helpers ────────────────────────────────────────────────

function StatRow({
  label,
  value,
  badge,
}: {
  label: string;
  value?: string;
  badge?: { text: string; variant: BadgeVariant };
}) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle py-sp-3 last:border-b-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="flex items-center gap-sp-2">
        {value && (
          <span className="text-sm font-semibold text-text-primary">
            {value}
          </span>
        )}
        {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
      </span>
    </div>
  );
}

function HealthBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const isWarning = value < 95;
  return (
    <div className="grid grid-cols-[100px_1fr_40px] items-center gap-sp-3">
      <span className="text-xs text-text-secondary">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
        <div
          className={[
            "h-full rounded-full transition-all",
            isWarning ? "bg-status-warning-solid" : "bg-brand",
          ].join(" ")}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-right text-xs font-medium text-text-primary">
        {value}%
      </span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

export default function PlatformHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">
            불러오는 중...
          </span>
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
        <span className="text-sm text-text-tertiary">
          불러오는 중...
        </span>
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

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            플랫폼 운영 콘솔
          </h1>
          <p className="mt-sp-1 text-md text-text-secondary">
            {new Date().toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}{" "}
            · 전체 시스템 현황
          </p>
        </div>
        <div className="flex items-center gap-sp-3">
          <Button variant="secondary">내보내기</Button>
          <Button variant="primary">테넌트 추가</Button>
        </div>
      </div>

      {/* KPI Row (4 cols) */}
      <KPIGrid columns={4}>
        <KPICard
          eyebrow="활성 테넌트"
          value={data.kpi.activeTenants.value}
          label="전월 대비"
          delta={
            data.kpi.activeTenants.delta !== undefined &&
            data.kpi.activeTenants.delta !== 0
              ? `${Math.abs(data.kpi.activeTenants.delta)} (+${data.kpi.activeTenants.deltaPercent}%)`
              : undefined
          }
          deltaDirection={
            (data.kpi.activeTenants.delta ?? 0) > 0
              ? "up"
              : (data.kpi.activeTenants.delta ?? 0) < 0
                ? "down"
                : "neutral"
          }
          emphasis
        />
        <KPICard
          eyebrow="유예 고객"
          value={data.kpi.gracePeriod.value}
          label="결제 유예 상태"
        />
        <KPICard
          eyebrow="결제 실패"
          value={data.kpi.paymentFailures.value}
          label="최근 7일간"
        />
        <KPICard
          eyebrow="미해결 지원"
          value={data.kpi.unresolvedSupport.value}
          label={
            data.kpi.unresolvedSupport.slaViolations
              ? `SLA 위반 ${data.kpi.unresolvedSupport.slaViolations}건`
              : "지원 요청"
          }
        />
      </KPIGrid>

      {/* Operations Queue + Health (2:1) */}
      <div className="mt-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-3">
        {/* Operations Queue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>운영 큐</CardTitle>
            <Button variant="ghost" size="sm">
              전체 보기 →
            </Button>
          </CardHeader>
          <CardBody>
            {data.operationsQueue.length > 0 ? (
              <QueueList>
                {data.operationsQueue.map((item, idx) => (
                  <QueueItem
                    key={idx}
                    priority={item.priority}
                    title={item.title}
                    meta={item.meta}
                    action={
                      <Button
                        variant={
                          item.actionVariant === "primary"
                            ? "primary"
                            : item.actionVariant === "ghost"
                              ? "ghost"
                              : "secondary"
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
                  운영 큐가 비어 있습니다
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Platform Health */}
        <Card>
          <CardHeader>
            <CardTitle>플랫폼 상태 신호</CardTitle>
            <Badge variant="success">정상</Badge>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-sp-3">
              {data.healthMetrics.map((metric) => (
                <HealthBar
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                />
              ))}
            </div>
          </CardBody>
          <CardFooter>
            <span className="text-xs text-text-tertiary">
              마지막 업데이트:{" "}
              {new Date(data.lastUpdated).toLocaleString("ko-KR", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              KST
            </span>
          </CardFooter>
        </Card>
      </div>

      {/* Tenant Changes + Security Signals (1:1) */}
      <div className="mt-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-2">
        {/* Recent Tenant Changes */}
        <Card>
          <CardHeader>
            <CardTitle>최근 테넌트 변경</CardTitle>
          </CardHeader>
          <CardBody>
            {data.tenantChanges.length > 0 ? (
              <div className="relative pl-sp-5">
                {/* Vertical line */}
                <div className="absolute bottom-0 left-[7px] top-0 w-0.5 bg-brand" />
                <div className="flex flex-col gap-sp-4">
                  {data.tenantChanges.map((change, idx) => (
                    <div key={idx} className="relative">
                      {/* Dot */}
                      <div className="absolute -left-sp-5 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand" />
                      <span className="text-xs text-text-tertiary">
                        {change.time}
                      </span>
                      <p className="mt-0.5 text-sm text-text-primary">
                        {change.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  최근 변경 이력이 없습니다
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Security Signals */}
        <Card>
          <CardHeader>
            <CardTitle>보안 신호</CardTitle>
            {data.cautionCount > 0 && (
              <Badge variant="warning">
                주의 {data.cautionCount}
              </Badge>
            )}
          </CardHeader>
          <CardBody>
            {data.securitySignals.map((signal) => (
              <StatRow
                key={signal.label}
                label={signal.label}
                value={`${signal.value}`}
                badge={
                  signal.variant !== "default"
                    ? {
                        text:
                          signal.variant === "danger" ? "위험" : "주의",
                        variant:
                          signal.variant === "danger" ? "danger" : "warning",
                      }
                    : undefined
                }
              />
            ))}
          </CardBody>
          <CardFooter>
            <Button variant="ghost" size="sm">
              감사 로그 전체 보기 →
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
