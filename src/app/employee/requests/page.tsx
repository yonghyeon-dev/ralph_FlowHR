"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Button,
} from "@/components/ui";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

type RequestTypeId =
  | "annual"
  | "half_day"
  | "sick"
  | "checkin_fix"
  | "checkout_fix"
  | "expense"
  | "general";

type LeaveType = "annual" | "half_day_am" | "half_day_pm" | "sick" | "family";

type FormStep = 1 | 2 | 3;

type CorrectionType = "checkin" | "checkout";

type HistoryFilter = "all" | "pending" | "approved" | "rejected";

interface RequestTypeCard {
  id: RequestTypeId;
  icon: string;
  label: string;
  description: string;
  isLeave: boolean;
  isCorrection: boolean;
}

interface LeaveFormData {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  emergencyContact: string;
}

interface CorrectionFormData {
  targetDate: string;
  correctionType: CorrectionType;
  originalTime: string;
  correctedTime: string;
  reason: string;
}

interface RequestHistoryItem {
  id: string;
  type: string;
  typeBadgeVariant: "info" | "neutral";
  content: string;
  requestDate: string;
  approver: string;
  approverInitial: string;
  status: "pending" | "approved" | "rejected";
}

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

const REQUEST_TYPES: RequestTypeCard[] = [
  { id: "annual", icon: "🌴", label: "연차 신청", description: "연차 휴가를 신청합니다", isLeave: true, isCorrection: false },
  { id: "half_day", icon: "🌤", label: "반차 신청", description: "오전 또는 오후 반차 신청", isLeave: true, isCorrection: false },
  { id: "sick", icon: "🏥", label: "병가 신청", description: "진단서 첨부 병가 신청", isLeave: true, isCorrection: false },
  { id: "checkin_fix", icon: "🕐", label: "출근 정정", description: "출근 시간 정정 요청", isLeave: false, isCorrection: true },
  { id: "checkout_fix", icon: "🕕", label: "퇴근 정정", description: "퇴근 시간 정정 요청", isLeave: false, isCorrection: true },
  { id: "expense", icon: "💳", label: "경비 청구", description: "업무 관련 경비 청구", isLeave: false, isCorrection: false },
  { id: "general", icon: "📝", label: "일반 품의", description: "기타 결재 품의 신청", isLeave: false, isCorrection: false },
];

const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: "annual", label: "연차" },
  { value: "half_day_am", label: "반차 (오전)" },
  { value: "half_day_pm", label: "반차 (오후)" },
  { value: "sick", label: "병가" },
  { value: "family", label: "경조사" },
];

const LEAVE_TYPE_LABEL_MAP: Record<LeaveType, string> = {
  annual: "연차",
  half_day_am: "반차 (오전)",
  half_day_pm: "반차 (오후)",
  sick: "병가",
  family: "경조사",
};

const STEP_LABELS: { step: FormStep; label: string }[] = [
  { step: 1, label: "유형 선택" },
  { step: 2, label: "상세 정보" },
  { step: 3, label: "검토 · 제출" },
];

const DEFAULT_FORM_DATA: LeaveFormData = {
  leaveType: "annual",
  startDate: "2026-04-07",
  endDate: "2026-04-08",
  reason: "",
  emergencyContact: "",
};

const DEFAULT_CORRECTION_DATA: CorrectionFormData = {
  targetDate: "2026-03-07",
  correctionType: "checkin",
  originalTime: "09:12",
  correctedTime: "08:55",
  reason: "",
};

const HISTORY_FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "진행 중" },
  { value: "approved", label: "완료" },
  { value: "rejected", label: "반려" },
];

const STATUS_LABEL: Record<RequestHistoryItem["status"], string> = {
  pending: "대기 중",
  approved: "승인",
  rejected: "반려",
};

const STATUS_BADGE_VARIANT: Record<RequestHistoryItem["status"], "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const REQUEST_HISTORY: RequestHistoryItem[] = [
  { id: "1", type: "연차", typeBadgeVariant: "info", content: "4/7~4/8 연차 (2일)", requestDate: "2026-03-12", approver: "박서준", approverInitial: "박", status: "pending" },
  { id: "2", type: "출근 정정", typeBadgeVariant: "neutral", content: "3/7 출근 시간 09:12→08:55", requestDate: "2026-03-10", approver: "박서준", approverInitial: "박", status: "rejected" },
  { id: "3", type: "반차", typeBadgeVariant: "info", content: "3/6 오후 반차", requestDate: "2026-03-04", approver: "박서준", approverInitial: "박", status: "approved" },
  { id: "4", type: "연차", typeBadgeVariant: "info", content: "3/4 연차 (1일)", requestDate: "2026-02-28", approver: "박서준", approverInitial: "박", status: "approved" },
  { id: "5", type: "경비", typeBadgeVariant: "neutral", content: "2월 교통비 청구 ₩45,000", requestDate: "2026-02-25", approver: "박서준", approverInitial: "박", status: "approved" },
  { id: "6", type: "연차", typeBadgeVariant: "info", content: "2/14 연차 (1일)", requestDate: "2026-02-10", approver: "박서준", approverInitial: "박", status: "approved" },
  { id: "7", type: "퇴근 정정", typeBadgeVariant: "neutral", content: "2/5 퇴근 시간 17:45→18:30", requestDate: "2026-02-06", approver: "박서준", approverInitial: "박", status: "approved" },
  { id: "8", type: "연차", typeBadgeVariant: "info", content: "1/27 연차 (1일)", requestDate: "2026-01-22", approver: "박서준", approverInitial: "박", status: "approved" },
  { id: "9", type: "반차", typeBadgeVariant: "info", content: "1/15 오전 반차", requestDate: "2026-01-13", approver: "박서준", approverInitial: "박", status: "approved" },
  { id: "10", type: "출근 정정", typeBadgeVariant: "neutral", content: "1/10 출근 시간 09:05→08:50", requestDate: "2026-01-10", approver: "박서준", approverInitial: "박", status: "approved" },
  { id: "11", type: "연차", typeBadgeVariant: "info", content: "1/6~1/7 연차 (2일)", requestDate: "2026-01-03", approver: "박서준", approverInitial: "박", status: "approved" },
  { id: "12", type: "경비", typeBadgeVariant: "neutral", content: "12월 교통비 청구 ₩38,000", requestDate: "2025-12-28", approver: "박서준", approverInitial: "박", status: "approved" },
];

const PAGE_SIZE = 6;

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, diff);
}

function getDefaultLeaveType(requestTypeId: RequestTypeId): LeaveType {
  switch (requestTypeId) {
    case "annual": return "annual";
    case "half_day": return "half_day_am";
    case "sick": return "sick";
    default: return "annual";
  }
}

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function RequestsPage() {
  /* Leave form state */
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>(1);
  const [formData, setFormData] = useState<LeaveFormData>(DEFAULT_FORM_DATA);
  const [submitted, setSubmitted] = useState(false);

  /* Correction form state */
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionData, setCorrectionData] = useState<CorrectionFormData>(DEFAULT_CORRECTION_DATA);
  const [correctionSubmitted, setCorrectionSubmitted] = useState(false);

  /* History state */
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [historyPage, setHistoryPage] = useState(1);

  const usedDays = calcDays(formData.startDate, formData.endDate);
  const remainingLeave = 8.5;

  /* Filtered history */
  const filteredHistory = REQUEST_HISTORY.filter((item) => {
    if (historyFilter === "all") return true;
    return item.status === historyFilter;
  });
  const totalFiltered = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pagedHistory = filteredHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

  function handleCardClick(card: RequestTypeCard) {
    if (card.isLeave) {
      setShowLeaveForm(true);
      setShowCorrectionForm(false);
      setFormStep(1);
      setSubmitted(false);
      setCorrectionSubmitted(false);
      setFormData({
        ...DEFAULT_FORM_DATA,
        leaveType: getDefaultLeaveType(card.id),
      });
    } else if (card.isCorrection) {
      setShowCorrectionForm(true);
      setShowLeaveForm(false);
      setSubmitted(false);
      setCorrectionSubmitted(false);
      setCorrectionData({
        ...DEFAULT_CORRECTION_DATA,
        correctionType: card.id === "checkin_fix" ? "checkin" : "checkout",
        originalTime: card.id === "checkin_fix" ? "09:12" : "17:45",
        correctedTime: card.id === "checkin_fix" ? "08:55" : "18:30",
      });
    }
  }

  function handleCancel() {
    setShowLeaveForm(false);
    setShowCorrectionForm(false);
    setFormStep(1);
    setFormData(DEFAULT_FORM_DATA);
    setCorrectionData(DEFAULT_CORRECTION_DATA);
    setSubmitted(false);
    setCorrectionSubmitted(false);
  }

  function handleSubmit() {
    setSubmitted(true);
    setShowLeaveForm(false);
    setFormStep(1);
    setFormData(DEFAULT_FORM_DATA);
  }

  function handleCorrectionSubmit() {
    setCorrectionSubmitted(true);
    setShowCorrectionForm(false);
    setCorrectionData(DEFAULT_CORRECTION_DATA);
  }

  function handleFilterChange(filter: HistoryFilter) {
    setHistoryFilter(filter);
    setHistoryPage(1);
  }

  function getActionLabel(status: RequestHistoryItem["status"]): string {
    switch (status) {
      case "pending": return "취소";
      case "rejected": return "재신청";
      case "approved": return "상세";
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-sp-6">
        <div className="text-sm text-text-tertiary mb-sp-1">홈 &gt; 요청</div>
        <h1 className="text-xl font-bold text-text-primary">요청</h1>
        <p className="text-sm text-text-tertiary mt-sp-1">
          휴가, 근태 정정, 경비 등 다양한 요청을 신청하세요
        </p>
      </div>

      {/* Submission success toast */}
      {submitted && (
        <div className="mb-sp-6 p-sp-4 rounded-lg bg-status-success-soft border border-status-success text-sm text-status-success font-medium">
          휴가 신청이 완료되었습니다. 결재자의 승인을 기다려 주세요.
        </div>
      )}
      {correctionSubmitted && (
        <div className="mb-sp-6 p-sp-4 rounded-lg bg-status-success-soft border border-status-success text-sm text-status-success font-medium">
          출퇴근 정정 요청이 완료되었습니다. 결재자의 승인을 기다려 주세요.
        </div>
      )}

      {/* TE-201: New Request Hub */}
      <div className="mb-sp-4">
        <h2 className="text-lg font-semibold text-text-primary">새 요청</h2>
        <p className="text-sm text-text-tertiary mt-sp-1">신청할 요청 유형을 선택하세요</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-sp-4 mb-sp-8">
        {REQUEST_TYPES.map((type) => {
          const enabled = type.isLeave || type.isCorrection;
          return (
            <button
              key={type.id}
              onClick={() => handleCardClick(type)}
              className={[
                "rounded-xl border bg-surface-primary p-sp-6 text-center transition-all",
                enabled
                  ? "border-border hover:border-brand hover:shadow-md cursor-pointer"
                  : "border-border-subtle opacity-60 cursor-not-allowed",
              ].join(" ")}
              disabled={!enabled}
            >
              <div className="text-[32px] mb-sp-3">{type.icon}</div>
              <div className="font-semibold text-sm text-text-primary mb-sp-1">{type.label}</div>
              <div className="text-xs text-text-tertiary">{type.description}</div>
            </button>
          );
        })}
      </div>

      {/* TE-202: Leave Request Form */}
      {showLeaveForm && (
        <>
          <div className="mb-sp-4">
            <h2 className="text-lg font-semibold text-text-primary">휴가 신청서</h2>
            <p className="text-sm text-text-tertiary mt-sp-1">연차 / 반차 / 병가 신청 양식</p>
          </div>

          <Card className="mb-sp-6">
            <CardHeader>
              <CardTitle>
                {LEAVE_TYPE_LABEL_MAP[formData.leaveType]} 신청
              </CardTitle>
              <Badge variant="info">작성 중</Badge>
            </CardHeader>
            <CardBody>
              {/* Step Indicator */}
              <div className="flex items-center gap-sp-4 mb-sp-6">
                {STEP_LABELS.map(({ step, label }) => (
                  <div key={step} className="flex items-center gap-sp-2">
                    <span
                      className={[
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                        formStep > step
                          ? "bg-status-success text-white"
                          : formStep === step
                            ? "bg-brand text-white"
                            : "bg-surface-secondary text-text-tertiary",
                      ].join(" ")}
                    >
                      {formStep > step ? "✓" : step}
                    </span>
                    <span
                      className={[
                        "text-sm font-medium",
                        formStep === step ? "text-text-primary" : "text-text-tertiary",
                      ].join(" ")}
                    >
                      {label}
                    </span>
                    {step < 3 && (
                      <div className="w-8 h-px bg-border-subtle mx-sp-1" />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Type Selection */}
              {formStep === 1 && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-sp-2">
                    휴가 유형
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-sp-3">
                    {LEAVE_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, leaveType: opt.value }))
                        }
                        className={[
                          "p-sp-4 rounded-lg border text-sm font-medium transition-colors",
                          formData.leaveType === opt.value
                            ? "border-brand bg-brand-soft text-brand"
                            : "border-border bg-surface-primary text-text-secondary hover:border-brand-muted",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end mt-sp-6 pt-sp-4 border-t border-border-subtle">
                    <div className="flex gap-sp-3">
                      <Button variant="ghost" onClick={handleCancel}>
                        취소
                      </Button>
                      <Button variant="primary" onClick={() => setFormStep(2)}>
                        다음
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Details */}
              {formStep === 2 && (
                <div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-sp-6">
                    {/* Left Column */}
                    <div className="space-y-sp-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-sp-2">
                          휴가 유형
                        </label>
                        <select
                          value={formData.leaveType}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              leaveType: e.target.value as LeaveType,
                            }))
                          }
                          className="w-full rounded-lg border border-border bg-surface-primary px-sp-3 py-sp-2 text-sm text-text-primary focus:border-brand focus:outline-none"
                        >
                          {LEAVE_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-sp-2">
                          시작일
                        </label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                          }
                          className="w-full rounded-lg border border-border bg-surface-primary px-sp-3 py-sp-2 text-sm text-text-primary focus:border-brand focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-sp-2">
                          종료일
                        </label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                          }
                          className="w-full rounded-lg border border-border bg-surface-primary px-sp-3 py-sp-2 text-sm text-text-primary focus:border-brand focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-sp-2">
                          사용 일수
                        </label>
                        <input
                          type="text"
                          value={`${usedDays}일`}
                          readOnly
                          className="w-full rounded-lg border border-border bg-surface-secondary px-sp-3 py-sp-2 text-sm text-text-primary"
                        />
                        <span className="text-xs text-text-tertiary mt-sp-1 block">
                          잔여 연차: {remainingLeave}일
                        </span>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-sp-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-sp-2">
                          사유
                        </label>
                        <textarea
                          rows={4}
                          placeholder="휴가 사유를 입력해 주세요"
                          value={formData.reason}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, reason: e.target.value }))
                          }
                          className="w-full rounded-lg border border-border bg-surface-primary px-sp-3 py-sp-2 text-sm text-text-primary focus:border-brand focus:outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-sp-2">
                          결재자
                        </label>
                        <div className="flex items-center gap-sp-3 p-sp-3 bg-surface-secondary rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-brand-soft flex items-center justify-center text-sm font-semibold text-brand">
                            박
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-text-primary">박서준</div>
                            <div className="text-xs text-text-tertiary">Product 팀 리더</div>
                          </div>
                        </div>
                        <span className="text-xs text-text-tertiary mt-sp-1 block">
                          직속 상관이 자동 지정됩니다
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-sp-2">
                          비상 연락
                        </label>
                        <input
                          type="text"
                          placeholder="휴가 중 연락 가능한 번호"
                          value={formData.emergencyContact}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              emergencyContact: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-border bg-surface-primary px-sp-3 py-sp-2 text-sm text-text-primary focus:border-brand focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-sp-6 pt-sp-4 border-t border-border-subtle">
                    <Button variant="ghost" onClick={() => setFormStep(1)}>
                      이전
                    </Button>
                    <div className="flex gap-sp-3">
                      <Button variant="ghost" onClick={handleCancel}>
                        취소
                      </Button>
                      <Button variant="primary" onClick={() => setFormStep(3)}>
                        다음
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {formStep === 3 && (
                <div>
                  <div className="rounded-lg border border-border bg-surface-secondary p-sp-5 space-y-sp-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-tertiary">휴가 유형</span>
                      <span className="text-sm font-medium text-text-primary">
                        {LEAVE_TYPE_LABEL_MAP[formData.leaveType]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-tertiary">기간</span>
                      <span className="text-sm font-medium text-text-primary">
                        {formData.startDate} ~ {formData.endDate} ({usedDays}일)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-tertiary">사유</span>
                      <span className="text-sm font-medium text-text-primary">
                        {formData.reason || "(미입력)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-tertiary">결재자</span>
                      <span className="text-sm font-medium text-text-primary">박서준 (Product 팀 리더)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-tertiary">비상 연락</span>
                      <span className="text-sm font-medium text-text-primary">
                        {formData.emergencyContact || "(미입력)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-tertiary">잔여 연차</span>
                      <span className="text-sm font-medium text-text-primary">
                        {remainingLeave}일 → {Math.max(0, remainingLeave - usedDays)}일
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between mt-sp-6 pt-sp-4 border-t border-border-subtle">
                    <Button variant="ghost" onClick={() => setFormStep(2)}>
                      이전
                    </Button>
                    <div className="flex gap-sp-3">
                      <Button variant="ghost" onClick={handleCancel}>
                        취소
                      </Button>
                      <Button variant="secondary" onClick={handleCancel}>
                        임시 저장
                      </Button>
                      <Button variant="primary" onClick={handleSubmit}>
                        신청하기
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {/* TE-203: Attendance Correction Form */}
      {showCorrectionForm && (
        <>
          <div className="mb-sp-4">
            <h2 className="text-lg font-semibold text-text-primary">출퇴근 정정 요청</h2>
            <p className="text-sm text-text-tertiary mt-sp-1">출퇴근 시간 오류 시 정정 요청</p>
          </div>

          <Card className="mb-sp-6">
            <CardHeader>
              <CardTitle>
                {correctionData.correctionType === "checkin" ? "출근" : "퇴근"} 정정
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-sp-6">
                {/* Left Column */}
                <div className="space-y-sp-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-sp-2">
                      정정 대상일
                    </label>
                    <input
                      type="date"
                      value={correctionData.targetDate}
                      onChange={(e) =>
                        setCorrectionData((prev) => ({ ...prev, targetDate: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-surface-primary px-sp-3 py-sp-2 text-sm text-text-primary focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-sp-2">
                      정정 유형
                    </label>
                    <select
                      value={correctionData.correctionType}
                      onChange={(e) =>
                        setCorrectionData((prev) => ({
                          ...prev,
                          correctionType: e.target.value as CorrectionType,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-surface-primary px-sp-3 py-sp-2 text-sm text-text-primary focus:border-brand focus:outline-none"
                    >
                      <option value="checkin">출근 시간 정정</option>
                      <option value="checkout">퇴근 시간 정정</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-sp-2">
                      기존 시간
                    </label>
                    <input
                      type="text"
                      value={correctionData.originalTime}
                      readOnly
                      className="w-full rounded-lg border border-border bg-surface-secondary px-sp-3 py-sp-2 text-sm text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-sp-2">
                      정정 시간
                    </label>
                    <input
                      type="time"
                      value={correctionData.correctedTime}
                      onChange={(e) =>
                        setCorrectionData((prev) => ({ ...prev, correctedTime: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-surface-primary px-sp-3 py-sp-2 text-sm text-text-primary focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-sp-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-sp-2">
                      정정 사유
                    </label>
                    <textarea
                      rows={4}
                      placeholder="정정 사유를 상세히 입력해 주세요"
                      value={correctionData.reason}
                      onChange={(e) =>
                        setCorrectionData((prev) => ({ ...prev, reason: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-surface-primary px-sp-3 py-sp-2 text-sm text-text-primary focus:border-brand focus:outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-sp-2">
                      증빙 첨부
                    </label>
                    <div className="border-2 border-dashed border-border-strong rounded-lg p-sp-6 text-center bg-surface-secondary">
                      <div className="text-2xl mb-sp-2">📎</div>
                      <div className="text-sm text-text-tertiary">파일을 드래그하거나 클릭하여 업로드</div>
                      <div className="text-sm text-text-tertiary mt-sp-4">PNG, JPG, PDF (최대 10MB)</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-sp-6 pt-sp-4 border-t border-border-subtle">
                <div className="flex gap-sp-3">
                  <Button variant="ghost" onClick={handleCancel}>
                    취소
                  </Button>
                  <Button variant="primary" onClick={handleCorrectionSubmit}>
                    정정 요청
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {/* TE-204~205: My Request History */}
      <div className="mb-sp-4">
        <h2 className="text-lg font-semibold text-text-primary">나의 요청 이력</h2>
        <p className="text-sm text-text-tertiary mt-sp-1">제출한 요청의 진행 상태를 확인하세요</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>요청 이력</CardTitle>
          <div className="flex gap-sp-2">
            {HISTORY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={[
                  "px-sp-3 py-sp-1 rounded-full text-xs font-medium transition-colors",
                  historyFilter === f.value
                    ? "bg-brand text-white"
                    : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary",
                ].join(" ")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-sp-4 py-sp-3 text-left font-medium text-text-tertiary">유형</th>
                  <th className="px-sp-4 py-sp-3 text-left font-medium text-text-tertiary">신청 내용</th>
                  <th className="px-sp-4 py-sp-3 text-left font-medium text-text-tertiary">신청일</th>
                  <th className="px-sp-4 py-sp-3 text-left font-medium text-text-tertiary">결재자</th>
                  <th className="px-sp-4 py-sp-3 text-left font-medium text-text-tertiary">상태</th>
                  <th className="px-sp-4 py-sp-3 text-right font-medium text-text-tertiary">관리</th>
                </tr>
              </thead>
              <tbody>
                {pagedHistory.map((item) => (
                  <tr key={item.id} className="border-b border-border-subtle hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-sp-4 py-sp-3">
                      <Badge variant={item.typeBadgeVariant}>{item.type}</Badge>
                    </td>
                    <td className="px-sp-4 py-sp-3 text-text-primary">{item.content}</td>
                    <td className="px-sp-4 py-sp-3 text-text-tertiary">{item.requestDate}</td>
                    <td className="px-sp-4 py-sp-3">
                      <div className="flex items-center gap-sp-2">
                        <div className="w-6 h-6 rounded-full bg-brand-soft flex items-center justify-center text-xs font-semibold text-brand">
                          {item.approverInitial}
                        </div>
                        <span className="text-text-primary">{item.approver}</span>
                      </div>
                    </td>
                    <td className="px-sp-4 py-sp-3">
                      <Badge variant={STATUS_BADGE_VARIANT[item.status]}>
                        {STATUS_LABEL[item.status]}
                      </Badge>
                    </td>
                    <td className="px-sp-4 py-sp-3 text-right">
                      <Button variant="ghost" size="sm">
                        {getActionLabel(item.status)}
                      </Button>
                    </td>
                  </tr>
                ))}
                {pagedHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-sp-4 py-sp-8 text-center text-text-tertiary">
                      해당 조건의 요청 이력이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>

        {/* Pagination */}
        <div className="flex items-center justify-between px-sp-4 py-sp-3 border-t border-border">
          <span className="text-sm text-text-tertiary">
            총 {totalFiltered}건 중 {(historyPage - 1) * PAGE_SIZE + 1}-{Math.min(historyPage * PAGE_SIZE, totalFiltered)}
          </span>
          <div className="flex gap-sp-1">
            <button
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              disabled={historyPage <= 1}
              className="w-8 h-8 rounded-md flex items-center justify-center text-sm border border-border hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setHistoryPage(p)}
                className={[
                  "w-8 h-8 rounded-md flex items-center justify-center text-sm border transition-colors",
                  historyPage === p
                    ? "bg-brand text-white border-brand"
                    : "border-border hover:bg-surface-secondary text-text-primary",
                ].join(" ")}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
              disabled={historyPage >= totalPages}
              className="w-8 h-8 rounded-md flex items-center justify-center text-sm border border-border hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              →
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
