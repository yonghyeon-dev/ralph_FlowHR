"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KPICard, KPIGrid } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface KPIData {
  openPostings: { count: number };
  applications: { count: number; delta: number };
  interviews: { count: number };
  avgHiringDays: { days: number };
}

interface DashboardData {
  kpi: KPIData;
}

// ─── Constants ──────────────────────────────────────────────

const TABS = [
  { key: "dashboard", label: "대시보드" },
  { key: "postings", label: "채용 공고" },
  { key: "pipeline", label: "파이프라인" },
  { key: "onboarding", label: "온보딩" },
  { key: "offboarding", label: "오프보딩" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Component ──────────────────────────────────────────────

export default function RecruitingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <RecruitingContent />
    </Suspense>
  );
}

function RecruitingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "dashboard";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recruiting/dashboard");
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
    router.push(`/admin/recruiting${qs ? `?${qs}` : ""}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6">
        <h1 className="text-3xl font-bold text-text-primary">채용 관리</h1>
        <p className="mt-sp-1 text-md text-text-secondary">
          채용 공고, 지원자 파이프라인, 온보딩/오프보딩 관리
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
      {activeTab === "postings" && (
        <PlaceholderTab label="채용 공고 관리" />
      )}
      {activeTab === "pipeline" && (
        <PlaceholderTab label="채용 파이프라인" />
      )}
      {activeTab === "onboarding" && (
        <PlaceholderTab label="온보딩 관리" />
      )}
      {activeTab === "offboarding" && (
        <PlaceholderTab label="오프보딩 관리" />
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
        eyebrow="진행 중 채용"
        value={kpi.openPostings.count}
        label="건 활성 공고"
        emphasis
      />
      <KPICard
        eyebrow="서류 접수"
        value={kpi.applications.count}
        label="명 지원자"
        delta={
          kpi.applications.delta !== 0
            ? `${Math.abs(kpi.applications.delta)}명 전주 대비`
            : undefined
        }
        deltaDirection={
          kpi.applications.delta > 0
            ? "up"
            : kpi.applications.delta < 0
              ? "down"
              : "neutral"
        }
      />
      <KPICard
        eyebrow="면접 예정"
        value={kpi.interviews.count}
        label="명 이번 주"
      />
      <KPICard
        eyebrow="평균 채용 기간"
        value={kpi.avgHiringDays.days}
        label="일 (공고~입사)"
      />
    </KPIGrid>
  );
}

// ─── Placeholder Tab (for future WIs) ───────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-sp-12">
      <span className="text-sm text-text-tertiary">
        {label} (준비 중)
      </span>
    </div>
  );
}
