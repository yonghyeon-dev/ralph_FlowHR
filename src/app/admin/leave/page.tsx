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
  DataTable,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import { Modal } from "@/components/layout/Modal";
import { Drawer } from "@/components/layout/Drawer";

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

interface CalendarData {
  year: number;
  month: number;
  eventDays: number[];
  todayAbsences: {
    count: number;
    items: { employeeName: string; department: string; leaveType: string }[];
    remainingCount: number;
  };
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
      {activeTab === "calendar" && <CalendarTab />}
      {activeTab === "policies" && <PolicyTab />}
      {activeTab === "requests" && <RequestsTab />}
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

// ─── Calendar Tab ───────────────────────────────────────────

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function CalendarTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leave/calendar?year=${y}&month=${m}`);
      if (res.ok) {
        const json: CalendarData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(year, month);
  }, [year, month, fetchCalendar]);

  function handlePrevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  // Build calendar grid cells
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayDate = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : -1;
  const eventSet = new Set(data?.eventDays ?? []);

  const cells: { day: number; type: "normal" | "today" | "event" | "off" | "empty" }[] = [];

  // Leading empty cells
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ day: 0, type: "empty" });
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = (firstDayOfMonth + d - 1) % 7;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (d === todayDate) {
      cells.push({ day: d, type: "today" });
    } else if (eventSet.has(d)) {
      cells.push({ day: d, type: "event" });
    } else if (isWeekend) {
      cells.push({ day: d, type: "off" });
    } else {
      cells.push({ day: d, type: "normal" });
    }
  }

  const cellStyles: Record<string, string> = {
    normal: "bg-surface-primary text-text-primary",
    today: "bg-brand text-text-inverse font-bold",
    event: "bg-brand-soft text-brand-text",
    off: "bg-status-neutral-bg text-text-tertiary",
    empty: "",
  };

  return (
    <div className="grid grid-cols-1 gap-sp-6 lg:grid-cols-3">
      {/* Calendar Card (2/3 width) */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>휴가 캘린더</CardTitle>
          <div className="flex items-center gap-sp-2">
            <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
              &larr;
            </Button>
            <span className="min-w-[100px] text-center text-sm font-semibold text-text-primary">
              {year}년 {MONTH_NAMES[month - 1]}
            </span>
            <Button variant="ghost" size="sm" onClick={handleNextMonth}>
              &rarr;
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center py-sp-12">
              <span className="text-sm text-text-tertiary">불러오는 중...</span>
            </div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-px mb-px">
                {DAY_HEADERS.map((h) => (
                  <div
                    key={h}
                    className="py-sp-2 text-center text-xs font-semibold text-text-tertiary"
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px">
                {cells.map((cell, idx) => (
                  <div
                    key={idx}
                    className={[
                      "flex items-center justify-center rounded-sm py-sp-3 text-sm transition-colors duration-fast",
                      cell.type !== "empty" ? cellStyles[cell.type] : "",
                    ].join(" ")}
                  >
                    {cell.day > 0 ? cell.day : ""}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-sp-4 flex gap-sp-4 text-sm text-text-secondary">
                <span className="flex items-center gap-sp-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-brand-soft" />
                  휴가
                </span>
                <span className="flex items-center gap-sp-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-brand" />
                  오늘
                </span>
                <span className="flex items-center gap-sp-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-status-neutral-bg" />
                  주말/공휴일
                </span>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Today Absences Card (1/3 width) */}
      <Card>
        <CardHeader>
          <CardTitle>오늘 부재자</CardTitle>
          <Badge variant="info">{data?.todayAbsences.count ?? 0}명</Badge>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center py-sp-8">
              <span className="text-sm text-text-tertiary">불러오는 중...</span>
            </div>
          ) : data && data.todayAbsences.count > 0 ? (
            <QueueList>
              {data.todayAbsences.items.map((item, idx) => (
                <QueueItem
                  key={idx}
                  priority="low"
                  title={item.employeeName}
                  meta={`${item.department} · ${item.leaveType}`}
                />
              ))}
              {data.todayAbsences.remainingCount > 0 && (
                <QueueItem
                  priority="low"
                  title={`기타 ${data.todayAbsences.remainingCount}명`}
                  meta="전사 부서별 분포"
                />
              )}
            </QueueList>
          ) : (
            <div className="flex items-center justify-center py-sp-8">
              <span className="text-sm text-text-tertiary">오늘 부재자가 없습니다</span>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Policy Tab (WI-022) ────────────────────────────────────

interface LeavePolicy {
  id: string;
  name: string;
  type: string;
  description: string | null;
  defaultDays: number;
  carryOverLimit: number;
  requiresApproval: boolean;
  isActive: boolean;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "연차 휴가",
  HALF_DAY: "반차",
  SICK: "병가",
  FAMILY_EVENT: "경조사 휴가",
  COMPENSATORY: "대체 휴가",
};

const LEAVE_TYPE_OPTIONS = [
  { value: "ANNUAL", label: "연차 휴가" },
  { value: "HALF_DAY", label: "반차" },
  { value: "SICK", label: "병가" },
  { value: "FAMILY_EVENT", label: "경조사 휴가" },
  { value: "COMPENSATORY", label: "대체 휴가" },
];

const PAID_TYPES = new Set(["ANNUAL", "HALF_DAY", "COMPENSATORY"]);

interface PolicyFormData {
  name: string;
  type: string;
  description: string;
  defaultDays: string;
  carryOverLimit: string;
  requiresApproval: boolean;
}

const EMPTY_FORM: PolicyFormData = {
  name: "",
  type: "",
  description: "",
  defaultDays: "",
  carryOverLimit: "0",
  requiresApproval: true,
};

function PolicyTab() {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [form, setForm] = useState<PolicyFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave/policies");
      if (res.ok) {
        const json = await res.json();
        setPolicies(json.policies);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  function openCreateModal() {
    setEditingPolicy(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(policy: LeavePolicy) {
    setEditingPolicy(policy);
    setForm({
      name: policy.name,
      type: policy.type,
      description: policy.description ?? "",
      defaultDays: String(policy.defaultDays),
      carryOverLimit: String(policy.carryOverLimit),
      requiresApproval: policy.requiresApproval,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.type || !form.defaultDays) {
      setError("정책명, 휴가 유형, 연간 부여일은 필수입니다");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim() || null,
        defaultDays: Number(form.defaultDays),
        carryOverLimit: Number(form.carryOverLimit || 0),
        requiresApproval: form.requiresApproval,
      };

      const url = editingPolicy
        ? `/api/leave/policies/${editingPolicy.id}`
        : "/api/leave/policies";

      const res = await fetch(url, {
        method: editingPolicy ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        setError(errJson.error || "저장에 실패했습니다");
        return;
      }

      setModalOpen(false);
      fetchPolicies();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(policy: LeavePolicy) {
    await fetch(`/api/leave/policies/${policy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !policy.isActive }),
    });
    fetchPolicies();
  }

  const columns: Column<LeavePolicy>[] = [
    {
      key: "type",
      header: "휴가 유형",
      render: (row) => (
        <span className="font-medium">
          {LEAVE_TYPE_LABELS[row.type] ?? row.type}
        </span>
      ),
    },
    {
      key: "description",
      header: "부여 기준",
      render: (row) => (
        <span className="text-text-secondary">
          {row.description || "-"}
        </span>
      ),
    },
    {
      key: "defaultDays",
      header: "연간 부여일",
      align: "right",
      render: (row) => `${row.defaultDays}일`,
    },
    {
      key: "carryOverLimit",
      header: "이월 한도",
      align: "right",
      render: (row) =>
        row.carryOverLimit > 0
          ? `최대 ${row.carryOverLimit}일`
          : "이월 불가",
    },
    {
      key: "paid",
      header: "유급/무급",
      align: "center",
      render: (row) => (
        <Badge variant={PAID_TYPES.has(row.type) ? "info" : "neutral"}>
          {PAID_TYPES.has(row.type) ? "유급" : "무급"}
        </Badge>
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
            수정
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
          <CardTitle>휴가 정책</CardTitle>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            정책 추가
          </Button>
        </CardHeader>
        <CardBody>
          <DataTable<LeavePolicy>
            columns={columns}
            data={policies}
            keyExtractor={(row) => row.id}
            emptyMessage="등록된 휴가 정책이 없습니다"
          />
        </CardBody>
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPolicy ? "휴가 정책 수정" : "휴가 정책 추가"}
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
          label="정책명"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="예: 연차 휴가"
        />

        <Select
          label="휴가 유형"
          options={LEAVE_TYPE_OPTIONS}
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          placeholder="유형 선택"
          disabled={!!editingPolicy}
        />

        <Textarea
          label="부여 기준 설명"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="예: 근속연수 1년 이상, 연 15일 부여"
          rows={2}
        />

        <div className="grid grid-cols-2 gap-sp-4">
          <Input
            label="연간 부여일"
            type="number"
            min="0"
            step="0.5"
            value={form.defaultDays}
            onChange={(e) => setForm({ ...form, defaultDays: e.target.value })}
            placeholder="15"
          />
          <Input
            label="이월 한도 (일)"
            type="number"
            min="0"
            step="1"
            value={form.carryOverLimit}
            onChange={(e) => setForm({ ...form, carryOverLimit: e.target.value })}
            placeholder="0"
          />
        </div>

        <div className="mb-sp-4">
          <label className="flex items-center gap-sp-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.requiresApproval}
              onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })}
              className="h-4 w-4 rounded border-border text-brand focus:ring-brand/20"
            />
            승인 필요
          </label>
        </div>
      </Modal>
    </>
  );
}

// ─── Requests Tab (WI-023) ──────────────────────────────────

interface LeaveRequestItem {
  id: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  leaveType: string;
  leaveTypeName: string;
  status: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
}

interface RequestsSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const REQUEST_STATUS_FILTERS = [
  { key: "ALL", label: "전체" },
  { key: "PENDING", label: "승인 대기" },
  { key: "APPROVED", label: "승인 완료" },
  { key: "REJECTED", label: "반려" },
] as const;

const REQUEST_STATUS_BADGE: Record<string, { label: string; variant: "warning" | "success" | "danger" | "neutral" }> = {
  PENDING: { label: "승인 대기", variant: "warning" },
  APPROVED: { label: "승인 완료", variant: "success" },
  REJECTED: { label: "반려", variant: "danger" },
  CANCELLED: { label: "취소", variant: "neutral" },
};

const LEAVE_PRIORITY_MAP: Record<string, "high" | "medium" | "low"> = {
  ANNUAL: "high",
  FAMILY_EVENT: "high",
  HALF_DAY: "medium",
  SICK: "medium",
  COMPENSATORY: "low",
};

function formatDateRange(start: string, end: string, days: number): string {
  const s = start.replace(/-/g, "/").slice(5);
  const e = end.replace(/-/g, "/").slice(5);
  const dayStr = days === 0.5 ? "0.5일" : `${days}일`;
  return start === end ? `${s} (${dayStr})` : `${s} ~ ${e} (${dayStr})`;
}

function daysAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  return `${diff}일 전`;
}

function RequestsTab() {
  const [items, setItems] = useState<LeaveRequestItem[]>([]);
  const [summary, setSummary] = useState<RequestsSummary>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<LeaveRequestItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/leave/requests?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items);
        setSummary(json.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionLoading(true);
    try {
      const body: Record<string, string> = { id, action };
      if (action === "reject" && rejectReason.trim()) {
        body.rejectReason = rejectReason.trim();
      }
      const res = await fetch("/api/leave/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSelectedItem(null);
        setRejectReason("");
        await fetchRequests();
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

  return (
    <>
      {/* Filter bar */}
      <div className="mb-sp-4 flex flex-wrap items-center gap-sp-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 검색..."
          className="h-9 w-56 rounded-md border border-border bg-surface-primary px-sp-3 text-sm text-text-primary transition-colors duration-fast placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/10"
        />
        {REQUEST_STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className={[
              "rounded-full px-sp-3 py-sp-1 text-sm font-medium transition-colors duration-fast",
              statusFilter === f.key
                ? "bg-brand text-text-inverse"
                : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary",
            ].join(" ")}
          >
            {f.label}
            {f.key === "PENDING" && summary.pending > 0 && (
              <span className="ml-sp-1">({summary.pending})</span>
            )}
          </button>
        ))}
      </div>

      {/* Queue list */}
      <Card>
        <CardHeader>
          <CardTitle>휴가 신청 큐</CardTitle>
          <Badge variant="info">
            {summary.total}건{summary.pending > 0 ? ` (대기 ${summary.pending})` : ""}
          </Badge>
        </CardHeader>
        <CardBody>
          {items.length === 0 ? (
            <div className="flex items-center justify-center py-sp-8">
              <span className="text-sm text-text-tertiary">
                {statusFilter === "ALL"
                  ? "휴가 신청 내역이 없습니다"
                  : "해당 상태의 신청 내역이 없습니다"}
              </span>
            </div>
          ) : (
            <QueueList>
              {items.map((item) => {
                const priority = item.status === "PENDING"
                  ? (LEAVE_PRIORITY_MAP[item.leaveType] ?? "medium")
                  : "low";
                const statusInfo = REQUEST_STATUS_BADGE[item.status];
                return (
                  <QueueItem
                    key={item.id}
                    priority={priority}
                    title={`${item.employeeName} — ${LEAVE_TYPE_LABELS[item.leaveType] ?? item.leaveTypeName} (${formatDateRange(item.startDate, item.endDate, item.days)})`}
                    meta={`${item.department} · ${item.reason || "-"} · ${daysAgo(item.createdAt)}`}
                    action={
                      <div className="flex items-center gap-sp-2">
                        {statusInfo && (
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        )}
                        {item.status === "PENDING" ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAction(item.id, "approve")}
                              disabled={actionLoading}
                            >
                              승인
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setRejectReason("");
                              }}
                            >
                              반려
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                          >
                            상세
                          </Button>
                        )}
                      </div>
                    }
                  />
                );
              })}
            </QueueList>
          )}
        </CardBody>
      </Card>

      {/* Detail Drawer */}
      <Drawer
        open={!!selectedItem}
        onClose={() => {
          setSelectedItem(null);
          setRejectReason("");
        }}
        title="휴가 신청 상세"
        size="md"
        footer={
          selectedItem?.status === "PENDING" ? (
            <div className="flex justify-end gap-sp-3">
              <Button
                variant="danger"
                size="sm"
                onClick={() => selectedItem && handleAction(selectedItem.id, "reject")}
                disabled={actionLoading}
              >
                반려
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => selectedItem && handleAction(selectedItem.id, "approve")}
                disabled={actionLoading}
              >
                승인
              </Button>
            </div>
          ) : undefined
        }
      >
        {selectedItem && (
          <div className="space-y-sp-4">
            <RequestDetailRow label="상태">
              {REQUEST_STATUS_BADGE[selectedItem.status] && (
                <Badge variant={REQUEST_STATUS_BADGE[selectedItem.status].variant}>
                  {REQUEST_STATUS_BADGE[selectedItem.status].label}
                </Badge>
              )}
            </RequestDetailRow>
            <RequestDetailRow label="신청자" value={selectedItem.employeeName} />
            <RequestDetailRow label="사번" value={selectedItem.employeeNumber} />
            <RequestDetailRow label="부서" value={selectedItem.department} />
            <RequestDetailRow label="휴가 유형">
              <Badge variant="info">
                {LEAVE_TYPE_LABELS[selectedItem.leaveType] ?? selectedItem.leaveTypeName}
              </Badge>
            </RequestDetailRow>
            <RequestDetailRow
              label="기간"
              value={formatDateRange(selectedItem.startDate, selectedItem.endDate, selectedItem.days)}
            />
            <RequestDetailRow label="일수" value={`${selectedItem.days}일`} />
            <RequestDetailRow label="사유" value={selectedItem.reason || "-"} />
            <RequestDetailRow label="신청일" value={selectedItem.createdAt.slice(0, 10)} />

            {selectedItem.status === "APPROVED" && selectedItem.approvedAt && (
              <RequestDetailRow label="승인일" value={selectedItem.approvedAt.slice(0, 10)} />
            )}

            {selectedItem.status === "REJECTED" && (
              <>
                {selectedItem.rejectedAt && (
                  <RequestDetailRow label="반려일" value={selectedItem.rejectedAt.slice(0, 10)} />
                )}
                {selectedItem.rejectReason && (
                  <RequestDetailRow label="반려 사유" value={selectedItem.rejectReason} />
                )}
              </>
            )}

            {selectedItem.status === "PENDING" && (
              <div className="mt-sp-4">
                <Textarea
                  label="반려 사유 (선택)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="반려 시 사유를 입력하세요"
                  rows={3}
                />
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}

function RequestDetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-sp-4">
      <span className="w-24 shrink-0 text-sm font-medium text-text-secondary">
        {label}
      </span>
      <span className="text-sm text-text-primary">
        {children ?? value ?? "-"}
      </span>
    </div>
  );
}
