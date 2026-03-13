"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  KPICard,
  KPIGrid,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Button,
  QueueList,
  QueueItem,
} from "@/components/ui";
import type { QueuePriority } from "@/components/ui";
import { ApprovalDetailDrawer } from "./ApprovalDetailDrawer";
import { WorkflowBuilder } from "./WorkflowBuilder";

// ─── Types ──────────────────────────────────────────────────

interface InboxItem {
  id: string;
  title: string;
  department: string;
  meta: string;
  priority: QueuePriority;
  requestType: string;
  slaExceeded: boolean;
  daysPending: number;
}

interface DashboardData {
  kpi: {
    pending: number;
    slaExceeded: number;
    slaDelta: number;
    escalations: number;
    weeklyComplete: number;
  };
  inbox: InboxItem[];
  stats: {
    avgProcessDays: number;
    todayProcessed: number;
    autoApproved: number;
    rejectionRate: number;
    slowestType: string;
  };
}

// ─── Constants ──────────────────────────────────────────────

const TABS = [
  { key: "dashboard", label: "대시보드" },
  { key: "detail", label: "상세" },
  { key: "builder", label: "빌더" },
  { key: "history", label: "이력" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type InboxFilter = "all" | "urgent" | "sla";

// ─── Component ──────────────────────────────────────────────

export default function WorkflowPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <WorkflowContent />
    </Suspense>
  );
}

function WorkflowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "dashboard";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workflow/dashboard");
      if (res.ok) {
        const json: DashboardData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboard();
    }
  }, [activeTab, fetchDashboard]);

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "dashboard") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.push(`/admin/workflow${qs ? `?${qs}` : ""}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6">
        <h1 className="text-3xl font-bold text-text-primary">결재 관리</h1>
        <p className="mt-sp-1 text-md text-text-secondary">
          승인 요청 처리, 워크플로 설계, 결재 이력 관리
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-sp-6 flex gap-sp-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={[
              "px-sp-4 py-sp-2 text-sm font-medium transition-colors duration-fast",
              "-mb-px border-b-2",
              activeTab === tab.key
                ? "border-brand text-brand-text"
                : "border-transparent text-text-tertiary hover:text-text-secondary hover:border-border",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <DashboardTab
          data={data}
          loading={loading}
          onSelectRequest={setSelectedRequestId}
        />
      )}
      {activeTab === "detail" && (
        <DetailTab onSelectRequest={setSelectedRequestId} />
      )}
      {activeTab === "builder" && <WorkflowBuilder />}
      {activeTab === "history" && (
        <PlaceholderTab message="결재 이력 (WI-028)" />
      )}

      {/* Approval Detail Drawer */}
      <ApprovalDetailDrawer
        requestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        onActionComplete={fetchDashboard}
      />
    </div>
  );
}

// ─── Dashboard Tab ──────────────────────────────────────────

function DashboardTab({
  data,
  loading,
  onSelectRequest,
}: {
  data: DashboardData | null;
  loading: boolean;
  onSelectRequest: (_id: string) => void;
}) {
  const [filter, setFilter] = useState<InboxFilter>("all");

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

  const { kpi, inbox, stats } = data;

  const filteredInbox = inbox.filter((item) => {
    if (filter === "urgent") return item.priority === "critical" || item.priority === "high";
    if (filter === "sla") return item.slaExceeded;
    return true;
  });

  const filterChips: { key: InboxFilter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "urgent", label: "긴급" },
    { key: "sla", label: "SLA 초과" },
  ];

  return (
    <>
      {/* 4 KPI Cards */}
      <KPIGrid columns={4}>
        <KPICard
          eyebrow="승인 대기"
          value={kpi.pending}
          label="건"
          emphasis
        />
        <KPICard
          eyebrow="SLA 초과"
          value={kpi.slaExceeded}
          label="건 (48h+)"
          delta={
            kpi.slaDelta !== 0
              ? `${Math.abs(kpi.slaDelta)}건`
              : undefined
          }
          deltaDirection={
            kpi.slaDelta > 0 ? "up" : kpi.slaDelta < 0 ? "down" : "neutral"
          }
        />
        <KPICard
          eyebrow="상향 결재"
          value={kpi.escalations}
          label="건 에스컬레이션"
        />
        <KPICard
          eyebrow="이번 주 완료"
          value={kpi.weeklyComplete}
          label="건 처리 완료"
        />
      </KPIGrid>

      {/* Inbox + Stats */}
      <div className="mt-sp-6 grid grid-cols-1 gap-sp-6 lg:grid-cols-3">
        {/* Left: Inbox (2/3) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>승인 대기열</CardTitle>
            <div className="flex gap-sp-2">
              {filterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setFilter(chip.key)}
                  className={[
                    "rounded-full px-sp-3 py-sp-1 text-xs font-medium transition-colors duration-fast",
                    filter === chip.key
                      ? "bg-brand text-text-inverse"
                      : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary",
                  ].join(" ")}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardBody>
            {filteredInbox.length > 0 ? (
              <QueueList>
                {filteredInbox.map((item) => (
                  <QueueItem
                    key={item.id}
                    priority={item.priority}
                    title={item.title}
                    meta={`${item.department} · ${item.meta}${item.daysPending > 0 ? ` · 대기 ${item.daysPending}일` : ""}`}
                    action={
                      <Button
                        variant={item.priority === "critical" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => onSelectRequest(item.id)}
                      >
                        검토
                      </Button>
                    }
                  />
                ))}
              </QueueList>
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  대기 중인 요청이 없습니다
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Right: Stats (1/3) */}
        <Card>
          <CardHeader>
            <CardTitle>처리 현황</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-sp-4">
              <StatRow label="평균 처리 시간" value={`${stats.avgProcessDays}일`} />
              <StatRow label="오늘 처리" value={`${stats.todayProcessed}건`} />
              <StatRow label="자동 승인" value={`${stats.autoApproved}건`} />
              <StatRow label="반려율" value={`${stats.rejectionRate}%`} />
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">가장 느린 유형</span>
                <Badge variant="warning">{stats.slowestType}</Badge>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

// ─── Stat Row ───────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

// ─── Detail Tab ─────────────────────────────────────────────

interface RequestListItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  requestType: string;
  requesterName: string;
  department: string;
  createdAt: string;
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: "긴급",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

function DetailTab({ onSelectRequest }: { onSelectRequest: (_id: string) => void }) {
  const [requests, setRequests] = useState<RequestListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workflow/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.inbox) {
          const items: RequestListItem[] = json.inbox.map((item: InboxItem) => ({
            id: item.id,
            title: item.title,
            status: "PENDING",
            priority: item.priority,
            requestType: item.requestType,
            requesterName: item.title.split(" — ")[1] ?? "",
            department: item.department,
            createdAt: "",
          }));
          setRequests(items);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">결재 요청이 없습니다</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>결재 요청 목록</CardTitle>
      </CardHeader>
      <CardBody>
        <QueueList>
          {requests.map((req) => (
            <QueueItem
              key={req.id}
              priority={req.priority as QueuePriority}
              title={req.title}
              meta={`${req.department} · ${PRIORITY_LABEL[req.priority] ?? req.priority}`}
              action={
                <Button size="sm" variant="secondary" onClick={() => onSelectRequest(req.id)}>
                  상세 보기
                </Button>
              }
            />
          ))}
        </QueueList>
      </CardBody>
    </Card>
  );
}

// ─── Placeholder Tab ────────────────────────────────────────

function PlaceholderTab({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-sp-12">
      <span className="text-sm text-text-tertiary">{message}</span>
    </div>
  );
}
