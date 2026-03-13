"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KPICard, KPIGrid } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface KPIData {
  todayAbsences: { count: number };
  pendingRequests: { count: number; delta: number };
  avgRemaining: { days: number; employeeCount: number };
  monthUsage: { days: number; delta: number };
}

interface DashboardData {
  kpi: KPIData;
}

// ─── Constants ──────────────────────────────────────────────

const TABS = [
  { key: "dashboard", label: "대시보드" },
  { key: "calendar", label: "캘린더" },
  { key: "policies", label: "휴가 정책" },
  { key: "requests", label: "신청 큐" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Component ──────────────────────────────────────────────

export default function LeavePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <LeaveContent />
    </Suspense>
  );
}

function LeaveContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "dashboard";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave/dashboard");
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
    router.push(`/admin/leave${qs ? `?${qs}` : ""}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6">
        <h1 className="text-3xl font-bold text-text-primary">휴가 관리</h1>
        <p className="mt-sp-1 text-md text-text-secondary">
          휴가 현황, 정책, 요청 관리
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
        <DashboardTab data={data} loading={loading} />
      )}
      {activeTab === "calendar" && (
        <PlaceholderTab message="휴가 캘린더 (WI-021)" />
      )}
      {activeTab === "policies" && (
        <PlaceholderTab message="휴가 정책 관리 (WI-022)" />
      )}
      {activeTab === "requests" && (
        <PlaceholderTab message="휴가 신청 큐 (WI-023)" />
      )}
    </div>
  );
}

// ─── Dashboard Tab ──────────────────────────────────────────

function DashboardTab({
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
          데이터를 불러올 수 없습니다
        </span>
      </div>
    );
  }

  const { kpi } = data;

  return (
    <KPIGrid columns={4}>
      <KPICard
        eyebrow="오늘 휴가"
        value={kpi.todayAbsences.count}
        label="명 부재 중"
        emphasis
      />
      <KPICard
        eyebrow="대기 중 요청"
        value={kpi.pendingRequests.count}
        label="건 승인 대기"
        delta={
          kpi.pendingRequests.delta !== 0
            ? `${Math.abs(kpi.pendingRequests.delta)}건 전일 대비`
            : undefined
        }
        deltaDirection={
          kpi.pendingRequests.delta > 0
            ? "up"
            : kpi.pendingRequests.delta < 0
              ? "down"
              : "neutral"
        }
      />
      <KPICard
        eyebrow="잔여 연차 평균"
        value={kpi.avgRemaining.days}
        label="일 (전사 평균)"
      />
      <KPICard
        eyebrow="이번 달 사용"
        value={kpi.monthUsage.days}
        label="일 총 사용"
        delta={
          kpi.monthUsage.delta !== 0
            ? `${Math.abs(kpi.monthUsage.delta)}일 전월 대비`
            : "전월 동기 대비 유사"
        }
        deltaDirection={
          kpi.monthUsage.delta > 0
            ? "up"
            : kpi.monthUsage.delta < 0
              ? "down"
              : "neutral"
        }
      />
    </KPIGrid>
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
