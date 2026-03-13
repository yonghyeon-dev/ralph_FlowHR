"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  KPICard,
  KPIGrid,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  BarChart,
} from "@/components/ui";
import type { BadgeVariant, BarChartDatum } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface GoalCompletionKPI {
  rate: number;
  completed: number;
  total: number;
}

interface CountKPI {
  count: number;
}

interface KPIData {
  goalCompletion: GoalCompletionKPI;
  evaluationsInProgress: CountKPI;
  scheduledOneOnOnes: CountKPI;
  notStartedGoals: CountKPI;
}

interface ActiveCycleInfo {
  name: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  completionRate: number;
}

interface DashboardData {
  kpi: KPIData;
  deptGoalRates: BarChartDatum[];
  activeCycle: ActiveCycleInfo | null;
}

// ─── Constants ──────────────────────────────────────────────

const TABS = [
  { key: "goals", label: "목표 대시보드" },
  { key: "evaluation", label: "평가 설정" },
  { key: "progress", label: "평가 진행" },
  { key: "one-on-one", label: "1:1 미팅" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const CYCLE_TYPE_LABELS: Record<string, string> = {
  HALF_YEARLY: "반기",
  QUARTERLY: "분기",
  ANNUAL: "연간",
};

// ─── Component ──────────────────────────────────────────────

export default function PerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <PerformanceContent />
    </Suspense>
  );
}

function PerformanceContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("goals");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/performance/dashboard");
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

  return (
    <div className="space-y-sp-6">
      {/* Page Header */}
      <div>
        <div className="text-xs text-text-tertiary mb-sp-1">
          Home &gt; Performance
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">성과 관리</h1>
            <p className="text-sm text-text-secondary mt-sp-1">
              목표 관리, 평가 주기, 1:1 미팅 관리
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-sp-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              "px-sp-4 py-sp-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.key
                ? "border-brand text-brand"
                : "border-transparent text-text-tertiary hover:text-text-secondary",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "goals" && (
        <GoalsDashboard data={data} loading={loading} />
      )}
      {activeTab === "evaluation" && <PlaceholderTab label="평가 설정" />}
      {activeTab === "progress" && <PlaceholderTab label="평가 진행 현황" />}
      {activeTab === "one-on-one" && <PlaceholderTab label="1:1 미팅 허브" />}
    </div>
  );
}

// ─── Goals Dashboard Tab ────────────────────────────────────

function GoalsDashboard({
  data,
  loading,
}: {
  data: DashboardData | null;
  loading: boolean;
}) {
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
          데이터를 불러올 수 없습니다.
        </span>
      </div>
    );
  }

  const { kpi, deptGoalRates, activeCycle } = data;

  return (
    <div className="space-y-sp-6">
      {/* 4 KPI Cards */}
      <KPIGrid columns={4}>
        <KPICard
          eyebrow="목표 설정 완료"
          value={`${kpi.goalCompletion.rate}%`}
          label={`${kpi.goalCompletion.completed} / ${kpi.goalCompletion.total}명`}
          emphasis
        />
        <KPICard
          eyebrow="평가 중"
          value={kpi.evaluationsInProgress.count}
          label="건 진행 중"
        />
        <KPICard
          eyebrow="1:1 예정"
          value={kpi.scheduledOneOnOnes.count}
          label="건 이번 주"
        />
        <KPICard
          eyebrow="미설정"
          value={kpi.notStartedGoals.count}
          label="건 목표 미시작"
          delta="마감 임박"
          deltaDirection="up"
        />
      </KPIGrid>

      {/* 부서별 목표 설정률 + 활성 사이클 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-sp-6">
        {/* 부서별 목표 설정률 차트 (2/3 width) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>부서별 목표 설정률</CardTitle>
          </CardHeader>
          <CardBody>
            {deptGoalRates.length > 0 ? (
              <BarChart
                data={deptGoalRates}
                layout="vertical"
                height={Math.max(200, deptGoalRates.length * 48)}
                showTooltip
              />
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  활성 평가 주기가 없습니다.
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* 활성 사이클 카드 (1/3 width) */}
        <Card>
          <CardHeader>
            <CardTitle>현재 평가 주기</CardTitle>
          </CardHeader>
          <CardBody>
            {activeCycle ? (
              <ActiveCycleCard cycle={activeCycle} />
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  활성 평가 주기 없음
                </span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ─── Active Cycle Card ──────────────────────────────────────

function ActiveCycleCard({ cycle }: { cycle: ActiveCycleInfo }) {
  const startDate = new Date(cycle.startDate);
  const endDate = new Date(cycle.endDate);

  const formatDate = (d: Date): string =>
    `${d.getMonth() + 1}/${d.getDate()}`;

  const statusBadge: Record<string, BadgeVariant> = {
    DRAFT: "neutral",
    ACTIVE: "info",
    CLOSED: "success",
  };

  const statusLabel: Record<string, string> = {
    DRAFT: "초안",
    ACTIVE: "진행 중",
    CLOSED: "종료",
  };

  return (
    <div className="space-y-sp-4">
      <StatRow label="주기명" value={cycle.name} />
      <StatRow
        label="기간"
        value={`${formatDate(startDate)} ~ ${formatDate(endDate)}`}
      />
      <StatRow
        label="유형"
        value={CYCLE_TYPE_LABELS[cycle.type] ?? cycle.type}
      />
      <StatRow
        label="상태"
        value={
          <Badge variant={statusBadge[cycle.status] ?? "neutral"}>
            {statusLabel[cycle.status] ?? cycle.status}
          </Badge>
        }
      />
      <StatRow label="완료율" value={`${cycle.completionRate}%`} />

      {/* 진행률 바 */}
      <div className="w-full bg-surface-secondary rounded-full h-2">
        <div
          className="bg-brand rounded-full h-2 transition-all"
          style={{ width: `${cycle.completionRate}%` }}
        />
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function StatRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">
            {label} 탭 (다음 WI에서 구현 예정)
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
