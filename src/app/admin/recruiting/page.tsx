"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import type { DragEvent } from "react";
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
} from "@/components/ui";
import type { Column } from "@/components/ui";
import { Modal } from "@/components/layout/Modal";

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
      {activeTab === "postings" && <PostingsTab />}
      {activeTab === "pipeline" && <PipelineTab />}
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

// ─── Postings Tab (WI-046) ──────────────────────────────────

interface JobPosting {
  id: string;
  title: string;
  departmentId: string | null;
  positionId: string | null;
  hiringManagerId: string;
  status: string;
  description: string | null;
  requirements: string | null;
  location: string | null;
  employmentType: string;
  headcount: number;
  openDate: string | null;
  closeDate: string | null;
  _count: { applications: number };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "임시저장",
  OPEN: "모집 중",
  CLOSED: "마감",
  CANCELLED: "취소",
};

const STATUS_VARIANTS: Record<string, "info" | "success" | "neutral" | "danger"> = {
  DRAFT: "neutral",
  OPEN: "success",
  CLOSED: "info",
  CANCELLED: "danger",
};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "임시저장" },
  { value: "OPEN", label: "모집 중" },
  { value: "CLOSED", label: "마감" },
  { value: "CANCELLED", label: "취소" },
];

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "정규직",
  PART_TIME: "파트타임",
  CONTRACT: "계약직",
  INTERN: "인턴",
};

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "FULL_TIME", label: "정규직" },
  { value: "PART_TIME", label: "파트타임" },
  { value: "CONTRACT", label: "계약직" },
  { value: "INTERN", label: "인턴" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "OPEN", label: "모집 중" },
  { value: "CLOSED", label: "마감" },
  { value: "DRAFT", label: "임시저장" },
  { value: "CANCELLED", label: "취소" },
];

interface PostingFormData {
  title: string;
  status: string;
  description: string;
  requirements: string;
  location: string;
  employmentType: string;
  headcount: string;
  openDate: string;
  closeDate: string;
}

const EMPTY_FORM: PostingFormData = {
  title: "",
  status: "DRAFT",
  description: "",
  requirements: "",
  location: "",
  employmentType: "FULL_TIME",
  headcount: "1",
  openDate: "",
  closeDate: "",
};

function PostingsTab() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPosting, setEditingPosting] = useState<JobPosting | null>(null);
  const [form, setForm] = useState<PostingFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchPostings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recruiting/postings");
      if (res.ok) {
        const json = await res.json();
        setPostings(json.postings);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPostings();
  }, [fetchPostings]);

  function openCreateModal() {
    setEditingPosting(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(posting: JobPosting) {
    setEditingPosting(posting);
    setForm({
      title: posting.title,
      status: posting.status,
      description: posting.description ?? "",
      requirements: posting.requirements ?? "",
      location: posting.location ?? "",
      employmentType: posting.employmentType,
      headcount: String(posting.headcount),
      openDate: posting.openDate ? posting.openDate.slice(0, 10) : "",
      closeDate: posting.closeDate ? posting.closeDate.slice(0, 10) : "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("공고 제목은 필수입니다");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: form.title.trim(),
        hiringManagerId: editingPosting?.hiringManagerId ?? "seed-emp-001",
        status: form.status,
        description: form.description.trim() || null,
        requirements: form.requirements.trim() || null,
        location: form.location.trim() || null,
        employmentType: form.employmentType,
        headcount: Number(form.headcount || 1),
        openDate: form.openDate || null,
        closeDate: form.closeDate || null,
      };

      const url = editingPosting
        ? `/api/recruiting/postings/${editingPosting.id}`
        : "/api/recruiting/postings";

      const res = await fetch(url, {
        method: editingPosting ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        setError(errJson.error || "저장에 실패했습니다");
        return;
      }

      setModalOpen(false);
      fetchPostings();
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(posting: JobPosting) {
    await fetch(`/api/recruiting/postings/${posting.id}`, {
      method: "DELETE",
    });
    fetchPostings();
  }

  const filteredPostings =
    statusFilter === "ALL"
      ? postings
      : postings.filter((p) => p.status === statusFilter);

  const columns: Column<JobPosting>[] = [
    {
      key: "title",
      header: "포지션명",
      render: (row) => (
        <span className="font-medium text-text-primary">{row.title}</span>
      ),
    },
    {
      key: "employmentType",
      header: "고용 유형",
      render: (row) => (
        <span className="text-text-secondary">
          {EMPLOYMENT_TYPE_LABELS[row.employmentType] ?? row.employmentType}
        </span>
      ),
    },
    {
      key: "status",
      header: "상태",
      align: "center",
      render: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status] ?? "neutral"}>
          {STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "applications",
      header: "지원자",
      align: "right",
      render: (row) => `${row._count.applications}명`,
    },
    {
      key: "headcount",
      header: "채용 인원",
      align: "right",
      render: (row) => `${row.headcount}명`,
    },
    {
      key: "closeDate",
      header: "마감일",
      render: (row) =>
        row.closeDate
          ? new Date(row.closeDate).toLocaleDateString("ko-KR")
          : "-",
    },
    {
      key: "actions",
      header: "액션",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-sp-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
          >
            관리
          </Button>
          {row.status !== "CANCELLED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCancel(row)}
            >
              취소
            </Button>
          )}
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
          <div className="flex items-center gap-sp-4">
            <CardTitle>채용 공고</CardTitle>
            <div className="flex gap-sp-1">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={[
                    "rounded-full px-sp-3 py-sp-1 text-xs font-medium transition-colors",
                    statusFilter === opt.value
                      ? "bg-brand text-white"
                      : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            공고 등록
          </Button>
        </CardHeader>
        <CardBody>
          <DataTable<JobPosting>
            columns={columns}
            data={filteredPostings}
            keyExtractor={(row) => row.id}
            emptyMessage="등록된 채용 공고가 없습니다"
          />
        </CardBody>
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPosting ? "채용 공고 수정" : "채용 공고 등록"}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
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
          label="포지션명"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="예: 프론트엔드 개발자"
        />

        <div className="grid grid-cols-2 gap-sp-4">
          <Select
            label="공고 상태"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
          <Select
            label="고용 유형"
            options={EMPLOYMENT_TYPE_OPTIONS}
            value={form.employmentType}
            onChange={(e) =>
              setForm({ ...form, employmentType: e.target.value })
            }
          />
        </div>

        <Input
          label="근무 위치"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="예: 서울 강남구"
        />

        <div className="grid grid-cols-3 gap-sp-4">
          <Input
            label="채용 인원"
            type="number"
            min="1"
            value={form.headcount}
            onChange={(e) => setForm({ ...form, headcount: e.target.value })}
          />
          <Input
            label="공고 시작일"
            type="date"
            value={form.openDate}
            onChange={(e) => setForm({ ...form, openDate: e.target.value })}
          />
          <Input
            label="마감일"
            type="date"
            value={form.closeDate}
            onChange={(e) => setForm({ ...form, closeDate: e.target.value })}
          />
        </div>

        <Textarea
          label="직무 설명"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="담당 업무 및 직무 설명을 입력하세요"
          rows={3}
        />

        <Textarea
          label="자격 요건"
          value={form.requirements}
          onChange={(e) => setForm({ ...form, requirements: e.target.value })}
          placeholder="필수/우대 자격 요건을 입력하세요"
          rows={3}
        />
      </Modal>
    </>
  );
}

// ─── Pipeline Tab (WI-047) ──────────────────────────────────

interface PipelineApplication {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  status: string;
  stage: number;
  rating: number | null;
  notes: string | null;
  appliedAt: string;
  hiredAt: string | null;
  rejectedAt: string | null;
  jobPostingId: string;
  jobPosting: { title: string };
}

interface PipelinePostingOption {
  id: string;
  title: string;
  status: string;
  _count: { applications: number };
}

const PIPELINE_COLUMNS = [
  { status: "SCREENING", stage: 1, label: "서류 접수" },
  { status: "FIRST_INTERVIEW", stage: 2, label: "1차 면접" },
  { status: "SECOND_INTERVIEW", stage: 3, label: "2차 면접" },
  { status: "FINAL", stage: 4, label: "최종" },
] as const;

const PIPELINE_STATUS_MAP: Record<string, string> = {
  APPLIED: "SCREENING",
  SCREENING: "SCREENING",
  FIRST_INTERVIEW: "FIRST_INTERVIEW",
  SECOND_INTERVIEW: "SECOND_INTERVIEW",
  FINAL: "FINAL",
};

const APP_STATUS_BADGES: Record<string, { label: string; variant: "info" | "success" | "neutral" | "warning" | "danger" }> = {
  OFFER: { label: "오퍼 발송", variant: "success" },
  HIRED: { label: "채용 확정", variant: "success" },
  REJECTED: { label: "불합격", variant: "danger" },
  WITHDRAWN: { label: "지원 철회", variant: "neutral" },
};

function PipelineTab() {
  const [applications, setApplications] = useState<PipelineApplication[]>([]);
  const [postings, setPostings] = useState<PipelinePostingOption[]>([]);
  const [selectedPostingId, setSelectedPostingId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  const fetchPostings = useCallback(async () => {
    const res = await fetch("/api/recruiting/postings");
    if (res.ok) {
      const json = await res.json();
      const openPostings = (json.postings as PipelinePostingOption[]).filter(
        (p) => p.status === "OPEN",
      );
      setPostings(openPostings);
      if (openPostings.length > 0 && !selectedPostingId) {
        setSelectedPostingId(openPostings[0].id);
      }
    }
  }, [selectedPostingId]);

  const fetchApplications = useCallback(async () => {
    if (!selectedPostingId) {
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/recruiting/applications?jobPostingId=${selectedPostingId}`,
      );
      if (res.ok) {
        const json = await res.json();
        setApplications(json.applications);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPostingId]);

  useEffect(() => {
    fetchPostings();
  }, [fetchPostings]);

  useEffect(() => {
    if (selectedPostingId) {
      fetchApplications();
    }
  }, [selectedPostingId, fetchApplications]);

  function getColumnApps(columnStatus: string): PipelineApplication[] {
    return applications.filter((app) => {
      const mapped = PIPELINE_STATUS_MAP[app.status];
      return mapped === columnStatus;
    });
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, appId: string) {
    setDraggedAppId(appId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", appId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }

  function handleDragEnd(e: DragEvent<HTMLDivElement>) {
    setDraggedAppId(null);
    setDragOverColumn(null);
    dragCounterRef.current = {};
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>, columnStatus: string) {
    e.preventDefault();
    const counters = dragCounterRef.current;
    counters[columnStatus] = (counters[columnStatus] || 0) + 1;
    setDragOverColumn(columnStatus);
  }

  function handleDragLeave(_e: DragEvent<HTMLDivElement>, columnStatus: string) {
    const counters = dragCounterRef.current;
    counters[columnStatus] = (counters[columnStatus] || 0) - 1;
    if (counters[columnStatus] <= 0) {
      counters[columnStatus] = 0;
      if (dragOverColumn === columnStatus) {
        setDragOverColumn(null);
      }
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>, targetColumn: typeof PIPELINE_COLUMNS[number]) {
    e.preventDefault();
    setDragOverColumn(null);
    dragCounterRef.current = {};

    const appId = e.dataTransfer.getData("text/plain");
    if (!appId) return;

    const app = applications.find((a) => a.id === appId);
    if (!app) return;

    const currentMapped = PIPELINE_STATUS_MAP[app.status];
    if (currentMapped === targetColumn.status) return;

    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? { ...a, status: targetColumn.status, stage: targetColumn.stage }
          : a,
      ),
    );

    try {
      const res = await fetch(`/api/recruiting/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetColumn.status,
          stage: targetColumn.stage,
        }),
      });

      if (!res.ok) {
        fetchApplications();
      }
    } catch {
      fetchApplications();
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      month: "numeric",
      day: "numeric",
    });
  }

  function renderStars(rating: number | null): string {
    if (!rating) return "";
    return Array.from({ length: 5 }, (_, i) => (i < rating ? "\u2605" : "\u2606")).join("");
  }

  const selectedPosting = postings.find((p) => p.id === selectedPostingId);

  if (loading && postings.length === 0) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  if (postings.length === 0) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">
          진행 중인 채용 공고가 없습니다
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Posting selector */}
      <div className="mb-sp-4 flex items-center gap-sp-4">
        <Select
          label=""
          options={postings.map((p) => ({
            value: p.id,
            label: `${p.title} (${p._count.applications}명)`,
          }))}
          value={selectedPostingId}
          onChange={(e) => setSelectedPostingId(e.target.value)}
        />
        {selectedPosting && (
          <span className="text-sm text-text-secondary">
            총 {applications.length}명 지원
          </span>
        )}
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-sp-4">
          {PIPELINE_COLUMNS.map((col) => {
            const columnApps = getColumnApps(col.status);
            const isOver = dragOverColumn === col.status;

            return (
              <div
                key={col.status}
                onDragEnter={(e) => handleDragEnter(e, col.status)}
                onDragLeave={(e) => handleDragLeave(e, col.status)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
                className={[
                  "rounded-md border-2 transition-colors duration-fast",
                  isOver && draggedAppId
                    ? "border-brand bg-brand/5"
                    : "border-transparent",
                ].join(" ")}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>{col.label}</CardTitle>
                    <Badge variant={col.status === "FINAL" ? "success" : "info"}>
                      {columnApps.length}명
                    </Badge>
                  </CardHeader>
                  <CardBody>
                    <div className="flex flex-col gap-sp-3">
                      {columnApps.length === 0 ? (
                        <div className="flex items-center justify-center py-sp-6">
                          <span className="text-xs text-text-tertiary">
                            지원자 없음
                          </span>
                        </div>
                      ) : (
                        columnApps.map((app) => {
                          const extraBadge = APP_STATUS_BADGES[app.status];
                          return (
                            <div
                              key={app.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, app.id)}
                              onDragEnd={handleDragEnd}
                              className={[
                                "cursor-grab rounded-md border border-border bg-surface-primary p-sp-3",
                                "transition-shadow duration-fast hover:shadow-md",
                                "active:cursor-grabbing",
                                draggedAppId === app.id ? "opacity-50" : "",
                              ].join(" ")}
                            >
                              <div className="flex items-center gap-sp-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand-text">
                                  {app.candidateName.charAt(0)}
                                </div>
                                <span className="font-semibold text-text-primary">
                                  {app.candidateName}
                                </span>
                              </div>
                              <div className="mt-sp-1 text-xs text-text-tertiary">
                                {formatDate(app.appliedAt)} 접수
                                {app.rating ? (
                                  <span className="ml-sp-2 text-yellow-500">
                                    {renderStars(app.rating)}
                                  </span>
                                ) : null}
                              </div>
                              {app.notes && (
                                <div className="mt-sp-1 truncate text-xs text-text-secondary">
                                  {app.notes}
                                </div>
                              )}
                              {extraBadge && (
                                <div className="mt-sp-2">
                                  <Badge variant={extraBadge.variant}>
                                    {extraBadge.label}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
