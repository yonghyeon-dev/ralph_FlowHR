"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  KPICard,
  KPIGrid,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { Modal } from "@/components/layout/Modal";

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
      {activeTab === "templates" && <TemplatesTab />}
      {activeTab === "send" && <SendTab />}
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

// ─── Templates Tab (WI-031) ─────────────────────────────

interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  version: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  CONTRACT: "계약서",
  NOTICE: "통지서",
  NDA: "비밀유지계약",
  CERTIFICATE: "증명서",
};

const CATEGORY_OPTIONS = [
  { value: "CONTRACT", label: "계약서" },
  { value: "NOTICE", label: "통지서" },
  { value: "NDA", label: "비밀유지계약" },
  { value: "CERTIFICATE", label: "증명서" },
];

const CATEGORY_BADGE_VARIANT: Record<string, "info" | "success" | "warning" | "neutral"> = {
  CONTRACT: "info",
  NOTICE: "success",
  NDA: "warning",
  CERTIFICATE: "neutral",
};

interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  version: string;
}

const EMPTY_TEMPLATE_FORM: TemplateFormData = {
  name: "",
  description: "",
  category: "",
  version: "1.0",
};

function TemplatesTab() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormData>(EMPTY_TEMPLATE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents/templates");
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.templates);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function openCreateModal() {
    setEditingTemplate(null);
    setForm(EMPTY_TEMPLATE_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(template: DocumentTemplate) {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      description: template.description ?? "",
      category: template.category,
      version: template.version,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.category) {
      setError("템플릿명과 카테고리는 필수입니다");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        version: form.version.trim() || "1.0",
      };

      const url = editingTemplate
        ? `/api/documents/templates/${editingTemplate.id}`
        : "/api/documents/templates";

      const res = await fetch(url, {
        method: editingTemplate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        setError(errJson.error || "저장에 실패했습니다");
        return;
      }

      setModalOpen(false);
      fetchTemplates();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(template: DocumentTemplate) {
    await fetch(`/api/documents/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !template.isActive }),
    });
    fetchTemplates();
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
      {/* Header */}
      <div className="mb-sp-4 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {templates.length}개 템플릿 · 활성 {templates.filter((t) => t.isActive).length}개
        </p>
        <Button variant="primary" size="sm" onClick={openCreateModal}>
          템플릿 추가
        </Button>
      </div>

      {/* 4-Card Grid */}
      {templates.length === 0 ? (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">
            등록된 템플릿이 없습니다
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-sp-4 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((template) => (
            <Card key={template.id} className={!template.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <Badge variant={CATEGORY_BADGE_VARIANT[template.category] ?? "neutral"}>
                  {CATEGORY_LABELS[template.category] ?? template.category}
                </Badge>
                <span className="text-xs text-text-tertiary">v{template.version}</span>
              </CardHeader>
              <CardBody>
                <h3 className="mb-sp-1 text-sm font-semibold text-text-primary">
                  {template.name}
                </h3>
                <p className="mb-sp-3 line-clamp-2 text-xs text-text-secondary">
                  {template.description || "설명 없음"}
                </p>
                <div className="mb-sp-3 flex items-center justify-between text-xs text-text-tertiary">
                  <span>사용 {template.usageCount}회</span>
                  <Badge variant={template.isActive ? "success" : "danger"} >
                    {template.isActive ? "활성" : "비활성"}
                  </Badge>
                </div>
                <div className="flex gap-sp-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(template)}
                    className="flex-1"
                  >
                    수정
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(template)}
                    className="flex-1"
                  >
                    {template.isActive ? "비활성화" : "활성화"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTemplate ? "템플릿 수정" : "템플릿 추가"}
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
          label="템플릿명"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="예: 근로계약서"
        />

        <Select
          label="카테고리"
          options={CATEGORY_OPTIONS}
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="카테고리 선택"
          disabled={!!editingTemplate}
        />

        <Textarea
          label="설명"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="템플릿에 대한 간단한 설명을 입력하세요"
          rows={3}
        />

        <Input
          label="버전"
          value={form.version}
          onChange={(e) => setForm({ ...form, version: e.target.value })}
          placeholder="1.0"
        />
      </Modal>
    </>
  );
}

// ─── Send Tab (WI-032) ──────────────────────────────────

interface RecipientEmployee {
  id: string;
  name: string;
  email: string;
  department: { id: string; name: string } | null;
  position: { id: string; name: string; level: number } | null;
}

interface SendFormData {
  templateId: string;
  recipientIds: string[];
  deadline: string;
  memo: string;
  notifyEmail: boolean;
  notifyReminder: boolean;
}

const EMPTY_SEND_FORM: SendFormData = {
  templateId: "",
  recipientIds: [],
  deadline: "",
  memo: "",
  notifyEmail: true,
  notifyReminder: false,
};

function SendTab() {
  const [form, setForm] = useState<SendFormData>(EMPTY_SEND_FORM);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientEmployee[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<RecipientEmployee[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const searchTimeoutRef = useCallback(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    return {
      set: (fn: () => void, ms: number) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(fn, ms);
      },
      clear: () => {
        if (timeoutId) clearTimeout(timeoutId);
      },
    };
  }, [])();

  // 템플릿 로드
  useEffect(() => {
    async function loadTemplates() {
      setLoadingTemplates(true);
      try {
        const res = await fetch("/api/documents/templates");
        if (res.ok) {
          const json = await res.json();
          setTemplates(json.templates.filter((t: DocumentTemplate) => t.isActive));
        }
      } finally {
        setLoadingTemplates(false);
      }
    }
    loadTemplates();
  }, []);

  // 기본 마감일: 오늘 + 7일
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setForm((prev) => ({ ...prev, deadline: `${yyyy}-${mm}-${dd}` }));
  }, []);

  // 수신자 검색
  useEffect(() => {
    if (!recipientSearch.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    searchTimeoutRef.set(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/employees?search=${encodeURIComponent(recipientSearch)}&status=ACTIVE&pageSize=10`,
        );
        if (res.ok) {
          const json = await res.json();
          const filtered = (json.data as RecipientEmployee[]).filter(
            (emp) => !form.recipientIds.includes(emp.id),
          );
          setSearchResults(filtered);
          setShowSearchDropdown(true);
        }
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => searchTimeoutRef.clear();
  }, [recipientSearch, form.recipientIds, searchTimeoutRef]);

  function addRecipient(emp: RecipientEmployee) {
    setSelectedRecipients((prev) => [...prev, emp]);
    setForm((prev) => ({
      ...prev,
      recipientIds: [...prev.recipientIds, emp.id],
    }));
    setRecipientSearch("");
    setShowSearchDropdown(false);
  }

  function removeRecipient(empId: string) {
    setSelectedRecipients((prev) => prev.filter((r) => r.id !== empId));
    setForm((prev) => ({
      ...prev,
      recipientIds: prev.recipientIds.filter((id) => id !== empId),
    }));
  }

  async function handleSubmit(isDraft: boolean) {
    setError(null);
    setSuccess(null);

    if (!form.templateId) {
      setError("문서 템플릿을 선택해주세요");
      return;
    }
    if (form.recipientIds.length === 0) {
      setError("수신자를 1명 이상 선택해주세요");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/documents/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isDraft }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        setError(errJson.error || "발송에 실패했습니다");
        return;
      }

      const result = await res.json();
      setSuccess(result.message);

      // 발송 후 폼 초기화
      if (!isDraft) {
        setForm((prev) => ({
          ...EMPTY_SEND_FORM,
          deadline: prev.deadline,
        }));
        setSelectedRecipients([]);
      }
    } finally {
      setSending(false);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === form.templateId);

  return (
    <Card>
      <CardHeader>
        <span className="text-lg font-semibold text-text-primary">새 문서 발송</span>
      </CardHeader>
      <CardBody>
        {error && (
          <div className="mb-sp-4 rounded-sm bg-status-danger-bg px-sp-3 py-sp-2 text-sm text-status-danger-text">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-sp-4 rounded-sm bg-status-success-bg px-sp-3 py-sp-2 text-sm text-status-success-text">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-sp-6 lg:grid-cols-2">
          {/* 좌측: 폼 입력 */}
          <div>
            {/* 수신자 선택 */}
            <div className="mb-sp-4">
              <label className="block text-sm font-medium text-text-secondary mb-sp-1">
                수신자
              </label>
              {/* 선택된 수신자 뱃지 */}
              {selectedRecipients.length > 0 && (
                <div className="mb-sp-2 flex flex-wrap gap-sp-1">
                  {selectedRecipients.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-sp-1 rounded-sm bg-brand/10 px-sp-2 py-sp-1 text-xs text-brand-text"
                    >
                      {r.name}
                      {r.department && (
                        <span className="text-text-tertiary">({r.department.name})</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeRecipient(r.id)}
                        className="ml-sp-1 text-text-tertiary hover:text-status-danger-text"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* 검색 입력 */}
              <div className="relative">
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchDropdown(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSearchDropdown(false), 200);
                  }}
                  placeholder="이름 또는 부서 검색..."
                  className="w-full px-sp-3 py-sp-2 border rounded-sm text-md font-sans bg-surface-primary text-text-primary transition-colors duration-fast focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand/10 border-border"
                />
                {searching && (
                  <span className="absolute right-sp-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
                    검색 중...
                  </span>
                )}
                {/* 검색 드롭다운 */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 mt-sp-1 w-full rounded-sm border border-border bg-surface-primary shadow-md">
                    {searchResults.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addRecipient(emp)}
                        className="flex w-full items-center gap-sp-2 px-sp-3 py-sp-2 text-left text-sm hover:bg-surface-secondary"
                      >
                        <span className="font-medium text-text-primary">{emp.name}</span>
                        {emp.department && (
                          <span className="text-xs text-text-tertiary">
                            {emp.department.name}
                          </span>
                        )}
                        {emp.position && (
                          <span className="text-xs text-text-tertiary">
                            {emp.position.name}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 문서 템플릿 */}
            <Select
              label="문서 템플릿"
              options={
                loadingTemplates
                  ? [{ value: "", label: "불러오는 중..." }]
                  : templates.map((t) => ({
                      value: t.id,
                      label: `${t.name} (v${t.version})`,
                    }))
              }
              value={form.templateId}
              onChange={(e) => setForm({ ...form, templateId: e.target.value })}
              placeholder="템플릿 선택"
            />

            {/* 서명 마감일 */}
            <Input
              label="서명 마감일"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />

            {/* 메모 */}
            <Textarea
              label="메모 (선택)"
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              placeholder="수신자에게 전달할 메모를 입력하세요..."
              rows={4}
            />
          </div>

          {/* 우측: 미리보기 + 알림 토글 */}
          <div>
            {/* 발송 미리보기 */}
            <div className="mb-sp-4">
              <span className="block text-sm font-semibold text-text-primary mb-sp-2">
                발송 미리보기
              </span>
              <div className="rounded-md bg-surface-secondary p-sp-4" style={{ minHeight: 200 }}>
                {selectedTemplate ? (
                  <>
                    <p className="mb-sp-2 text-sm text-text-secondary">
                      {selectedTemplate.name} (v{selectedTemplate.version})
                    </p>
                    <div className="rounded-sm border border-dashed border-border p-sp-8 text-center">
                      <Badge variant={CATEGORY_BADGE_VARIANT[selectedTemplate.category] ?? "neutral"}>
                        {CATEGORY_LABELS[selectedTemplate.category] ?? selectedTemplate.category}
                      </Badge>
                      <p className="mt-sp-2 text-sm text-text-tertiary">
                        {selectedTemplate.description || "문서 미리보기 영역"}
                      </p>
                      {selectedRecipients.length > 0 && (
                        <p className="mt-sp-3 text-xs text-text-tertiary">
                          수신자: {selectedRecipients.map((r) => r.name).join(", ")}
                        </p>
                      )}
                      {form.deadline && (
                        <p className="mt-sp-1 text-xs text-text-tertiary">
                          마감일: {form.deadline}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-sm border border-dashed border-border p-sp-8 text-center">
                    <span className="text-sm text-text-tertiary">
                      템플릿을 선택하면 미리보기가 표시됩니다
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 알림 토글: 서명 알림 이메일 */}
            <div className="mb-sp-4 flex items-center gap-sp-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.notifyEmail}
                onClick={() => setForm({ ...form, notifyEmail: !form.notifyEmail })}
                className={[
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-fast",
                  form.notifyEmail ? "bg-brand" : "bg-border",
                ].join(" ")}
              >
                <span
                  className={[
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-fast",
                    form.notifyEmail ? "translate-x-5" : "translate-x-0.5",
                  ].join(" ")}
                  style={{ marginTop: 2 }}
                />
              </button>
              <span className="text-sm text-text-primary">서명 알림 이메일 발송</span>
            </div>

            {/* 알림 토글: 마감일 자동 리마인더 */}
            <div className="mb-sp-4 flex items-center gap-sp-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.notifyReminder}
                onClick={() => setForm({ ...form, notifyReminder: !form.notifyReminder })}
                className={[
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-fast",
                  form.notifyReminder ? "bg-brand" : "bg-border",
                ].join(" ")}
              >
                <span
                  className={[
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-fast",
                    form.notifyReminder ? "translate-x-5" : "translate-x-0.5",
                  ].join(" ")}
                  style={{ marginTop: 2 }}
                />
              </button>
              <span className="text-sm text-text-primary">마감일 자동 리마인더</span>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="mt-sp-6 flex justify-end gap-sp-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSubmit(true)}
            disabled={sending}
          >
            임시 저장
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSubmit(false)}
            disabled={sending}
          >
            {sending ? "발송 중..." : "발송하기"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
