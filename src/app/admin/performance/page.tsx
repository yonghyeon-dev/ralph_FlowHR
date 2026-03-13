"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  KPICard,
  KPIGrid,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  Badge,
  BarChart,
  Button,
  Input,
  Select,
  DataTable,
  ProgressBar,
  QueueList,
  QueueItem,
} from "@/components/ui";
import type { BadgeVariant, BarChartDatum, Column, QueuePriority } from "@/components/ui";

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
      {activeTab === "progress" && <EvalProgressTab />}
      {activeTab === "one-on-one" && <OneOnOneHub />}
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

// ─── Eval Progress Tab ──────────────────────────────────────

interface EvalProgressRow {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  status: string;
  selfStage: "completed" | "in_progress" | "not_started";
  peerStage: "completed" | "in_progress" | "not_started";
  managerStage: "completed" | "in_progress" | "not_started";
  completedStages: number;
}

interface EvalProgressData {
  cycle: { id: string; name: string } | null;
  evaluations: EvalProgressRow[];
  total: number;
  page: number;
  pageSize: number;
  completionRate: number;
}

type StageStatus = "completed" | "in_progress" | "not_started";

const STAGE_BADGE: Record<StageStatus, { variant: BadgeVariant; label: string }> = {
  completed: { variant: "success", label: "완료" },
  in_progress: { variant: "warning", label: "진행 중" },
  not_started: { variant: "neutral", label: "미시작" },
};

function OverallBadge({ row }: { row: EvalProgressRow }) {
  if (row.status === "COMPLETED") {
    return <Badge variant="success">완료</Badge>;
  }
  if (row.status === "NOT_STARTED") {
    return <Badge variant="neutral">미시작</Badge>;
  }
  const variant: BadgeVariant = row.completedStages >= 2 ? "info" : "warning";
  return <Badge variant={variant}>{row.completedStages}/3</Badge>;
}

function EvalProgressTab() {
  const [data, setData] = useState<EvalProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/performance/eval-progress?page=${page}&pageSize=${pageSize}`
      );
      if (res.ok) {
        const json: EvalProgressData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  if (!data || !data.cycle) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-center py-sp-12">
            <span className="text-sm text-text-tertiary">
              활성 평가 주기가 없습니다.
            </span>
          </div>
        </CardBody>
      </Card>
    );
  }

  const { cycle, evaluations, total, completionRate } = data;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: Column<EvalProgressRow>[] = [
    { key: "name", header: "이름" },
    { key: "department", header: "부서" },
    {
      key: "selfStage",
      header: "자기 평가",
      align: "center",
      render: (row) => {
        const s = STAGE_BADGE[row.selfStage];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "peerStage",
      header: "동료 평가",
      align: "center",
      render: (row) => {
        const s = STAGE_BADGE[row.peerStage];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "managerStage",
      header: "상사 평가",
      align: "center",
      render: (row) => {
        const s = STAGE_BADGE[row.managerStage];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "overall",
      header: "전체 상태",
      align: "center",
      render: (row) => <OverallBadge row={row} />,
    },
    {
      key: "actions",
      header: "액션",
      align: "center",
      render: (row) => (
        <Button variant="ghost" size="sm">
          {row.status === "NOT_STARTED" ? "리마인더" : "상세"}
        </Button>
      ),
    },
  ];

  const pageNumbers: number[] = [];
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{cycle.name} 진행 현황</CardTitle>
        <div className="flex items-center gap-sp-3">
          <ProgressBar value={completionRate} size="sm" className="w-28" />
          <span className="text-sm font-semibold text-text-primary">
            {completionRate}% 완료
          </span>
        </div>
      </CardHeader>
      <CardBody className="!p-0">
        <DataTable<EvalProgressRow>
          columns={columns}
          data={evaluations}
          keyExtractor={(row) => row.id}
          emptyMessage="평가 데이터가 없습니다."
        />

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-sp-4 py-sp-3 border-t border-border">
            <span className="text-sm text-text-tertiary">
              총 {total.toLocaleString()}명 중{" "}
              {((page - 1) * pageSize + 1).toLocaleString()} &ndash;{" "}
              {Math.min(page * pageSize, total).toLocaleString()} 표시
            </span>
            <div className="flex items-center gap-sp-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-sp-2 py-sp-1 text-sm rounded-sm border border-border text-text-tertiary hover:text-text-primary disabled:opacity-40"
              >
                &laquo;
              </button>
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={[
                    "px-sp-2 py-sp-1 text-sm rounded-sm border transition-colors",
                    p === page
                      ? "border-brand bg-brand/5 text-brand font-medium"
                      : "border-border text-text-tertiary hover:text-text-primary",
                  ].join(" ")}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-sp-2 py-sp-1 text-sm rounded-sm border border-border text-text-tertiary hover:text-text-primary disabled:opacity-40"
              >
                &raquo;
              </button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
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

// ─── 1:1 Meeting Hub Tab ────────────────────────────────────

interface OneOnOneMeeting {
  id: string;
  managerName: string;
  employeeName: string;
  scheduledAt: string;
  duration: number;
  agenda: string | null;
  notes: string | null;
  status: string;
}

interface OneOnOneData {
  meetings: OneOnOneMeeting[];
  stats: {
    completedThisMonth: number;
    cancelledThisMonth: number;
  };
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function formatMeetingDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayName = DAY_NAMES[d.getDay()];
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} (${dayName}) ${hours}:${mins}`;
}

function getMeetingPriority(meeting: OneOnOneMeeting): QueuePriority {
  const now = new Date();
  const scheduled = new Date(meeting.scheduledAt);
  const hoursUntil =
    (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil < 0) return "critical";
  if (hoursUntil < 4) return "high";
  if (hoursUntil < 24) return "medium";
  return "low";
}

function OneOnOneHub() {
  const [data, setData] = useState<OneOnOneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    null
  );

  const fetchOneOnOnes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/performance/one-on-one");
      if (res.ok) {
        const json: OneOnOneData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOneOnOnes();
  }, [fetchOneOnOnes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-center py-sp-12">
            <span className="text-sm text-text-tertiary">
              데이터를 불러올 수 없습니다.
            </span>
          </div>
        </CardBody>
      </Card>
    );
  }

  const { meetings, stats } = data;
  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId);

  return (
    <div className="space-y-sp-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>이번 주 1:1 예정</CardTitle>
            <p className="text-xs text-text-tertiary mt-sp-1">
              예정된 1:1 미팅 및 의제 관리
            </p>
          </div>
          <Button variant="primary" size="sm">
            + 1:1 예약
          </Button>
        </CardHeader>
        <CardBody>
          {meetings.length > 0 ? (
            <QueueList>
              {meetings.map((m) => (
                <QueueItem
                  key={m.id}
                  priority={getMeetingPriority(m)}
                  title={`${m.managerName} ↔ ${m.employeeName}`}
                  meta={`${formatMeetingDate(m.scheduledAt)} · ${m.duration}분${m.agenda ? ` · 의제: ${m.agenda}` : ""}`}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setSelectedMeetingId(
                          selectedMeetingId === m.id ? null : m.id
                        )
                      }
                    >
                      의제 보기
                    </Button>
                  }
                />
              ))}
            </QueueList>
          ) : (
            <div className="flex items-center justify-center py-sp-8">
              <span className="text-sm text-text-tertiary">
                이번 주 예정된 1:1 미팅이 없습니다.
              </span>
            </div>
          )}
        </CardBody>
        <CardFooter>
          <span className="text-sm text-text-tertiary">
            이번 달 완료된 1:1: {stats.completedThisMonth}건 · 미참석:{" "}
            {stats.cancelledThisMonth}건
          </span>
        </CardFooter>
      </Card>

      {/* 안건 미리보기 */}
      {selectedMeeting && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedMeeting.managerName} ↔{" "}
              {selectedMeeting.employeeName} 안건
            </CardTitle>
            <Badge variant="info">
              {formatMeetingDate(selectedMeeting.scheduledAt)}
            </Badge>
          </CardHeader>
          <CardBody>
            <div className="space-y-sp-4">
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-sp-2">
                  의제
                </h4>
                {selectedMeeting.agenda ? (
                  <ul className="space-y-sp-1">
                    {selectedMeeting.agenda.split(",").map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-sp-2 text-sm text-text-primary"
                      >
                        <span className="text-text-tertiary mt-0.5">•</span>
                        <span>{item.trim()}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-tertiary">
                    등록된 의제가 없습니다.
                  </p>
                )}
              </div>
              {selectedMeeting.notes && (
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-sp-2">
                    메모
                  </h4>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">
                    {selectedMeeting.notes}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-sp-3 pt-sp-2">
                <StatRow label="시간" value={formatMeetingDate(selectedMeeting.scheduledAt)} />
                <StatRow label="소요" value={`${selectedMeeting.duration}분`} />
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
