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
  BarChart,
  QueueList,
  QueueItem,
} from "@/components/ui";
import type { BadgeVariant, QueuePriority } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface KPIValue {
  value: number;
  delta?: number;
}

interface QueueItemData {
  priority: QueuePriority;
  title: string;
  meta: string;
  actionLabel: string;
}

interface OrgSnapshotDept {
  name: string;
  rate: number;
  present: number;
  total: number;
}

interface FunnelStage {
  stage: string;
  count: number;
}

interface ExceptionMonitorItem {
  type: string;
  label: string;
  count: number;
  priority: QueuePriority;
  meta: string;
}

interface DashboardData {
  kpi: {
    pendingApprovals: KPIValue;
    attendanceIssues: KPIValue;
    overtimeNear: KPIValue;
    unsignedDocs: KPIValue;
    closingBottleneck: KPIValue;
  };
  todayQueue: QueueItemData[];
  orgSnapshot: {
    departments: OrgSnapshotDept[];
    signals: {
      danger: string[];
      warning: string[];
    };
  };
  approvalFunnel: {
    data: FunnelStage[];
    total: number;
    avgProcessDays: number;
    slaOverdue: number;
  };
  exceptionMonitor: ExceptionMonitorItem[];
  documentStatus: {
    unsigned: number;
    urgent: number;
    expiringContracts: number;
  };
  payrollStatus: {
    changes: number;
    currentStep: number;
    currentStatus: string;
    reissueRequests: number;
  };
}

// ─── Stat row helper ────────────────────────────────────────

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
          <span className="text-sm font-semibold text-text-primary">{value}</span>
        )}
        {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
      </span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

export default function AdminHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}

function AdminDashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
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

  const todayStr = new Date().toLocaleDateString("ko-KR", {
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
            안녕하세요, 관리자님
          </h1>
          <p className="mt-sp-1 text-md text-text-secondary">
            {todayStr} · HR 현황 요약
          </p>
        </div>
        <div className="flex items-center gap-sp-3">
          <Button variant="secondary">내보내기</Button>
          <Button variant="primary">빠른 등록</Button>
        </div>
      </div>

      {/* KPI Row (5 cols) */}
      <KPIGrid columns={5}>
        <KPICard
          eyebrow="승인 필요"
          value={data.kpi.pendingApprovals.value}
          label="오늘 승인 필요"
          delta={
            data.kpi.pendingApprovals.delta !== undefined &&
            data.kpi.pendingApprovals.delta !== 0
              ? `${Math.abs(data.kpi.pendingApprovals.delta)}건 전일 대비`
              : undefined
          }
          deltaDirection={
            (data.kpi.pendingApprovals.delta ?? 0) > 0
              ? "up"
              : (data.kpi.pendingApprovals.delta ?? 0) < 0
                ? "down"
                : "neutral"
          }
          emphasis
        />
        <KPICard
          eyebrow="근태 이상"
          value={data.kpi.attendanceIssues.value}
          label="체크아웃 누락"
          delta={
            data.kpi.attendanceIssues.delta !== undefined &&
            data.kpi.attendanceIssues.delta !== 0
              ? `${Math.abs(data.kpi.attendanceIssues.delta)}건 전일 대비`
              : undefined
          }
          deltaDirection={
            (data.kpi.attendanceIssues.delta ?? 0) > 0
              ? "up"
              : (data.kpi.attendanceIssues.delta ?? 0) < 0
                ? "down"
                : "neutral"
          }
        />
        <KPICard
          eyebrow="근로 시간"
          value={data.kpi.overtimeNear.value}
          label="초과근무 임박"
        />
        <KPICard
          eyebrow="문서"
          value={data.kpi.unsignedDocs.value}
          label="서명 대기"
          delta={
            data.kpi.unsignedDocs.delta !== undefined &&
            data.kpi.unsignedDocs.delta !== 0
              ? `${Math.abs(data.kpi.unsignedDocs.delta)}건 전일 대비`
              : undefined
          }
          deltaDirection={
            (data.kpi.unsignedDocs.delta ?? 0) > 0
              ? "up"
              : (data.kpi.unsignedDocs.delta ?? 0) < 0
                ? "down"
                : "neutral"
          }
        />
        <KPICard
          eyebrow="마감"
          value={data.kpi.closingBottleneck.value}
          label="마감 병목"
        />
      </KPIGrid>

      {/* Today Queue + Org Snapshot (2:1) */}
      <div className="mt-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-3">
        {/* Today Queue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>오늘의 대기열</CardTitle>
            <Button variant="ghost" size="sm">
              전체 보기 →
            </Button>
          </CardHeader>
          <CardBody>
            {data.todayQueue.length > 0 ? (
              <QueueList>
                {data.todayQueue.map((item, idx) => (
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

        {/* Org Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle>조직 스냅샷</CardTitle>
            <span className="text-sm text-text-tertiary">부서별 현황</span>
          </CardHeader>
          <CardBody>
            {data.orgSnapshot.departments.length > 0 ? (
              <>
                <BarChart
                  data={data.orgSnapshot.departments.map((d) => ({
                    name: d.name,
                    value: d.rate,
                  }))}
                  layout="vertical"
                  height={Math.max(
                    160,
                    data.orgSnapshot.departments.length * 40,
                  )}
                  showTooltip
                />
                <div className="mt-sp-4">
                  {data.orgSnapshot.signals.danger.length > 0 && (
                    <StatRow
                      label="위험 신호"
                      badge={{
                        text: data.orgSnapshot.signals.danger.join(", "),
                        variant: "danger",
                      }}
                    />
                  )}
                  {data.orgSnapshot.signals.warning.length > 0 && (
                    <StatRow
                      label="주의 관찰"
                      badge={{
                        text: data.orgSnapshot.signals.warning.join(", "),
                        variant: "warning",
                      }}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  부서 데이터 없음
                </span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Approval Funnel + Exception Monitor (1:1) */}
      <div className="mt-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-2">
        {/* Approval Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>승인 퍼널</CardTitle>
            <Badge variant="info">이번 주</Badge>
          </CardHeader>
          <CardBody>
            {data.approvalFunnel.total > 0 ? (
              <BarChart
                data={data.approvalFunnel.data.map((f) => ({
                  name: f.stage,
                  value: f.count,
                }))}
                layout="vertical"
                height={200}
                showTooltip
              />
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  승인 요청이 없습니다
                </span>
              </div>
            )}
          </CardBody>
          <CardFooter>
            <span className="text-sm text-text-tertiary">
              평균 처리 시간: {data.approvalFunnel.avgProcessDays}일 · SLA 초과:{" "}
              {data.approvalFunnel.slaOverdue}건
            </span>
          </CardFooter>
        </Card>

        {/* Exception Monitor */}
        <Card>
          <CardHeader>
            <CardTitle>예외 모니터</CardTitle>
            <Button variant="ghost" size="sm">
              상세 →
            </Button>
          </CardHeader>
          <CardBody>
            {data.exceptionMonitor.length > 0 ? (
              <QueueList>
                {data.exceptionMonitor.map((item) => (
                  <QueueItem
                    key={item.type}
                    priority={item.priority}
                    title={item.label}
                    meta={item.meta}
                    action={
                      <Badge
                        variant={
                          item.priority === "critical"
                            ? "danger"
                            : item.priority === "high"
                              ? "warning"
                              : "info"
                        }
                      >
                        {item.count}건
                      </Badge>
                    }
                  />
                ))}
              </QueueList>
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  오늘 예외가 없습니다
                </span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Documents & Payroll Watch (1:1) */}
      <div className="mt-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-2">
        {/* Document Status */}
        <Card>
          <CardHeader>
            <CardTitle>문서 현황</CardTitle>
            <Button variant="ghost" size="sm">
              문서함 →
            </Button>
          </CardHeader>
          <CardBody>
            <StatRow
              label="서명 미완료"
              value={`${data.documentStatus.unsigned}건`}
              badge={
                data.documentStatus.urgent > 0
                  ? { text: `긴급 ${data.documentStatus.urgent}건`, variant: "warning" }
                  : undefined
              }
            />
            <StatRow
              label="만료 예정 계약"
              value={`${data.documentStatus.expiringContracts}건`}
              badge={
                data.documentStatus.expiringContracts > 0
                  ? { text: "7일 이내", variant: "danger" }
                  : undefined
              }
            />
          </CardBody>
        </Card>

        {/* Payroll Status */}
        <Card>
          <CardHeader>
            <CardTitle>급여 현황</CardTitle>
            <Button variant="ghost" size="sm">
              급여 관리 →
            </Button>
          </CardHeader>
          <CardBody>
            <StatRow
              label="마감 전 확인"
              value={`${data.payrollStatus.changes}건`}
              badge={
                data.payrollStatus.changes > 0
                  ? { text: "변동 사항", variant: "warning" }
                  : undefined
              }
            />
            <StatRow
              label="명세서 재발행"
              value={`${data.payrollStatus.reissueRequests}건`}
              badge={
                data.payrollStatus.reissueRequests > 0
                  ? { text: "요청 접수", variant: "info" }
                  : undefined
              }
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
