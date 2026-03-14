"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Button,
  ProgressBar,
} from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface LeaveBalanceItem {
  type: string;
  label: string;
  total: number;
  used: number;
  pending: number;
}

interface GoalItem {
  id: string;
  title: string;
  progress: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  dueDate: string;
}

interface EvaluationSummary {
  cycleName: string;
  selfScore: number | null;
  managerScore: number | null;
  finalScore: number | null;
  status: string;
}

interface OneOnOneItem {
  id: string;
  managerName: string;
  scheduledAt: string;
  duration: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  agenda: string | null;
}

/* ────────────────────────────────────────────
   Mock Data
   ──────────────────────────────────────────── */

const PROFILE = {
  name: "김지은",
  employeeNumber: "EMP-001",
  email: "jieun.kim@flowhr.com",
  phone: "010-1234-5678",
  department: "Product",
  position: "시니어 개발자",
  hireDate: "2022-03-15",
  status: "ACTIVE" as const,
  type: "FULL_TIME" as const,
  avatar: "김",
};

const LEAVE_BALANCES: LeaveBalanceItem[] = [
  { type: "ANNUAL", label: "연차", total: 15, used: 6.5, pending: 1 },
  { type: "HALF_DAY", label: "반차", total: 4, used: 2, pending: 0 },
  { type: "SICK", label: "병가", total: 3, used: 0, pending: 0 },
  { type: "FAMILY_EVENT", label: "경조사", total: 5, used: 1, pending: 0 },
  { type: "COMPENSATORY", label: "보상휴가", total: 2, used: 0, pending: 0 },
];

const GOALS: GoalItem[] = [
  {
    id: "g1",
    title: "API 응답 시간 30% 개선",
    progress: 75,
    status: "IN_PROGRESS",
    dueDate: "2026-06-30",
  },
  {
    id: "g2",
    title: "코드 리뷰 가이드라인 작성",
    progress: 100,
    status: "COMPLETED",
    dueDate: "2026-03-01",
  },
  {
    id: "g3",
    title: "신규 인증 모듈 설계",
    progress: 40,
    status: "IN_PROGRESS",
    dueDate: "2026-05-15",
  },
  {
    id: "g4",
    title: "팀 온보딩 문서 정비",
    progress: 0,
    status: "NOT_STARTED",
    dueDate: "2026-07-31",
  },
];

const EVALUATION: EvaluationSummary = {
  cycleName: "2025 하반기 평가",
  selfScore: 4.2,
  managerScore: 4.5,
  finalScore: 4.4,
  status: "COMPLETED",
};

const ONE_ON_ONES: OneOnOneItem[] = [
  {
    id: "o1",
    managerName: "박서준",
    scheduledAt: "2026-03-18T14:00:00",
    duration: 30,
    status: "SCHEDULED",
    agenda: "Q1 목표 중간 점검, 기술 부채 논의",
  },
  {
    id: "o2",
    managerName: "박서준",
    scheduledAt: "2026-03-04T14:00:00",
    duration: 30,
    status: "COMPLETED",
    agenda: "프로젝트 진행 상황 공유",
  },
  {
    id: "o3",
    managerName: "박서준",
    scheduledAt: "2026-02-18T14:00:00",
    duration: 30,
    status: "COMPLETED",
    agenda: "성과 평가 피드백",
  },
];

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "재직 중", variant: "success" },
  ON_LEAVE: { label: "휴직", variant: "neutral" },
  PENDING_RESIGNATION: { label: "퇴사 예정", variant: "warning" },
  RESIGNED: { label: "퇴사", variant: "danger" },
};

const TYPE_MAP: Record<string, string> = {
  FULL_TIME: "정규직",
  PART_TIME: "파트타임",
  CONTRACT: "계약직",
  INTERN: "인턴",
};

const GOAL_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  NOT_STARTED: { label: "시작 전", variant: "neutral" },
  IN_PROGRESS: { label: "진행 중", variant: "info" },
  COMPLETED: { label: "완료", variant: "success" },
};

const ONE_ON_ONE_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  SCHEDULED: { label: "예정", variant: "info" },
  COMPLETED: { label: "완료", variant: "success" },
  CANCELLED: { label: "취소", variant: "danger" },
};

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
}

function getTenure(hireDate: string): string {
  const hire = new Date(hireDate);
  const now = new Date();
  const years = now.getFullYear() - hire.getFullYear();
  const months = now.getMonth() - hire.getMonth();
  const totalMonths = years * 12 + months;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m}개월`;
  if (m === 0) return `${y}년`;
  return `${y}년 ${m}개월`;
}

/* ────────────────────────────────────────────
   Tab type
   ──────────────────────────────────────────── */

type ProfileTab = "basic" | "leave" | "performance" | "oneOnOne";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "basic", label: "기본정보" },
  { id: "leave", label: "휴가 잔여" },
  { id: "performance", label: "성과" },
  { id: "oneOnOne", label: "1:1" },
];

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("basic");
  const statusInfo = STATUS_MAP[PROFILE.status];
  const totalLeaveRemaining = LEAVE_BALANCES.reduce(
    (sum, b) => sum + (b.total - b.used - b.pending),
    0
  );

  return (
    <div>
      {/* Page Header */}
      <div className="mb-sp-6">
        <div className="text-sm text-text-tertiary mb-sp-1">홈 &gt; 내 정보</div>
        <h1 className="text-xl font-bold text-text-primary">내 정보</h1>
        <p className="text-sm text-text-tertiary mt-sp-1">
          나의 프로필, 휴가 잔여, 성과, 1:1 미팅 정보를 확인합니다
        </p>
      </div>

      {/* Profile Hero */}
      <Card className="mb-sp-6">
        <CardBody>
          <div className="flex items-center gap-sp-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-soft text-2xl font-bold text-brand-text">
              {PROFILE.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-sp-3 mb-sp-1">
                <span className="text-xl font-bold text-text-primary">
                  {PROFILE.name}
                </span>
                {statusInfo && (
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                )}
              </div>
              <div className="text-sm text-text-secondary mb-sp-1">
                {PROFILE.department} · {PROFILE.position}
              </div>
              <div className="text-sm text-text-tertiary">
                사번: {PROFILE.employeeNumber} · 입사일: {formatDate(PROFILE.hireDate)} · 근속: {getTenure(PROFILE.hireDate)}
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-sp-2">
              <div className="text-right">
                <div className="text-xs text-text-tertiary">잔여 연차</div>
                <div className="text-2xl font-bold text-brand">
                  {totalLeaveRemaining}
                  <span className="text-sm font-normal text-text-tertiary ml-sp-1">일</span>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <div className="flex gap-sp-1 border-b border-border mb-sp-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "px-sp-4 py-sp-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-brand text-brand"
                : "border-transparent text-text-tertiary hover:text-text-secondary",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "basic" && <BasicInfoTab />}
      {activeTab === "leave" && <LeaveBalanceTab />}
      {activeTab === "performance" && <PerformanceTab />}
      {activeTab === "oneOnOne" && <OneOnOneTab />}
    </div>
  );
}

/* ────────────────────────────────────────────
   Tab: 기본정보 + 연락처
   ──────────────────────────────────────────── */

function BasicInfoTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-sp-6">
      {/* 기본정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-sp-3">
            <InfoRow label="이름" value={PROFILE.name} />
            <InfoRow label="사번" value={PROFILE.employeeNumber} />
            <InfoRow label="부서" value={PROFILE.department} />
            <InfoRow label="직위" value={PROFILE.position} />
            <InfoRow label="입사일" value={formatDate(PROFILE.hireDate)} />
            <InfoRow label="근속 기간" value={getTenure(PROFILE.hireDate)} />
            <InfoRow label="고용 형태" value={TYPE_MAP[PROFILE.type] ?? PROFILE.type} />
            <InfoRow
              label="재직 상태"
              value={STATUS_MAP[PROFILE.status]?.label ?? PROFILE.status}
            />
          </div>
        </CardBody>
      </Card>

      {/* 연락처 */}
      <Card>
        <CardHeader>
          <CardTitle>연락처</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-sp-3">
            <InfoRow label="이메일" value={PROFILE.email} />
            <InfoRow label="전화번호" value={PROFILE.phone} />
          </div>
          <div className="mt-sp-6 pt-sp-4 border-t border-border-subtle">
            <p className="text-xs text-text-tertiary mb-sp-3">
              연락처 정보 변경은 HR 담당자에게 요청해 주세요.
            </p>
            <Button size="sm" variant="secondary">
              정보 수정 요청
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ────────────────────────────────────────────
   Tab: 휴가 잔여
   ──────────────────────────────────────────── */

function LeaveBalanceTab() {
  const totalUsed = LEAVE_BALANCES.reduce((s, b) => s + b.used, 0);
  const totalAll = LEAVE_BALANCES.reduce((s, b) => s + b.total, 0);
  const totalPending = LEAVE_BALANCES.reduce((s, b) => s + b.pending, 0);
  const totalRemaining = totalAll - totalUsed - totalPending;

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-sp-4 mb-sp-6">
        <SummaryCard label="총 부여" value={`${totalAll}일`} />
        <SummaryCard label="사용" value={`${totalUsed}일`} />
        <SummaryCard label="승인 대기" value={`${totalPending}일`} />
        <SummaryCard label="잔여" value={`${totalRemaining}일`} highlight />
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>유형별 휴가 잔여</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-sp-3 px-sp-4 text-text-secondary font-medium">유형</th>
                  <th className="text-right py-sp-3 px-sp-4 text-text-secondary font-medium">부여</th>
                  <th className="text-right py-sp-3 px-sp-4 text-text-secondary font-medium">사용</th>
                  <th className="text-right py-sp-3 px-sp-4 text-text-secondary font-medium">대기</th>
                  <th className="text-right py-sp-3 px-sp-4 text-text-secondary font-medium">잔여</th>
                  <th className="py-sp-3 px-sp-4 text-text-secondary font-medium w-40">사용률</th>
                </tr>
              </thead>
              <tbody>
                {LEAVE_BALANCES.map((bal) => {
                  const remaining = bal.total - bal.used - bal.pending;
                  const usagePercent = bal.total > 0 ? Math.round((bal.used / bal.total) * 100) : 0;
                  return (
                    <tr key={bal.type} className="border-b border-border-subtle">
                      <td className="py-sp-3 px-sp-4 font-medium text-text-primary">{bal.label}</td>
                      <td className="py-sp-3 px-sp-4 text-right text-text-primary">{bal.total}</td>
                      <td className="py-sp-3 px-sp-4 text-right text-text-primary">{bal.used}</td>
                      <td className="py-sp-3 px-sp-4 text-right text-text-tertiary">
                        {bal.pending > 0 ? bal.pending : "—"}
                      </td>
                      <td className="py-sp-3 px-sp-4 text-right font-semibold text-brand">
                        {remaining}
                      </td>
                      <td className="py-sp-3 px-sp-4">
                        <div className="flex items-center gap-sp-2">
                          <ProgressBar value={usagePercent} variant="brand" className="flex-1" />
                          <span className="text-xs text-text-tertiary w-10 text-right">
                            {usagePercent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ────────────────────────────────────────────
   Tab: 성과
   ──────────────────────────────────────────── */

function PerformanceTab() {
  return (
    <div className="space-y-sp-6">
      {/* Evaluation Summary */}
      <Card>
        <CardHeader>
          <CardTitle>최근 평가</CardTitle>
          <Badge variant={EVALUATION.status === "COMPLETED" ? "success" : "info"}>
            {EVALUATION.status === "COMPLETED" ? "완료" : "진행 중"}
          </Badge>
        </CardHeader>
        <CardBody>
          <div className="mb-sp-3 text-sm text-text-secondary">
            {EVALUATION.cycleName}
          </div>
          <div className="grid grid-cols-3 gap-sp-4">
            <ScoreCard
              label="자기 평가"
              score={EVALUATION.selfScore}
            />
            <ScoreCard
              label="매니저 평가"
              score={EVALUATION.managerScore}
            />
            <ScoreCard
              label="최종 점수"
              score={EVALUATION.finalScore}
              highlight
            />
          </div>
        </CardBody>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle>목표 현황</CardTitle>
          <Badge variant="neutral">
            {GOALS.filter((g) => g.status === "COMPLETED").length}/{GOALS.length} 완료
          </Badge>
        </CardHeader>
        <CardBody>
          <div className="space-y-sp-4">
            {GOALS.map((goal) => {
              const statusInfo = GOAL_STATUS_MAP[goal.status];
              return (
                <div
                  key={goal.id}
                  className="flex items-start gap-sp-4 p-sp-4 rounded-lg border border-border-subtle"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sp-2 mb-sp-2">
                      <span className="text-sm font-medium text-text-primary">
                        {goal.title}
                      </span>
                      {statusInfo && (
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-sp-3">
                      <ProgressBar
                        value={goal.progress}
                        variant={goal.status === "COMPLETED" ? "success" : "brand"}
                        className="flex-1"
                      />
                      <span className="text-sm font-semibold text-text-primary w-12 text-right">
                        {goal.progress}%
                      </span>
                    </div>
                    <div className="text-xs text-text-tertiary mt-sp-1">
                      마감: {formatDate(goal.dueDate)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ────────────────────────────────────────────
   Tab: 1:1
   ──────────────────────────────────────────── */

function OneOnOneTab() {
  const upcoming = ONE_ON_ONES.filter((o) => o.status === "SCHEDULED");
  const past = ONE_ON_ONES.filter((o) => o.status !== "SCHEDULED");

  return (
    <div className="space-y-sp-6">
      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle>예정된 1:1</CardTitle>
          {upcoming.length > 0 && (
            <Badge variant="info">{upcoming.length}건</Badge>
          )}
        </CardHeader>
        <CardBody>
          {upcoming.length === 0 ? (
            <p className="text-sm text-text-tertiary py-sp-4 text-center">
              예정된 1:1 미팅이 없습니다
            </p>
          ) : (
            <div className="space-y-sp-3">
              {upcoming.map((meeting) => (
                <MeetingRow key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Past */}
      <Card>
        <CardHeader>
          <CardTitle>지난 1:1</CardTitle>
        </CardHeader>
        <CardBody>
          {past.length === 0 ? (
            <p className="text-sm text-text-tertiary py-sp-4 text-center">
              지난 1:1 기록이 없습니다
            </p>
          ) : (
            <div className="space-y-sp-3">
              {past.map((meeting) => (
                <MeetingRow key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle py-sp-2">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-sp-4 text-center",
        highlight
          ? "border-brand bg-brand-soft"
          : "border-border bg-surface-primary",
      ].join(" ")}
    >
      <div className="text-xs text-text-tertiary mb-sp-1">{label}</div>
      <div
        className={[
          "text-xl font-bold",
          highlight ? "text-brand" : "text-text-primary",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  highlight = false,
}: {
  label: string;
  score: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-sp-4 text-center",
        highlight
          ? "border-brand bg-brand-soft"
          : "border-border-subtle bg-surface-secondary",
      ].join(" ")}
    >
      <div className="text-xs text-text-tertiary mb-sp-2">{label}</div>
      <div
        className={[
          "text-2xl font-bold",
          highlight ? "text-brand" : "text-text-primary",
        ].join(" ")}
      >
        {score !== null ? score.toFixed(1) : "—"}
      </div>
      <div className="text-xs text-text-tertiary mt-sp-1">/ 5.0</div>
    </div>
  );
}

function MeetingRow({ meeting }: { meeting: OneOnOneItem }) {
  const statusInfo = ONE_ON_ONE_STATUS_MAP[meeting.status];
  return (
    <div className="flex items-start gap-sp-4 p-sp-4 rounded-lg border border-border-subtle">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
        {meeting.managerName.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-sp-2 mb-sp-1">
          <span className="text-sm font-medium text-text-primary">
            {meeting.managerName}
          </span>
          {statusInfo && (
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          )}
        </div>
        <div className="text-xs text-text-tertiary mb-sp-1">
          {formatDateTime(meeting.scheduledAt)} · {meeting.duration}분
        </div>
        {meeting.agenda && (
          <div className="text-sm text-text-secondary">{meeting.agenda}</div>
        )}
      </div>
    </div>
  );
}
