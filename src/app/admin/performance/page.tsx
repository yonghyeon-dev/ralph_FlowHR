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
  Button,
  Input,
  Select,
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

// ─── Eval Settings Types ────────────────────────────────────

interface EvalWeights {
  performance: number;
  competency: number;
  collaboration: number;
  leadership: number;
}

interface EvalCycleData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  weights: EvalWeights;
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

const EVAL_TYPE_OPTIONS = [
  { value: "HALF_YEARLY", label: "반기 평가" },
  { value: "QUARTERLY", label: "분기 평가" },
  { value: "ANNUAL", label: "연간 평가" },
];

const WEIGHT_LABELS: Record<keyof EvalWeights, string> = {
  performance: "업무 성과",
  competency: "역량",
  collaboration: "협업",
  leadership: "리더십",
};

const DEFAULT_WEIGHTS: EvalWeights = {
  performance: 40,
  competency: 30,
  collaboration: 20,
  leadership: 10,
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
      {activeTab === "evaluation" && <EvaluationSettings />}
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

// ─── Evaluation Settings Tab ────────────────────────────────

function EvaluationSettings() {
  const [cycles, setCycles] = useState<EvalCycleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state — initialised from active cycle or defaults
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [cycleName, setCycleName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cycleType, setCycleType] = useState("HALF_YEARLY");
  const [weights, setWeights] = useState<EvalWeights>({ ...DEFAULT_WEIGHTS });

  const fetchCycles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/performance/eval-settings");
      if (res.ok) {
        const json = await res.json();
        const list: EvalCycleData[] = json.cycles ?? [];
        setCycles(list);

        // Pre-fill form from the most recent ACTIVE cycle (or first cycle)
        const active = list.find((c) => c.status === "ACTIVE") ?? list[0];
        if (active) {
          setSelectedCycleId(active.id);
          setCycleName(active.name);
          setStartDate(active.startDate);
          setEndDate(active.endDate);
          setCycleType(active.type);
          setWeights(active.weights);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const handleCycleSelect = (id: string) => {
    const cycle = cycles.find((c) => c.id === id);
    if (cycle) {
      setSelectedCycleId(cycle.id);
      setCycleName(cycle.name);
      setStartDate(cycle.startDate);
      setEndDate(cycle.endDate);
      setCycleType(cycle.type);
      setWeights(cycle.weights);
    }
  };

  const handleWeightChange = (key: keyof EvalWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/performance/eval-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCycleId || undefined,
          name: cycleName,
          startDate,
          endDate,
          type: cycleType,
          weights,
        }),
      });
      if (res.ok) {
        await fetchCycles();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  const weightTotal = Object.values(weights).reduce((s, v) => s + v, 0);
  const weightChartData: BarChartDatum[] = (
    Object.keys(WEIGHT_LABELS) as (keyof EvalWeights)[]
  ).map((key) => ({
    name: WEIGHT_LABELS[key],
    value: weights[key],
  }));

  return (
    <div className="space-y-sp-6">
      {/* Cycle selector — only when multiple cycles exist */}
      {cycles.length > 1 && (
        <div className="flex items-center gap-sp-3">
          <span className="text-sm font-medium text-text-secondary">
            평가 주기 선택:
          </span>
          <div className="flex gap-sp-2">
            {cycles.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCycleSelect(c.id)}
                className={[
                  "px-sp-3 py-sp-1 text-sm rounded-sm border transition-colors",
                  selectedCycleId === c.id
                    ? "border-brand bg-brand/5 text-brand font-medium"
                    : "border-border text-text-tertiary hover:text-text-secondary",
                ].join(" ")}
              >
                {c.name}
                <Badge
                  variant={
                    c.status === "ACTIVE"
                      ? "info"
                      : c.status === "CLOSED"
                        ? "success"
                        : "neutral"
                  }
                  className="ml-sp-2"
                >
                  {c.status === "ACTIVE"
                    ? "진행"
                    : c.status === "CLOSED"
                      ? "종료"
                      : "초안"}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-column layout */}
      <Card>
        <CardHeader>
          <CardTitle>평가 주기 설정</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-sp-8">
            {/* Left: Form */}
            <div>
              <Input
                label="평가 주기명"
                value={cycleName}
                onChange={(e) => setCycleName(e.target.value)}
                placeholder="예: 2026 H1 성과 평가"
              />
              <div className="mb-sp-4">
                <label className="block text-sm font-medium text-text-secondary mb-sp-1">
                  평가 기간
                </label>
                <div className="flex items-center gap-sp-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 px-sp-3 py-sp-2 border border-border rounded-sm text-md bg-surface-primary text-text-primary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand/10"
                  />
                  <span className="text-text-tertiary">~</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 px-sp-3 py-sp-2 border border-border rounded-sm text-md bg-surface-primary text-text-primary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand/10"
                  />
                </div>
              </div>
              <Select
                label="평가 유형"
                options={EVAL_TYPE_OPTIONS}
                value={cycleType}
                onChange={(e) => setCycleType(e.target.value)}
              />
            </div>

            {/* Right: Weight chart + sliders */}
            <div>
              <div className="font-semibold text-sm text-text-primary mb-sp-4">
                평가 기준 가중치
              </div>

              {/* Weight bar chart */}
              <BarChart
                data={weightChartData}
                layout="vertical"
                height={200}
                showTooltip
              />

              {/* Weight sliders */}
              <div className="mt-sp-4 space-y-sp-3">
                {(
                  Object.keys(WEIGHT_LABELS) as (keyof EvalWeights)[]
                ).map((key) => (
                  <div key={key} className="flex items-center gap-sp-3">
                    <span className="text-sm text-text-secondary w-20 shrink-0">
                      {WEIGHT_LABELS[key]}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={weights[key]}
                      onChange={(e) =>
                        handleWeightChange(key, Number(e.target.value))
                      }
                      className="flex-1 accent-brand"
                    />
                    <span className="text-sm font-medium text-text-primary w-12 text-right">
                      {weights[key]}%
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-sp-2 border-t border-border">
                  <span className="text-sm font-medium text-text-secondary">
                    합계
                  </span>
                  <span
                    className={[
                      "text-sm font-bold",
                      weightTotal === 100
                        ? "text-status-success-text"
                        : "text-status-danger-text",
                    ].join(" ")}
                  >
                    {weightTotal}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end mt-sp-6 pt-sp-4 border-t border-border">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={
                saving || !cycleName || !startDate || !endDate || weightTotal !== 100
              }
            >
              {saving ? "저장 중..." : "설정 저장"}
            </Button>
          </div>
        </CardBody>
      </Card>
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
