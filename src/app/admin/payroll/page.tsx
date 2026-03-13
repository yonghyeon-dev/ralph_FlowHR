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
  DataTable,
  Input,
  Select,
  Textarea,
  QueueList,
  QueueItem,
} from "@/components/ui";
import type { BadgeVariant, QueuePriority, Column } from "@/components/ui";
import { Modal } from "@/components/layout/Modal";

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

interface PayrollRule {
  id: string;
  name: string;
  type: string;
  description: string | null;
  formula: string;
  rate: number | null;
  isActive: boolean;
  sortOrder: number;
}

interface RuleFormData {
  name: string;
  type: string;
  description: string;
  formula: string;
  rate: string;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  FIXED: "고정",
  VARIABLE: "변동",
  DEDUCTION: "공제",
};

const RULE_TYPE_BADGE: Record<string, "info" | "warning" | "neutral"> = {
  FIXED: "info",
  VARIABLE: "warning",
  DEDUCTION: "neutral",
};

const RULE_TYPE_OPTIONS = [
  { value: "FIXED", label: "고정" },
  { value: "VARIABLE", label: "변동" },
  { value: "DEDUCTION", label: "공제" },
];

const EMPTY_RULE_FORM: RuleFormData = {
  name: "",
  type: "",
  description: "",
  formula: "",
  rate: "",
};

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
      {activeTab === "rules" && <RulesTab />}
      {activeTab === "closing" && <ClosingTab />}
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

// ─── Rules Tab (WI-036) ──────────────────────────────────────

function RulesTab() {
  const [rules, setRules] = useState<PayrollRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PayrollRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(EMPTY_RULE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/rules");
      if (res.ok) {
        const json = await res.json();
        setRules(json.rules);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  function openCreateModal() {
    setEditingRule(null);
    setForm(EMPTY_RULE_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(rule: PayrollRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      type: rule.type,
      description: rule.description ?? "",
      formula: rule.formula,
      rate: rule.rate !== null ? String(rule.rate) : "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.type || !form.formula.trim()) {
      setError("규칙명, 유형, 계산 방식은 필수입니다");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim() || null,
        formula: form.formula.trim(),
        rate: form.rate ? Number(form.rate) : null,
      };

      const url = editingRule
        ? `/api/payroll/rules/${editingRule.id}`
        : "/api/payroll/rules";

      const res = await fetch(url, {
        method: editingRule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        setError(errJson.error || "저장에 실패했습니다");
        return;
      }

      setModalOpen(false);
      fetchRules();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(rule: PayrollRule) {
    await fetch(`/api/payroll/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    fetchRules();
  }

  const columns: Column<PayrollRule>[] = [
    {
      key: "name",
      header: "규칙명",
      render: (row) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      key: "type",
      header: "유형",
      align: "center",
      render: (row) => (
        <Badge variant={RULE_TYPE_BADGE[row.type] ?? "neutral"}>
          {RULE_TYPE_LABELS[row.type] ?? row.type}
        </Badge>
      ),
    },
    {
      key: "formula",
      header: "계산 방식",
      render: (row) => (
        <span className="text-text-secondary">{row.formula}</span>
      ),
    },
    {
      key: "isActive",
      header: "상태",
      align: "center",
      render: (row) => (
        <Badge variant={row.isActive ? "success" : "danger"}>
          {row.isActive ? "활성" : "비활성"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "액션",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-sp-2">
          <Button variant="ghost" size="sm" onClick={() => openEditModal(row)}>
            편집
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row)}
          >
            {row.isActive ? "비활성화" : "활성화"}
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>급여 규칙</CardTitle>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            규칙 추가
          </Button>
        </CardHeader>
        <CardBody>
          <DataTable<PayrollRule>
            columns={columns}
            data={rules}
            keyExtractor={(row) => row.id}
            emptyMessage="등록된 급여 규칙이 없습니다"
          />
        </CardBody>
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRule ? "급여 규칙 수정" : "급여 규칙 추가"}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-sp-4 rounded-sm bg-status-danger-bg px-sp-3 py-sp-2 text-sm text-status-danger-text">
            {error}
          </div>
        )}

        <Input
          label="규칙명"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="예: 기본급"
        />

        <Select
          label="유형"
          options={RULE_TYPE_OPTIONS}
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          placeholder="유형 선택"
          disabled={!!editingRule}
        />

        <Input
          label="계산 방식"
          value={form.formula}
          onChange={(e) => setForm({ ...form, formula: e.target.value })}
          placeholder="예: 연봉 / 12"
        />

        <Input
          label="비율 (선택)"
          type="number"
          step="0.001"
          value={form.rate}
          onChange={(e) => setForm({ ...form, rate: e.target.value })}
          placeholder="예: 1.5, 0.045"
        />

        <Textarea
          label="설명 (선택)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="규칙에 대한 상세 설명"
          rows={2}
        />
      </Modal>
    </>
  );
}

// ─── Closing Tab (WI-037) ──────────────────────────────────────

interface PayrollClosingChecklistItem {
  id: string;
  title: string;
  meta: string;
  status: "complete" | "pending" | "progress" | "not_started";
  statusLabel: string;
  priority: "low" | "medium" | "high" | "critical";
}

interface PayrollClosingData {
  year: number;
  month: number;
  status: string;
  currentStep: number;
  totalSteps: number;
  totalEmployees: number;
  totalAmount: number;
  confirmedBy: string | null;
  confirmedAt: string | null;
  checklist: PayrollClosingChecklistItem[];
}

const PAYROLL_STEPS = [
  { step: 1, label: "데이터 수집", desc: "근태/변동 데이터" },
  { step: 2, label: "변동 확인", desc: "승진/조정/입퇴사" },
  { step: 3, label: "계산", desc: "급여 산출" },
  { step: 4, label: "검토", desc: "부서장/CFO" },
  { step: 5, label: "확정", desc: "이체/명세서 발행" },
];

const PAYROLL_STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: "준비", variant: "neutral" },
  DATA_COLLECTION: { label: "진행 중 (1/5단계)", variant: "info" },
  CHANGE_REVIEW: { label: "진행 중 (2/5단계)", variant: "info" },
  CALCULATION: { label: "진행 중 (3/5단계)", variant: "info" },
  REVIEW: { label: "검토 중 (4/5단계)", variant: "warning" },
  CONFIRMED: { label: "확정 완료", variant: "success" },
};

const PAYROLL_CHECKLIST_STATUS_BADGE: Record<string, BadgeVariant> = {
  complete: "success",
  pending: "warning",
  progress: "info",
  not_started: "neutral",
};

const PAYROLL_CHECKLIST_PRIORITY: Record<string, QueuePriority> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

const PAYROLL_NEXT_ACTION: Record<string, string> = {
  DRAFT: "데이터 수집 시작",
  DATA_COLLECTION: "변동 확인",
  CHANGE_REVIEW: "계산 실행",
  CALCULATION: "검토 요청",
  REVIEW: "최종 확정",
};

function ClosingTab() {
  const [closingData, setClosingData] = useState<PayrollClosingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClosing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/closing");
      if (res.ok) {
        const json: PayrollClosingData = await res.json();
        setClosingData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClosing();
  }, [fetchClosing]);

  async function handleAdvance() {
    if (!closingData || closingData.status === "CONFIRMED") return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/payroll/closing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: closingData.year,
          month: closingData.month,
          action: "advance",
        }),
      });
      if (res.ok) {
        await fetchClosing();
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  if (!closingData) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">
          데이터를 불러올 수 없습니다
        </span>
      </div>
    );
  }

  const statusBadge = PAYROLL_STATUS_BADGE[closingData.status] ?? {
    label: closingData.status,
    variant: "neutral" as BadgeVariant,
  };

  const nextActionLabel = PAYROLL_NEXT_ACTION[closingData.status] ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {closingData.year}년 {closingData.month}월 급여 마감
        </CardTitle>
        <div className="flex items-center gap-sp-3">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {nextActionLabel && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdvance}
              disabled={actionLoading}
            >
              {nextActionLabel}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody>
        {/* 5-Step Indicator */}
        <div className="mb-sp-6 flex items-start gap-sp-4">
          {PAYROLL_STEPS.map((s) => {
            const isDone = closingData.currentStep > s.step;
            const isActive = closingData.currentStep === s.step;
            return (
              <div
                key={s.step}
                className={[
                  "flex flex-1 items-start gap-sp-2 rounded-md border px-sp-3 py-sp-2",
                  isDone
                    ? "border-status-success bg-status-success-bg"
                    : isActive
                      ? "border-brand bg-brand-bg"
                      : "border-border bg-surface-secondary",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    isDone
                      ? "bg-status-success text-white"
                      : isActive
                        ? "bg-brand text-white"
                        : "bg-surface-tertiary text-text-tertiary",
                  ].join(" ")}
                >
                  {isDone ? "\u2713" : s.step}
                </span>
                <div className="min-w-0">
                  <div className={[
                    "text-sm font-semibold",
                    isDone ? "text-status-success-text" : isActive ? "text-brand-text" : "text-text-tertiary",
                  ].join(" ")}>
                    {s.label}
                  </div>
                  <div className="text-xs text-text-tertiary">{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Checklist */}
        <QueueList>
          {closingData.checklist.map((item) => (
            <QueueItem
              key={item.id}
              priority={PAYROLL_CHECKLIST_PRIORITY[item.priority] ?? "low"}
              title={item.title}
              meta={item.meta}
              action={
                <Badge variant={PAYROLL_CHECKLIST_STATUS_BADGE[item.status] ?? "neutral"}>
                  {item.statusLabel}
                </Badge>
              }
            />
          ))}
        </QueueList>

        {/* Confirmed info */}
        {closingData.status === "CONFIRMED" && closingData.confirmedAt && (
          <div className="mt-sp-4 rounded-md bg-status-success-bg px-sp-4 py-sp-3 text-sm text-status-success-text">
            확정 완료: {closingData.confirmedAt}
            {closingData.confirmedBy && ` (${closingData.confirmedBy})`}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
