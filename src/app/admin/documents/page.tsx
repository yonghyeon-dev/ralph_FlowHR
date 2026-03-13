"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KPICard, KPIGrid } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface KPIData {
  sent: { count: number };
  signed: { count: number; percentage: number };
  pending: { count: number; delta: number };
  expiring: { count: number; delta: number };
}

interface DashboardData {
  kpi: KPIData;
}

// ─── Constants ──────────────────────────────────────────────

const TABS = [
  { key: "dashboard", label: "대시보드" },
  { key: "templates", label: "템플릿" },
  { key: "send", label: "발송" },
  { key: "vault", label: "보관함" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Component ──────────────────────────────────────────────

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <DocumentsContent />
    </Suspense>
  );
}

function DocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "dashboard";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents/dashboard");
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
    router.push(`/admin/documents${qs ? `?${qs}` : ""}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6">
        <h1 className="text-3xl font-bold text-text-primary">문서 관리</h1>
        <p className="mt-sp-1 text-md text-text-secondary">
          계약서 발송, 템플릿 관리, 문서 보관함
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
      {activeTab === "templates" && (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">
            템플릿 관리 (준비 중)
          </span>
        </div>
      )}
      {activeTab === "send" && (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">
            문서 발송 (준비 중)
          </span>
        </div>
      )}
      {activeTab === "vault" && (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">
            문서 보관함 (준비 중)
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
        eyebrow="발송 완료"
        value={kpi.sent.count}
        label="건 (이번 달)"
      />
      <KPICard
        eyebrow="서명 완료"
        value={kpi.signed.count}
        label={`건 (${kpi.signed.percentage}%)`}
        emphasis
      />
      <KPICard
        eyebrow="서명 대기"
        value={kpi.pending.count}
        label="건 미완료"
        delta={
          kpi.pending.delta !== 0
            ? `${Math.abs(kpi.pending.delta)}건 전주 대비`
            : undefined
        }
        deltaDirection={
          kpi.pending.delta > 0
            ? "up"
            : kpi.pending.delta < 0
              ? "down"
              : "neutral"
        }
      />
      <KPICard
        eyebrow="만료 예정"
        value={kpi.expiring.count}
        label="건 (7일 이내)"
        delta={
          kpi.expiring.delta !== 0
            ? `${Math.abs(kpi.expiring.delta)}건`
            : undefined
        }
        deltaDirection={
          kpi.expiring.delta > 0
            ? "up"
            : kpi.expiring.delta < 0
              ? "down"
              : "neutral"
        }
      />
    </KPIGrid>
  );
}
