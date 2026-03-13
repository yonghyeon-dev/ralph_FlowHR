"use client";

import { useState, useEffect } from "react";
import { Drawer } from "@/components/layout/Drawer";
import { Badge, Button } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface ChainStep {
  stepOrder: number;
  label: string;
  role: string;
  approverName: string;
  approverPosition: string;
  status: string;
  comment: string | null;
  actionAt: string | null;
}

interface RequesterInfo {
  id: string;
  name: string;
  employeeNumber: string;
  department: string;
  position: string;
}

interface ApprovalDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  requestType: string;
  data: Record<string, string | number> | null;
  createdAt: string;
  completedAt: string | null;
  escalatedAt: string | null;
  requester: RequesterInfo;
  workflow: { id: string; name: string };
  chain: ChainStep[];
}

interface ApprovalDetailDrawerProps {
  requestId: string | null;
  onClose: () => void;
}

// ─── Constants ──────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "대기", variant: "neutral" },
  IN_PROGRESS: { label: "진행 중", variant: "warning" },
  APPROVED: { label: "승인", variant: "success" },
  REJECTED: { label: "반려", variant: "danger" },
  CANCELLED: { label: "취소", variant: "neutral" },
  ESCALATED: { label: "상향", variant: "info" },
};

const PRIORITY_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  CRITICAL: { label: "긴급", variant: "danger" },
  HIGH: { label: "높음", variant: "warning" },
  MEDIUM: { label: "보통", variant: "info" },
  LOW: { label: "낮음", variant: "neutral" },
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  OVERTIME: "초과근무 사전 승인",
  LEAVE: "휴가 신청",
  EXPENSE: "경비 정산",
  SALARY_CHANGE: "연봉 변경",
};

const STEP_STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  APPROVED: { label: "완료", variant: "success" },
  IN_PROGRESS: { label: "진행 중", variant: "warning" },
  PENDING: { label: "대기", variant: "neutral" },
  REJECTED: { label: "반려", variant: "danger" },
  ESCALATED: { label: "상향", variant: "info" },
  CANCELLED: { label: "취소", variant: "neutral" },
};

// ─── Helpers ────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function getDataFields(
  requestType: string,
  data: Record<string, string | number> | null,
): { label: string; value: string }[] {
  if (!data) return [];
  const fields: { label: string; value: string }[] = [];

  switch (requestType) {
    case "OVERTIME":
      if (data.scheduledDate) fields.push({ label: "예정일", value: String(data.scheduledDate) });
      if (data.hours) fields.push({ label: "예정 시간", value: `${data.hours}시간` });
      if (data.reason) fields.push({ label: "사유", value: String(data.reason) });
      break;
    case "LEAVE":
      if (data.startDate && data.endDate) {
        fields.push({ label: "기간", value: `${data.startDate} ~ ${data.endDate}` });
      }
      if (data.days) fields.push({ label: "일수", value: `${data.days}일` });
      break;
    case "EXPENSE":
      if (data.amount) fields.push({ label: "금액", value: formatAmount(Number(data.amount)) });
      if (data.category) fields.push({ label: "분류", value: String(data.category) });
      if (data.description) fields.push({ label: "내역", value: String(data.description) });
      break;
    case "SALARY_CHANGE":
      if (data.reason) fields.push({ label: "사유", value: String(data.reason) });
      if (data.department) fields.push({ label: "부서", value: String(data.department) });
      break;
  }

  return fields;
}

function isActionable(status: string): boolean {
  return status === "PENDING" || status === "IN_PROGRESS" || status === "ESCALATED";
}

// ─── Component ──────────────────────────────────────────────

export function ApprovalDetailDrawer({ requestId, onClose }: ApprovalDetailDrawerProps) {
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    fetch(`/api/workflow/requests/${requestId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setDetail(json.data);
      })
      .finally(() => setLoading(false));
  }, [requestId]);

  const statusInfo = detail ? STATUS_BADGE[detail.status] : null;
  const priorityInfo = detail ? PRIORITY_BADGE[detail.priority] : null;
  const dataFields = detail ? getDataFields(detail.requestType, detail.data) : [];
  const actionable = detail ? isActionable(detail.status) : false;

  return (
    <Drawer
      open={!!requestId}
      onClose={onClose}
      title={detail ? `승인 상세 — ${detail.title}` : "승인 상세"}
      size="lg"
      footer={
        actionable ? (
          <div className="flex gap-sp-2">
            <Button variant="primary" size="sm">승인</Button>
            <Button variant="danger" size="sm">반려</Button>
            <Button variant="secondary" size="sm">보류</Button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      ) : detail ? (
        <div className="grid grid-cols-1 gap-sp-6 md:grid-cols-2">
          {/* Left: Request Info */}
          <div>
            {/* Status & Priority Badges */}
            <div className="mb-sp-4 flex items-center gap-sp-2">
              {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
              {priorityInfo && <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>}
            </div>

            {/* Request Details */}
            <div className="space-y-sp-3">
              <DetailRow
                label="요청자"
                value={`${detail.requester.name} (${detail.requester.department})`}
              />
              <DetailRow
                label="유형"
                value={REQUEST_TYPE_LABELS[detail.requestType] ?? detail.requestType}
              />
              {detail.description && (
                <DetailRow label="사유" value={detail.description} />
              )}
              {dataFields.map((field) => (
                <DetailRow key={field.label} label={field.label} value={field.value} />
              ))}
              <DetailRow label="신청일" value={formatDateTime(detail.createdAt)} />
              {detail.completedAt && (
                <DetailRow label="완료일" value={formatDate(detail.completedAt)} />
              )}
              {detail.escalatedAt && (
                <DetailRow label="상향일" value={formatDate(detail.escalatedAt)} />
              )}
            </div>

            {/* Workflow Info */}
            <div className="mt-sp-4 rounded-md bg-surface-secondary p-sp-3">
              <span className="text-xs text-text-tertiary">워크플로</span>
              <p className="text-sm font-medium text-text-primary">{detail.workflow.name}</p>
            </div>
          </div>

          {/* Right: Approval Chain */}
          <div>
            <h3 className="mb-sp-4 text-sm font-semibold text-text-primary">결재선</h3>
            <div className="space-y-0">
              {detail.chain.map((step, idx) => {
                const stepBadge = STEP_STATUS_BADGE[step.status];
                const isLast = idx === detail.chain.length - 1;
                const isDone = step.status === "APPROVED";
                const isActive = step.status === "IN_PROGRESS" ||
                  (step.status === "PENDING" && idx > 0 && detail.chain[idx - 1].status === "APPROVED");

                return (
                  <div key={step.stepOrder} className="flex gap-sp-3">
                    {/* Vertical Line + Step Number */}
                    <div className="flex flex-col items-center">
                      <div
                        className={[
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          isDone
                            ? "bg-status-success-solid text-white"
                            : isActive
                              ? "bg-status-warning-solid text-white"
                              : "bg-surface-tertiary text-text-tertiary",
                        ].join(" ")}
                      >
                        {isDone ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="2,6 5,9 10,3" />
                          </svg>
                        ) : (
                          step.stepOrder
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={[
                            "w-0.5 flex-1 min-h-[24px]",
                            isDone ? "bg-status-success-solid" : "bg-border",
                          ].join(" ")}
                        />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className={`pb-sp-4 ${isLast ? "" : ""}`}>
                      <div className="flex items-center gap-sp-2">
                        <span className="text-sm font-medium text-text-primary">
                          {step.label}
                        </span>
                        {stepBadge && (
                          <Badge variant={stepBadge.variant}>{stepBadge.label}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {step.approverName}
                        {step.approverPosition && ` · ${step.approverPosition}`}
                      </div>
                      {step.comment && (
                        <div className="mt-sp-1 text-xs text-text-tertiary italic">
                          &ldquo;{step.comment}&rdquo;
                        </div>
                      )}
                      {step.actionAt && (
                        <div className="mt-sp-1 text-xs text-text-tertiary">
                          {formatDateTime(step.actionAt)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">요청을 찾을 수 없습니다</span>
        </div>
      )}
    </Drawer>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between border-b border-border-subtle py-sp-2">
      <span className="text-sm text-text-secondary shrink-0">{label}</span>
      <span className="text-sm font-medium text-text-primary text-right ml-sp-4">{value}</span>
    </div>
  );
}
