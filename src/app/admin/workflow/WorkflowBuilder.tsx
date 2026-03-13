"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Button,
  Input,
  Select,
  DataTable,
} from "@/components/ui";
import type { BadgeVariant, Column } from "@/components/ui";
import { Modal } from "@/components/layout/Modal";

// ─── Types ──────────────────────────────────────────────────

interface WorkflowStep {
  order: number;
  role: string;
  label: string;
}

interface WorkflowCondition {
  field: string;
  rules: { operator: string; value: string; action: string }[];
}

interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  steps: WorkflowStep[];
  conditions: WorkflowCondition[] | null;
  createdAt: string;
  updatedAt: string;
  _count: { approvalRequests: number };
}

interface WorkflowFormData {
  name: string;
  description: string;
  triggerType: string;
  status: string;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
}

// ─── Constants ──────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "OVERTIME", label: "초과근무 신청" },
  { value: "LEAVE", label: "휴가 신청" },
  { value: "EXPENSE", label: "경비 정산" },
  { value: "SALARY_CHANGE", label: "연봉 변경" },
];

const TRIGGER_LABELS: Record<string, string> = {
  OVERTIME: "초과근무 신청",
  LEAVE: "휴가 신청",
  EXPENSE: "경비 정산",
  SALARY_CHANGE: "연봉 변경",
};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "초안" },
  { value: "ACTIVE", label: "활성" },
  { value: "INACTIVE", label: "비활성" },
];

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "활성", variant: "success" },
  INACTIVE: { label: "비활성", variant: "neutral" },
  DRAFT: { label: "초안", variant: "warning" },
};

const STEP_ICONS = ["T", "C", "A", "B", "N"] as const;

const STEP_LABELS: Record<string, string> = {
  T: "트리거",
  C: "조건 분기",
  A: "1차 승인",
  B: "2차 승인",
  N: "알림",
};

const ROLE_OPTIONS = [
  { value: "직속 팀장", label: "직속 팀장" },
  { value: "HR 담당자", label: "HR 담당자" },
  { value: "인사팀장", label: "인사팀장" },
  { value: "재무팀장", label: "재무팀장" },
  { value: "부서장", label: "부서장" },
];

const EMPTY_FORM: WorkflowFormData = {
  name: "",
  description: "",
  triggerType: "OVERTIME",
  status: "DRAFT",
  steps: [
    { order: 1, role: "직속 팀장", label: "1차 승인" },
    { order: 2, role: "HR 담당자", label: "2차 승인" },
  ],
  conditions: [
    {
      field: "weeklyHours",
      rules: [
        { operator: "lte", value: "40", action: "자동 승인" },
        { operator: "between", value: "40-48", action: "팀장 승인" },
        { operator: "gt", value: "48", action: "팀장 + HR 승인" },
      ],
    },
  ],
};

// ─── Main Component ─────────────────────────────────────────

function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowItem | null>(null);
  const [form, setForm] = useState<WorkflowFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewWorkflow, setPreviewWorkflow] = useState<WorkflowItem | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workflow/workflows");
      if (res.ok) {
        const json = await res.json();
        setWorkflows(json.workflows ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  function openCreateModal() {
    setEditingWorkflow(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(workflow: WorkflowItem) {
    setEditingWorkflow(workflow);
    setForm({
      name: workflow.name,
      description: workflow.description ?? "",
      triggerType: workflow.triggerType,
      status: workflow.status,
      steps: Array.isArray(workflow.steps) ? workflow.steps as WorkflowStep[] : [],
      conditions: Array.isArray(workflow.conditions)
        ? workflow.conditions as WorkflowCondition[]
        : [],
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("워크플로우 이름을 입력하세요");
      return;
    }
    if (!form.triggerType) {
      setError("트리거 유형을 선택하세요");
      return;
    }
    if (form.steps.length === 0) {
      setError("최소 1개의 승인 단계를 추가하세요");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        triggerType: form.triggerType,
        status: form.status,
        steps: form.steps,
        conditions: form.conditions.length > 0 ? form.conditions : null,
      };

      const url = editingWorkflow
        ? `/api/workflow/workflows/${editingWorkflow.id}`
        : "/api/workflow/workflows";
      const method = editingWorkflow ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "저장에 실패했습니다");
        return;
      }

      setModalOpen(false);
      fetchWorkflows();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/workflow/workflows/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "삭제에 실패했습니다");
    }
    setDeleteConfirm(null);
    fetchWorkflows();
  }

  // ─── Step Management ────────────────────────────────────────

  function addStep() {
    setForm((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          order: prev.steps.length + 1,
          role: "직속 팀장",
          label: `${prev.steps.length + 1}차 승인`,
        },
      ],
    }));
  }

  function removeStep(index: number) {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1, label: `${i + 1}차 승인` })),
    }));
  }

  function updateStep(index: number, field: keyof WorkflowStep, value: string) {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) =>
        i === index ? { ...s, [field]: field === "order" ? Number(value) : value } : s,
      ),
    }));
  }

  // ─── Condition Management ───────────────────────────────────

  function addConditionRule() {
    setForm((prev) => {
      const conditions = prev.conditions.length > 0
        ? prev.conditions.map((c, i) =>
            i === 0
              ? { ...c, rules: [...c.rules, { operator: "gt", value: "", action: "" }] }
              : c,
          )
        : [{ field: "weeklyHours", rules: [{ operator: "gt", value: "", action: "" }] }];
      return { ...prev, conditions };
    });
  }

  function updateConditionRule(
    ruleIndex: number,
    field: string,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, ci) =>
        ci === 0
          ? {
              ...c,
              rules: c.rules.map((r, ri) =>
                ri === ruleIndex ? { ...r, [field]: value } : r,
              ),
            }
          : c,
      ),
    }));
  }

  function removeConditionRule(ruleIndex: number) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, ci) =>
        ci === 0
          ? { ...c, rules: c.rules.filter((_, ri) => ri !== ruleIndex) }
          : c,
      ),
    }));
  }

  // ─── Table Columns ──────────────────────────────────────────

  const columns: Column<WorkflowItem>[] = [
    {
      key: "name",
      header: "워크플로우",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-text-primary">{row.name}</span>
          {row.description && (
            <p className="text-xs text-text-tertiary mt-sp-1">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "triggerType",
      header: "트리거",
      sortable: true,
      render: (row) => (
        <Badge variant="info">{TRIGGER_LABELS[row.triggerType] ?? row.triggerType}</Badge>
      ),
    },
    {
      key: "status",
      header: "상태",
      sortable: true,
      render: (row) => {
        const s = STATUS_BADGE[row.status] ?? { label: row.status, variant: "neutral" as BadgeVariant };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "steps" as keyof WorkflowItem,
      header: "단계",
      render: (row) => {
        const steps = Array.isArray(row.steps) ? row.steps : [];
        return <span className="text-sm">{steps.length}단계</span>;
      },
    },
    {
      key: "_count" as keyof WorkflowItem,
      header: "사용 중",
      render: (row) => (
        <span className="text-sm">{row._count.approvalRequests}건</span>
      ),
    },
    {
      key: "id",
      header: "액션",
      render: (row) => (
        <div className="flex gap-sp-2">
          <Button size="sm" variant="ghost" onClick={() => setPreviewWorkflow(row)}>
            미리보기
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>
            수정
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDeleteConfirm(row.id)}
            disabled={row._count.approvalRequests > 0}
          >
            삭제
          </Button>
        </div>
      ),
    },
  ];

  // ─── Render ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  return (
    <>
      {/* Workflow List */}
      <Card>
        <CardHeader>
          <CardTitle>워크플로우 목록</CardTitle>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            + 새 워크플로우
          </Button>
        </CardHeader>
        <CardBody>
          {workflows.length > 0 ? (
            <DataTable columns={columns} data={workflows} keyExtractor={(row) => row.id} />
          ) : (
            <div className="flex flex-col items-center justify-center py-sp-12 gap-sp-4">
              <span className="text-sm text-text-tertiary">
                등록된 워크플로우가 없습니다
              </span>
              <Button variant="primary" size="sm" onClick={openCreateModal}>
                첫 워크플로우 만들기
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingWorkflow ? "워크플로우 수정" : "새 워크플로우"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-sp-2">
          {error && (
            <div className="rounded-sm bg-status-danger-bg px-sp-4 py-sp-2 text-sm text-status-danger-text mb-sp-2">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <Input
            label="워크플로우 이름"
            placeholder="예: 초과근무 사전 승인"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="설명"
            placeholder="이 워크플로우의 용도를 설명하세요"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-sp-4">
            <Select
              label="트리거 유형"
              options={TRIGGER_OPTIONS}
              value={form.triggerType}
              onChange={(e) => setForm((prev) => ({ ...prev, triggerType: e.target.value }))}
            />
            <Select
              label="상태"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            />
          </div>

          {/* 5-Step Visual Preview */}
          <div className="mt-sp-2">
            <label className="block text-sm font-medium text-text-secondary mb-sp-2">
              워크플로우 미리보기
            </label>
            <StepVisualizer
              triggerType={form.triggerType}
              steps={form.steps}
              conditions={form.conditions}
            />
          </div>

          {/* Approval Steps */}
          <div className="mt-sp-2">
            <div className="flex items-center justify-between mb-sp-2">
              <label className="block text-sm font-medium text-text-secondary">
                승인 단계
              </label>
              <Button size="sm" variant="ghost" onClick={addStep}>
                + 단계 추가
              </Button>
            </div>
            <div className="flex flex-col gap-sp-3">
              {form.steps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-center gap-sp-3 rounded-sm border border-border p-sp-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-text-inverse text-xs font-bold">
                    {step.order}
                  </span>
                  <div className="flex-1 grid grid-cols-2 gap-sp-3">
                    <Input
                      placeholder="단계명"
                      value={step.label}
                      onChange={(e) => updateStep(index, "label", e.target.value)}
                    />
                    <Select
                      options={ROLE_OPTIONS}
                      value={step.role}
                      onChange={(e) => updateStep(index, "role", e.target.value)}
                    />
                  </div>
                  {form.steps.length > 1 && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => removeStep(index)}
                    >
                      삭제
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Condition Branches */}
          <div className="mt-sp-2">
            <div className="flex items-center justify-between mb-sp-2">
              <label className="block text-sm font-medium text-text-secondary">
                조건 분기
              </label>
              <Button size="sm" variant="ghost" onClick={addConditionRule}>
                + 조건 추가
              </Button>
            </div>
            {form.conditions.length > 0 && form.conditions[0].rules.length > 0 ? (
              <div className="flex flex-col gap-sp-2">
                {form.conditions[0].rules.map((rule, ruleIdx) => (
                  <div
                    key={ruleIdx}
                    className="flex items-center gap-sp-3 rounded-sm border border-border p-sp-3 bg-surface-secondary"
                  >
                    <span className="text-xs font-medium text-text-tertiary shrink-0">
                      IF
                    </span>
                    <Select
                      options={[
                        { value: "lte", label: "<=" },
                        { value: "between", label: "범위" },
                        { value: "gt", label: ">" },
                        { value: "gte", label: ">=" },
                        { value: "lt", label: "<" },
                        { value: "eq", label: "=" },
                      ]}
                      value={rule.operator}
                      onChange={(e) =>
                        updateConditionRule(ruleIdx, "operator", e.target.value)
                      }
                    />
                    <Input
                      placeholder="값 (예: 40, 40-48)"
                      value={rule.value}
                      onChange={(e) =>
                        updateConditionRule(ruleIdx, "value", e.target.value)
                      }
                    />
                    <span className="text-xs font-medium text-text-tertiary shrink-0">
                      →
                    </span>
                    <Input
                      placeholder="액션 (예: 자동 승인)"
                      value={rule.action}
                      onChange={(e) =>
                        updateConditionRule(ruleIdx, "action", e.target.value)
                      }
                    />
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => removeConditionRule(ruleIdx)}
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-sm border border-dashed border-border p-sp-4 text-center text-sm text-text-tertiary">
                조건 분기가 없습니다. 위 버튼으로 추가하세요.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={previewWorkflow !== null}
        onClose={() => setPreviewWorkflow(null)}
        title={previewWorkflow ? `미리보기: ${previewWorkflow.name}` : ""}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setPreviewWorkflow(null)}>
            닫기
          </Button>
        }
      >
        {previewWorkflow && (
          <div className="flex flex-col gap-sp-4">
            {/* Info */}
            <div className="grid grid-cols-2 gap-sp-4">
              <div>
                <span className="text-xs text-text-tertiary">트리거</span>
                <p className="text-sm font-medium">
                  {TRIGGER_LABELS[previewWorkflow.triggerType] ?? previewWorkflow.triggerType}
                </p>
              </div>
              <div>
                <span className="text-xs text-text-tertiary">상태</span>
                <p className="text-sm">
                  <Badge variant={STATUS_BADGE[previewWorkflow.status]?.variant ?? "neutral"}>
                    {STATUS_BADGE[previewWorkflow.status]?.label ?? previewWorkflow.status}
                  </Badge>
                </p>
              </div>
            </div>

            {/* 5-Step Visual */}
            <StepVisualizer
              triggerType={previewWorkflow.triggerType}
              steps={Array.isArray(previewWorkflow.steps) ? previewWorkflow.steps as WorkflowStep[] : []}
              conditions={
                Array.isArray(previewWorkflow.conditions)
                  ? previewWorkflow.conditions as WorkflowCondition[]
                  : []
              }
            />

            {/* Condition Chips */}
            {Array.isArray(previewWorkflow.conditions) &&
              (previewWorkflow.conditions as WorkflowCondition[]).length > 0 && (
                <ConditionChips
                  conditions={previewWorkflow.conditions as WorkflowCondition[]}
                />
              )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="워크플로우 삭제"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              삭제
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          이 워크플로우를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
      </Modal>
    </>
  );
}

// ─── 5-Step Visualizer ──────────────────────────────────────

function StepVisualizer({
  triggerType,
  steps,
  conditions,
}: {
  triggerType: string;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
}) {
  const allSteps: { icon: string; title: string; detail: string; active: boolean }[] = [
    {
      icon: STEP_ICONS[0],
      title: STEP_LABELS.T,
      detail: TRIGGER_LABELS[triggerType] ?? triggerType,
      active: true,
    },
    {
      icon: STEP_ICONS[1],
      title: STEP_LABELS.C,
      detail:
        conditions.length > 0 && conditions[0].rules.length > 0
          ? `${conditions[0].rules.length}개 조건`
          : "조건 없음",
      active: conditions.length > 0 && conditions[0].rules.length > 0,
    },
  ];

  steps.forEach((step, i) => {
    allSteps.push({
      icon: i < 2 ? String(STEP_ICONS[i + 2]) : String(i + 1),
      title: step.label,
      detail: step.role,
      active: true,
    });
  });

  allSteps.push({
    icon: STEP_ICONS[4],
    title: STEP_LABELS.N,
    detail: "요청자 + 승인자 이메일",
    active: true,
  });

  return (
    <div className="rounded-md border border-border bg-surface-secondary p-sp-4">
      <div className="flex items-start gap-sp-1">
        {allSteps.map((step, index) => (
          <div key={index} className="flex items-start">
            {/* Step Node */}
            <div className="flex flex-col items-center gap-sp-2 min-w-[80px]">
              <span
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                  step.active
                    ? "bg-brand text-text-inverse"
                    : "bg-surface-tertiary text-text-tertiary",
                ].join(" ")}
              >
                {step.icon}
              </span>
              <span className="text-xs font-semibold text-text-primary text-center">
                {step.title}
              </span>
              <span className="text-xs text-text-tertiary text-center leading-tight">
                {step.detail}
              </span>
            </div>
            {/* Connector */}
            {index < allSteps.length - 1 && (
              <div className="flex items-center h-10 px-sp-1">
                <div className="h-[2px] w-6 bg-border" />
                <div className="h-0 w-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-border" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Condition Chips ────────────────────────────────────────

function ConditionChips({
  conditions,
}: {
  conditions: WorkflowCondition[];
}) {
  if (conditions.length === 0 || conditions[0].rules.length === 0) return null;

  const operatorLabels: Record<string, string> = {
    lte: "<=",
    lt: "<",
    gte: ">=",
    gt: ">",
    eq: "=",
    between: "범위",
  };

  return (
    <div className="rounded-md bg-surface-secondary p-sp-4">
      <p className="text-xs text-text-tertiary mb-sp-2">조건 분기 상세</p>
      <div className="flex flex-wrap gap-sp-3">
        {conditions[0].rules.map((rule, idx) => (
          <div
            key={idx}
            className="rounded-full bg-surface-primary border border-border px-sp-4 py-sp-2 text-xs font-medium text-text-secondary"
          >
            IF {conditions[0].field} {operatorLabels[rule.operator] ?? rule.operator}{" "}
            {rule.value} → {rule.action}
          </div>
        ))}
      </div>
    </div>
  );
}

export { WorkflowBuilder };
