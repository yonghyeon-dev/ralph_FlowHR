"use client";

import { useState, useEffect } from "react";
import { Drawer } from "@/components/layout/Drawer";
import { Badge, Button } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface DepartmentInfo {
  id: string;
  name: string;
  manager: { id: string; name: string } | null;
}

interface PositionInfo {
  id: string;
  name: string;
  level: number;
}

interface ChangeRecord {
  id: string;
  type: string;
  description: string | null;
  effectiveDate: string;
  fromDepartment: { name: string } | null;
  toDepartment: { name: string } | null;
  fromPosition: { name: string } | null;
  toPosition: { name: string } | null;
}

interface EmployeeDetail {
  id: string;
  employeeNumber: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  type: string;
  hireDate: string;
  resignDate: string | null;
  department: DepartmentInfo | null;
  position: PositionInfo | null;
  changes: ChangeRecord[];
}

interface EmployeeDetailDrawerProps {
  employeeId: string | null;
  onClose: () => void;
}

// ─── Constants ──────────────────────────────────────────────

const STATUS_BADGE_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "재직 중", variant: "success" },
  ON_LEAVE: { label: "휴직", variant: "neutral" },
  PENDING_RESIGNATION: { label: "퇴사 예정", variant: "warning" },
  RESIGNED: { label: "퇴사", variant: "danger" },
  TERMINATED: { label: "해고", variant: "danger" },
};

const CHANGE_TYPE_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  HIRE: { label: "입사", variant: "success" },
  TRANSFER: { label: "이동", variant: "info" },
  PROMOTION: { label: "승진", variant: "info" },
  RESIGNATION: { label: "퇴사", variant: "warning" },
  TERMINATION: { label: "해고", variant: "danger" },
};

// ─── Helpers ────────────────────────────────────────────────

function getSignals(emp: EmployeeDetail): { title: string; meta: string; priority: string }[] {
  const signals: { title: string; meta: string; priority: string }[] = [];

  if (emp.status === "PENDING_RESIGNATION") {
    const d = emp.resignDate
      ? new Date(emp.resignDate).toLocaleDateString("ko-KR")
      : "미정";
    signals.push({ title: "퇴사 예정", meta: `퇴사일: ${d}`, priority: "critical" });
  }

  if (emp.status === "ON_LEAVE") {
    signals.push({ title: "휴직 중", meta: "복직 예정일 확인 필요", priority: "high" });
  }

  const hire = new Date(emp.hireDate);
  const now = new Date();
  const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
  if (months <= 3 && emp.status === "ACTIVE") {
    signals.push({ title: "신규 입사자", meta: "온보딩 기간 (3개월 이내)", priority: "medium" });
  }

  return signals;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-status-danger-solid",
  high: "bg-status-warning-solid",
  medium: "bg-status-info-solid",
};

// ─── Component ──────────────────────────────────────────────

export function EmployeeDetailDrawer({ employeeId, onClose }: EmployeeDetailDrawerProps) {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employeeId) {
      setEmployee(null);
      return;
    }

    setLoading(true);
    fetch(`/api/employees/${employeeId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setEmployee(json.data);
      })
      .finally(() => setLoading(false));
  }, [employeeId]);

  const signals = employee ? getSignals(employee) : [];
  const statusInfo = employee ? STATUS_BADGE_MAP[employee.status] : null;

  return (
    <Drawer
      open={!!employeeId}
      onClose={onClose}
      title={employee ? `구성원 상세 — ${employee.name}` : "구성원 상세"}
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      ) : employee ? (
        <div className="grid grid-cols-1 gap-sp-6 md:grid-cols-2">
          {/* Left: Profile */}
          <div>
            {/* Avatar + Basic Info */}
            <div className="mb-sp-6 flex items-center gap-sp-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-xl font-semibold text-brand-text">
                {employee.name.slice(0, 1)}
              </div>
              <div>
                <div className="flex items-center gap-sp-2">
                  <span className="text-lg font-semibold text-text-primary">
                    {employee.name}
                  </span>
                  {statusInfo && (
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  )}
                </div>
                <div className="text-sm text-text-secondary">
                  {employee.department?.name ?? "—"} · {employee.position?.name ?? "—"}
                </div>
                <div className="text-sm text-text-tertiary">
                  사번: {employee.employeeNumber} · 입사일:{" "}
                  {new Date(employee.hireDate).toLocaleDateString("ko-KR")}
                </div>
              </div>
            </div>

            {/* Detail Fields */}
            <div className="space-y-sp-3">
              <StatRow label="이메일" value={employee.email} />
              <StatRow label="전화번호" value={employee.phone ?? "—"} />
              <StatRow label="직위" value={employee.position?.name ?? "—"} />
              <StatRow
                label="팀장"
                value={employee.department?.manager?.name ?? "—"}
              />
              <StatRow
                label="고용 형태"
                value={
                  employee.type === "FULL_TIME"
                    ? "정규직"
                    : employee.type === "PART_TIME"
                      ? "파트타임"
                      : employee.type === "CONTRACT"
                        ? "계약직"
                        : "인턴"
                }
              />
            </div>
          </div>

          {/* Right: Signals & Actions */}
          <div>
            {/* Signals */}
            <div className="mb-sp-6">
              <h3 className="mb-sp-3 text-sm font-semibold text-text-primary">
                최근 시그널
              </h3>
              {signals.length === 0 ? (
                <p className="text-sm text-text-tertiary">특이사항 없음</p>
              ) : (
                <div className="space-y-sp-2">
                  {signals.map((signal, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-sp-3 rounded-md border border-border p-sp-3"
                    >
                      <div
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PRIORITY_COLORS[signal.priority] ?? "bg-gray-400"}`}
                      />
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {signal.title}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {signal.meta}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mb-sp-6">
              <h3 className="mb-sp-3 text-sm font-semibold text-text-primary">
                연결된 액션
              </h3>
              <div className="flex flex-wrap gap-sp-2">
                <Button size="sm" variant="secondary">근태 기록</Button>
                <Button size="sm" variant="secondary">휴가 이력</Button>
                <Button size="sm" variant="secondary">급여 명세</Button>
                <Button size="sm" variant="primary">1:1 예약</Button>
              </div>
            </div>

            {/* Recent Changes */}
            {employee.changes.length > 0 && (
              <div>
                <h3 className="mb-sp-3 text-sm font-semibold text-text-primary">
                  최근 인사 변동
                </h3>
                <div className="space-y-sp-2">
                  {employee.changes.map((change) => {
                    const typeInfo = CHANGE_TYPE_MAP[change.type];
                    return (
                      <div
                        key={change.id}
                        className="flex items-start gap-sp-3 text-sm"
                      >
                        <span className="mt-0.5 shrink-0">
                          {typeInfo ? (
                            <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                          ) : (
                            change.type
                          )}
                        </span>
                        <div className="flex-1">
                          <span className="text-text-primary">
                            {change.description ?? "—"}
                          </span>
                          <span className="ml-sp-2 text-xs text-text-tertiary">
                            {new Date(change.effectiveDate).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">직원을 찾을 수 없습니다</span>
        </div>
      )}
    </Drawer>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle py-sp-2">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}
