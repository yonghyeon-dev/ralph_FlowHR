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

interface RequestTypeCard {
  id: RequestTypeId;
  icon: string;
  label: string;
  description: string;
  isLeave: boolean;
}

interface LeaveFormData {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  emergencyContact: string;
}

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

const REQUEST_TYPES: RequestTypeCard[] = [
  { id: "annual", icon: "\uD83C\uDF34", label: "\uC5F0\uCC28 \uC2E0\uCCAD", description: "\uC5F0\uCC28 \uD734\uAC00\uB97C \uC2E0\uCCAD\uD569\uB2C8\uB2E4", isLeave: true },
  { id: "half_day", icon: "\uD83C\uDF24", label: "\uBC18\uCC28 \uC2E0\uCCAD", description: "\uC624\uC804 \uB610\uB294 \uC624\uD6C4 \uBC18\uCC28 \uC2E0\uCCAD", isLeave: true },
  { id: "sick", icon: "\uD83C\uDFE5", label: "\uBCD1\uAC00 \uC2E0\uCCAD", description: "\uC9C4\uB2E8\uC11C \uCCA8\uBD80 \uBCD1\uAC00 \uC2E0\uCCAD", isLeave: true },
  { id: "checkin_fix", icon: "\uD83D\uDD50", label: "\uCD9C\uADFC \uC815\uC815", description: "\uCD9C\uADFC \uC2DC\uAC04 \uC815\uC815 \uC694\uCCAD", isLeave: false },
  { id: "checkout_fix", icon: "\uD83D\uDD55", label: "\uD1F4\uADFC \uC815\uC815", description: "\uD1F4\uADFC \uC2DC\uAC04 \uC815\uC815 \uC694\uCCAD", isLeave: false },
  { id: "expense", icon: "\uD83D\uDCB3", label: "\uACBD\uBE44 \uCCAD\uAD6C", description: "\uC5C5\uBB34 \uAD00\uB828 \uACBD\uBE44 \uCCAD\uAD6C", isLeave: false },
  { id: "general", icon: "\uD83D\uDCDD", label: "\uC77C\uBC18 \uD488\uC758", description: "\uAE30\uD0C0 \uACB0\uC7AC \uD488\uC758 \uC2E0\uCCAD", isLeave: false },
];

const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: "annual", label: "\uC5F0\uCC28" },
  { value: "half_day_am", label: "\uBC18\uCC28 (\uC624\uC804)" },
  { value: "half_day_pm", label: "\uBC18\uCC28 (\uC624\uD6C4)" },
  { value: "sick", label: "\uBCD1\uAC00" },
  { value: "family", label: "\uACBD\uC870\uC0AC" },
];

const LEAVE_TYPE_LABEL_MAP: Record<LeaveType, string> = {
  annual: "\uC5F0\uCC28",
  half_day_am: "\uBC18\uCC28 (\uC624\uC804)",
  half_day_pm: "\uBC18\uCC28 (\uC624\uD6C4)",
  sick: "\uBCD1\uAC00",
  family: "\uACBD\uC870\uC0AC",
};

const STEP_LABELS: { step: FormStep; label: string }[] = [
  { step: 1, label: "\uC720\uD615 \uC120\uD0DD" },
  { step: 2, label: "\uC0C1\uC138 \uC815\uBCF4" },
  { step: 3, label: "\uAC80\uD1A0 \xB7 \uC81C\uCD9C" },
];

const DEFAULT_FORM_DATA: LeaveFormData = {
  leaveType: "annual",
  startDate: "2026-04-07",
  endDate: "2026-04-08",
  reason: "",
  emergencyContact: "",
};

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
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>(1);
  const [formData, setFormData] = useState<LeaveFormData>(DEFAULT_FORM_DATA);
  const [submitted, setSubmitted] = useState(false);

  const usedDays = calcDays(formData.startDate, formData.endDate);
  const remainingLeave = 8.5;

  function handleCardClick(card: RequestTypeCard) {
    if (!card.isLeave) return;
    setShowLeaveForm(true);
    setFormStep(1);
    setSubmitted(false);
    setFormData({
      ...DEFAULT_FORM_DATA,
      leaveType: getDefaultLeaveType(card.id),
    });
  }

  function handleCancel() {
    setShowLeaveForm(false);
    setFormStep(1);
    setFormData(DEFAULT_FORM_DATA);
    setSubmitted(false);
  }

  function handleSubmit() {
    setSubmitted(true);
    setShowLeaveForm(false);
    setFormStep(1);
    setFormData(DEFAULT_FORM_DATA);
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

      {/* TE-201: New Request Hub */}
      <div className="mb-sp-4">
        <h2 className="text-lg font-semibold text-text-primary">새 요청</h2>
        <p className="text-sm text-text-tertiary mt-sp-1">신청할 요청 유형을 선택하세요</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-sp-4 mb-sp-8">
        {REQUEST_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => handleCardClick(type)}
            className={[
              "rounded-xl border bg-surface-primary p-sp-6 text-center transition-all",
              type.isLeave
                ? "border-border hover:border-brand hover:shadow-md cursor-pointer"
                : "border-border-subtle opacity-60 cursor-not-allowed",
            ].join(" ")}
            disabled={!type.isLeave}
          >
            <div className="text-[32px] mb-sp-3">{type.icon}</div>
            <div className="font-semibold text-sm text-text-primary mb-sp-1">{type.label}</div>
            <div className="text-xs text-text-tertiary">{type.description}</div>
          </button>
        ))}
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
                      {formStep > step ? "\u2713" : step}
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
    </div>
  );
}
