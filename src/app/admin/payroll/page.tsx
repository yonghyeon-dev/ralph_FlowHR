"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KPICard, KPIGrid } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface KPIData {
  totalEmployees: { count: number };
  confirmed: { count: number; percentage: number };
  unconfirmed: { count: number; delta: number };
  sent: { count: number; delta: number };
}

interface DashboardData {
  kpi: KPIData;
}

// ─── Constants ──────────────────────────────────────────────

const TABS = [
  { key: "dashboard", label: "대시보드" },
  { key: "rules", label: "급여 규칙" },
  { key: "closing", label: "급여 마감" },
  { key: "payslips", label: "명세서" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Component ──────────────────────────────────────────────

export default function PayrollPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <PayrollContent />
    </Suspense>
  );
}

function PayrollContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "dashboard";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/dashboard");
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
    router.push(`/admin/payroll${qs ? `?${qs}` : ""}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6">
        <h1 className="text-3xl font-bold text-text-primary">급여 관리</h1>
        <p className="mt-sp-1 text-md text-text-secondary">
          급여 규칙, 마감, 명세서 관리
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
      {activeTab === "rules" && (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">
            급여 규칙 관리 (준비 중)
          </span>
        </div>
      )}
      {activeTab === "closing" && (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">
            급여 마감 (준비 중)
          </span>
        </div>
      )}
      {activeTab === "payslips" && (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">
            급여 명세서 (준비 중)
          </span>
        </div>
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
        eyebrow="급여 인원"
        value={kpi.totalEmployees.count}
        label="명 (이번 달)"
      />
      <KPICard
        eyebrow="확정 완료율"
        value={kpi.confirmed.count}
        label={`건 (${kpi.confirmed.percentage}%)`}
        emphasis
      />
      <KPICard
        eyebrow="미확정 건수"
        value={kpi.unconfirmed.count}
        label="건 미처리"
        delta={
          kpi.unconfirmed.delta !== 0
            ? `${Math.abs(kpi.unconfirmed.delta)}건 전월 대비`
            : undefined
        }
        deltaDirection={
          kpi.unconfirmed.delta > 0
            ? "up"
            : kpi.unconfirmed.delta < 0
              ? "down"
              : "neutral"
        }
      />
      <KPICard
        eyebrow="발송 완료"
        value={kpi.sent.count}
        label="건 발송됨"
        delta={
          kpi.sent.delta !== 0
            ? `${Math.abs(kpi.sent.delta)}건 전월 대비`
            : undefined
        }
        deltaDirection={
          kpi.sent.delta > 0
            ? "down"
            : kpi.sent.delta < 0
              ? "up"
              : "neutral"
        }
      />
    </KPIGrid>
  );
}
