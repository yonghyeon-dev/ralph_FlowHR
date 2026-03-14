"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Button,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface RequestTypeCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: "leave" | "correction" | "expense" | "general";
}

type LeaveType = "annual" | "half_am" | "half_pm" | "sick" | "family";
type FormStep = 1 | 2 | 3;

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
  { id: "annual", icon: "\uD83C\uDF34", title: "\uC5F0\uCC28 \uC2E0\uCCAD", description: "\uC5F0\uCC28 \uD734\uAC00\uB97C \uC2E0\uCCAD\uD569\uB2C8\uB2E4", category: "leave" },
  { id: "half", icon: "\uD83C\uDF24", title: "\uBC18\uCC28 \uC2E0\uCCAD", description: "\uC624\uC804 \uB610\uB294 \uC624\uD6C4 \uBC18\uCC28 \uC2E0\uCCAD", category: "leave" },
  { id: "sick", icon: "\uD83C\uDFE5", title: "\uBCD1\uAC00 \uC2E0\uCCAD", description: "\uC9C4\uB2E8\uC11C \uCCA8\uBD80 \uBCD1\uAC00 \uC2E0\uCCAD", category: "leave" },
  { id: "checkin_correction", icon: "\uD83D\uDD50", title: "\uCD9C\uADFC \uC815\uC815", description: "\uCD9C\uADFC \uC2DC\uAC04 \uC815\uC815 \uC694\uCCAD", category: "correction" },
  { id: "checkout_correction", icon: "\uD83D\uDD55", title: "\uD1F4\uADFC \uC815\uC815", description: "\uD1F4\uADFC \uC2DC\uAC04 \uC815\uC815 \uC694\uCCAD", category: "correction" },
  { id: "expense", icon: "\uD83D\uDCB3", title: "\uACBD\uBE44 \uCCAD\uAD6C", description: "\uC5C5\uBB34 \uAD00\uB828 \uACBD\uBE44 \uCCAD\uAD6C", category: "expense" },
  { id: "general", icon: "\uD83D\uDCDD", title: "\uC77C\uBC18 \uD488\uC758", description: "\uAE30\uD0C0 \uACB0\uC7AC \uD488\uC758 \uC2E0\uCCAD", category: "general" },
];

const LEAVE_TYPE_OPTIONS = [
  { value: "annual", label: "\uC5F0\uCC28" },
  { value: "half_am", label: "\uBC18\uCC28 (\uC624\uC804)" },
  { value: "half_pm", label: "\uBC18\uCC28 (\uC624\uD6C4)" },
  { value: "sick", label: "\uBCD1\uAC00" },
  { value: "family", label: "\uACBD\uC870\uC0AC" },
];

const STEP_LABELS = [
  { step: 1 as const, label: "\uC720\uD615 \uC120\uD0DD" },
  { step: 2 as const, label: "\uC0C1\uC138 \uC815\uBCF4" },
  { step: 3 as const, label: "\uAC80\uD1A0 \u00B7 \uC81C\uCD9C" },
];

const LEAVE_BALANCE = 8.5;

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff;
}

function leaveTypeLabel(type: LeaveType): string {
  return LEAVE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function RequestsPage() {
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [formData, setFormData] = useState<LeaveFormData>({
    leaveType: "annual",
    startDate: "2026-04-07",
    endDate: "2026-04-08",
    reason: "",
    emergencyContact: "",
  });

  const usedDays = calcDays(formData.startDate, formData.endDate);
  const isHalfDay = formData.leaveType === "half_am" || formData.leaveType === "half_pm";
  const displayDays = isHalfDay ? 0.5 : usedDays;

  const handleCardClick = useCallback((card: RequestTypeCard) => {
    if (card.category === "leave") {
      const typeMap: Record<string, LeaveType> = {
        annual: "annual",
        half: "half_am",
        sick: "sick",
      };
      setFormData((prev) => ({ ...prev, leaveType: typeMap[card.id] ?? "annual" }));
      setCurrentStep(2);
      setShowLeaveForm(true);
    }
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep((s) => Math.min(3, s + 1) as FormStep);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentStep((s) => Math.max(1, s - 1) as FormStep);
  }, []);

  const handleSubmit = useCallback(() => {
    setShowLeaveForm(false);
    setCurrentStep(1);
    setFormData({
      leaveType: "annual",
      startDate: "2026-04-07",
      endDate: "2026-04-08",
      reason: "",
      emergencyContact: "",
    });
  }, []);

  const handleCancel = useCallback(() => {
    setShowLeaveForm(false);
    setCurrentStep(1);
  }, []);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-sp-6">
        <div className="text-sm text-text-tertiary mb-sp-1">{"\uD648"} &gt; {"\uC694\uCCAD"}</div>
        <h1 className="text-xl font-bold text-text-primary">{"\uC694\uCCAD"}</h1>
        <p className="text-sm text-text-tertiary mt-sp-1">
          {"\uD734\uAC00, \uADFC\uD0DC \uC815\uC815, \uACBD\uBE44 \uB4F1 \uB2E4\uC591\uD55C \uC694\uCCAD\uC744 \uC2E0\uCCAD\uD558\uC138\uC694"}
        </p>
      </div>

      {/* TE-201: New Request Hub */}
      <div className="mb-sp-4">
        <h2 className="text-lg font-semibold text-text-primary">{"\uC0C8 \uC694\uCCAD"}</h2>
        <p className="text-sm text-text-tertiary mt-sp-1">
          {"\uC2E0\uCCAD\uD560 \uC694\uCCAD \uC720\uD615\uC744 \uC120\uD0DD\uD558\uC138\uC694"}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-sp-4 mb-sp-8">
        {REQUEST_TYPES.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => handleCardClick(card)}
            className={[
              "text-center rounded-md border transition-all duration-150",
              "bg-surface-primary hover:bg-surface-secondary hover:shadow-sm",
              "border-border hover:border-brand",
              "p-sp-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30",
              card.category !== "leave" ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
            disabled={card.category !== "leave"}
          >
            <div className="text-[32px] mb-sp-3">{card.icon}</div>
            <div className="font-semibold text-text-primary mb-sp-1">{card.title}</div>
            <div className="text-sm text-text-tertiary">{card.description}</div>
          </button>
        ))}
      </div>

      {/* TE-202: Leave Request Form */}
      {showLeaveForm && (
        <>
          <div className="mb-sp-4">
            <h2 className="text-lg font-semibold text-text-primary">{"\uD734\uAC00 \uC2E0\uCCAD\uC11C"}</h2>
            <p className="text-sm text-text-tertiary mt-sp-1">
              {"\uC5F0\uCC28 / \uBC18\uCC28 / \uBCD1\uAC00 \uC2E0\uCCAD \uC591\uC2DD"}
            </p>
          </div>

          <Card className="mb-sp-6">
            <CardHeader>
              <CardTitle>{leaveTypeLabel(formData.leaveType)} {"\uC2E0\uCCAD"}</CardTitle>
              <Badge variant="info">{"\uC791\uC131 \uC911"}</Badge>
            </CardHeader>
            <CardBody>
              {/* Step Indicator */}
              <div className="flex items-center gap-sp-2 mb-sp-6">
                {STEP_LABELS.map(({ step, label }, idx) => (
                  <div key={step} className="flex items-center gap-sp-2">
                    {idx > 0 && (
                      <div
                        className={[
                          "w-8 h-px",
                          step <= currentStep ? "bg-brand" : "bg-border",
                        ].join(" ")}
                      />
                    )}
                    <div className="flex items-center gap-sp-2">
                      <span
                        className={[
                          "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                          step < currentStep
                            ? "bg-status-success-subtle text-status-success-text"
                            : step === currentStep
                              ? "bg-brand text-white"
                              : "bg-surface-secondary text-text-tertiary",
                        ].join(" ")}
                      >
                        {step < currentStep ? "\u2713" : step}
                      </span>
                      <span
                        className={[
                          "text-sm font-medium whitespace-nowrap",
                          step === currentStep ? "text-text-primary" : "text-text-tertiary",
                        ].join(" ")}
                      >
                        {label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Step 1: Type Selection */}
              {currentStep === 1 && (
                <div>
                  <p className="text-sm text-text-secondary mb-sp-4">
                    {"\uC2E0\uCCAD\uD560 \uD734\uAC00 \uC720\uD615\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694."}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-sp-3">
                    {LEAVE_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, leaveType: opt.value as LeaveType }))}
                        className={[
                          "p-sp-4 rounded-md border-2 text-left transition-colors",
                          formData.leaveType === opt.value
                            ? "border-brand bg-brand-soft/20"
                            : "border-border hover:border-brand/50",
                        ].join(" ")}
                      >
                        <div className="font-semibold text-text-primary">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Detail Information */}
              {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-sp-6">
                  <div>
                    <Select
                      label={"\uD734\uAC00 \uC720\uD615"}
                      options={LEAVE_TYPE_OPTIONS}
                      value={formData.leaveType}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, leaveType: e.target.value as LeaveType }))
                      }
                    />
                    <Input
                      label={"\uC2DC\uC791\uC77C"}
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, startDate: e.target.value }))
                      }
                    />
                    <Input
                      label={"\uC885\uB8CC\uC77C"}
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, endDate: e.target.value }))
                      }
                    />
                    <Input
                      label={"\uC0AC\uC6A9 \uC77C\uC218"}
                      type="text"
                      value={`${displayDays}\uC77C`}
                      readOnly
                      className="bg-surface-secondary"
                      hint={`\uC794\uC5EC \uC5F0\uCC28: ${LEAVE_BALANCE}\uC77C`}
                    />
                  </div>
                  <div>
                    <Textarea
                      label={"\uC0AC\uC720"}
                      rows={4}
                      placeholder={"\uD734\uAC00 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694"}
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, reason: e.target.value }))
                      }
                    />
                    <div className="mb-sp-4">
                      <label className="block text-sm font-medium text-text-secondary mb-sp-1">
                        {"\uACB0\uC7AC\uC790"}
                      </label>
                      <div className="flex items-center gap-sp-3 p-sp-3 bg-surface-secondary rounded-sm">
                        <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
                          {"\uBC15"}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{"\uBC15\uC11C\uC900"}</div>
                          <div className="text-sm text-text-tertiary">Product {"\uD300 \uB9AC\uB354"}</div>
                        </div>
                      </div>
                      <p className="text-xs text-text-tertiary mt-sp-1">
                        {"\uC9C1\uC18D \uC0C1\uAD00\uC774 \uC790\uB3D9 \uC9C0\uC815\uB429\uB2C8\uB2E4"}
                      </p>
                    </div>
                    <Input
                      label={"\uBE44\uC0C1 \uC5F0\uB77D"}
                      type="text"
                      placeholder={"\uD734\uAC00 \uC911 \uC5F0\uB77D \uAC00\uB2A5\uD55C \uBC88\uD638"}
                      value={formData.emergencyContact}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, emergencyContact: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {currentStep === 3 && (
                <div>
                  <p className="text-sm text-text-secondary mb-sp-4">
                    {"\uC2E0\uCCAD \uB0B4\uC6A9\uC744 \uD655\uC778\uD558\uC138\uC694."}
                  </p>
                  <div className="bg-surface-secondary rounded-md p-sp-5 space-y-sp-3">
                    <ReviewRow label={"\uD734\uAC00 \uC720\uD615"} value={leaveTypeLabel(formData.leaveType)} />
                    <ReviewRow label={"\uAE30\uAC04"} value={`${formData.startDate} ~ ${formData.endDate}`} />
                    <ReviewRow label={"\uC0AC\uC6A9 \uC77C\uC218"} value={`${displayDays}\uC77C`} />
                    <ReviewRow
                      label={"\uC794\uC5EC \uC5F0\uCC28"}
                      value={`${LEAVE_BALANCE}\uC77C \u2192 ${LEAVE_BALANCE - displayDays}\uC77C`}
                    />
                    <ReviewRow
                      label={"\uC0AC\uC720"}
                      value={formData.reason || "(\uBBF8\uC785\uB825)"}
                      muted={!formData.reason}
                    />
                    <ReviewRow label={"\uACB0\uC7AC\uC790"} value={"\uBC15\uC11C\uC900 (Product \uD300 \uB9AC\uB354)"} />
                    <ReviewRow
                      label={"\uBE44\uC0C1 \uC5F0\uB77D"}
                      value={formData.emergencyContact || "(\uBBF8\uC785\uB825)"}
                      muted={!formData.emergencyContact}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-sp-3 mt-sp-6 pt-sp-4 border-t border-border-subtle">
                {currentStep === 1 && (
                  <>
                    <Button variant="primary" onClick={handleNext}>
                      {"\uB2E4\uC74C"}
                    </Button>
                    <Button variant="ghost" onClick={handleCancel}>
                      {"\uCDE8\uC18C"}
                    </Button>
                  </>
                )}
                {currentStep === 2 && (
                  <>
                    <Button variant="primary" onClick={handleNext}>
                      {"\uB2E4\uC74C"}
                    </Button>
                    <Button variant="secondary" onClick={handlePrev}>
                      {"\uC774\uC804"}
                    </Button>
                    <Button variant="ghost" onClick={handleCancel}>
                      {"\uCDE8\uC18C"}
                    </Button>
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    <Button variant="primary" onClick={handleSubmit}>
                      {"\uC2E0\uCCAD\uD558\uAE30"}
                    </Button>
                    <Button variant="secondary" onClick={handlePrev}>
                      {"\uC774\uC804"}
                    </Button>
                    <Button variant="ghost" onClick={handleCancel}>
                      {"\uCDE8\uC18C"}
                    </Button>
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────── */

function ReviewRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-sp-2 border-b border-border-subtle last:border-b-0">
      <span className="text-sm text-text-tertiary">{label}</span>
      <span
        className={`text-sm font-medium ${muted ? "text-text-tertiary" : "text-text-primary"}`}
      >
        {value}
      </span>
    </div>
  );
}
