"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  DataTable,
  Badge,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import { Modal } from "@/components/layout/Modal";

// ─── Types ──────────────────────────────────────────────────

interface CompanyFormData {
  companyName: string;
  businessNumber: string;
  industry: string;
  representative: string;
  fiscalYearStart: string;
  timezone: string;
  workStartTime: string;
  workEndTime: string;
  logoUrl: string;
}

const EMPTY_FORM: CompanyFormData = {
  companyName: "",
  businessNumber: "",
  industry: "",
  representative: "",
  fiscalYearStart: "1",
  timezone: "Asia/Seoul",
  workStartTime: "09:00",
  workEndTime: "18:00",
  logoUrl: "",
};

// ─── Permission Matrix Constants (WI-056) ───────────────────

const FEATURES = [
  { key: "PEOPLE_MANAGE", label: "구성원 관리" },
  { key: "ATTENDANCE_MANAGE", label: "근태 관리" },
  { key: "PAYROLL_MANAGE", label: "급여 관리" },
  { key: "APPROVAL_MANAGE", label: "결재 승인" },
  { key: "REPORTS_VIEW", label: "리포트" },
  { key: "SETTINGS_EDIT", label: "설정" },
] as const;

const PERMISSION_LEVELS = [
  "전체",
  "읽기",
  "부서",
  "팀",
  "본인",
  "없음",
] as const;
type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

type PermissionMap = Record<string, PermissionLevel>;

function getPermissionBadgeVariant(
  level: PermissionLevel,
): "success" | "info" | "neutral" {
  if (level === "전체") return "success";
  if (level === "읽기" || level === "부서" || level === "팀") return "info";
  return "neutral";
}

function parseRolePermissions(permissions: unknown): PermissionMap {
  const perms: PermissionMap = {};
  if (Array.isArray(permissions)) {
    for (const feature of FEATURES) {
      perms[feature.key] = permissions.includes(feature.key) ? "전체" : "없음";
    }
  } else if (permissions && typeof permissions === "object") {
    const map = permissions as Record<string, string>;
    for (const feature of FEATURES) {
      perms[feature.key] =
        (map[feature.key] as PermissionLevel) || "없음";
    }
  } else {
    for (const feature of FEATURES) {
      perms[feature.key] = "없음";
    }
  }
  return perms;
}

// ─── Constants ──────────────────────────────────────────────

const TABS = [
  { key: "company", label: "회사 정보" },
  { key: "roles", label: "역할 및 권한" },
  { key: "notifications", label: "알림 설정" },
  { key: "integrations", label: "연동 관리" },
  { key: "audit", label: "감사 로그" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const INDUSTRY_OPTIONS = [
  { value: "", label: "선택하세요" },
  { value: "IT/소프트웨어", label: "IT/소프트웨어" },
  { value: "제조업", label: "제조업" },
  { value: "서비스업", label: "서비스업" },
  { value: "금융/보험업", label: "금융/보험업" },
  { value: "유통/물류", label: "유통/물류" },
  { value: "건설업", label: "건설업" },
  { value: "교육", label: "교육" },
  { value: "의료/제약", label: "의료/제약" },
];

const FISCAL_YEAR_OPTIONS = [
  { value: "1", label: "1월" },
  { value: "4", label: "4월" },
  { value: "7", label: "7월" },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Seoul", label: "Asia/Seoul (KST, UTC+9)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST, UTC+9)" },
  { value: "America/New_York", label: "America/New_York (EST, UTC-5)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST, UTC-8)" },
  { value: "Europe/London", label: "Europe/London (GMT, UTC+0)" },
];

// ─── Component ──────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "company";

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "company") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.push(`/admin/settings${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="space-y-sp-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">설정</h1>
        <p className="text-sm text-text-tertiary mt-sp-1">
          회사 정보와 시스템 설정을 관리합니다
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <nav className="flex gap-sp-1 border-b border-border-subtle">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={[
              "px-sp-4 py-sp-2 text-sm font-medium transition-colors duration-fast -mb-px",
              activeTab === tab.key
                ? "text-brand border-b-2 border-brand"
                : "text-text-tertiary hover:text-text-primary",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* 탭 콘텐츠 */}
      {activeTab === "company" && <CompanyTab />}
      {activeTab === "roles" && (
        <div className="space-y-sp-6">
          <RolesTab />
          <PermissionsMatrix />
        </div>
      )}
      {activeTab === "notifications" && <NotificationsTab />}
      {activeTab === "integrations" && <IntegrationsTab />}
      {activeTab === "audit" && <AuditLogTab />}
    </div>
  );
}

// ─── Company Tab (WI-054) ───────────────────────────────────

function CompanyTab() {
  const [form, setForm] = useState<CompanyFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/company");
      if (res.ok) {
        const json = await res.json();
        setForm({
          companyName: json.company.companyName || "",
          businessNumber: json.company.businessNumber || "",
          industry: json.company.industry || "",
          representative: json.company.representative || "",
          fiscalYearStart: json.company.fiscalYearStart || "1",
          timezone: json.company.timezone || "Asia/Seoul",
          workStartTime: json.company.workStartTime || "09:00",
          workEndTime: json.company.workEndTime || "18:00",
          logoUrl: json.company.logoUrl || "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave() {
    setError("");
    setSuccess("");

    if (!form.companyName.trim()) {
      setError("회사명은 필수 항목입니다");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errJson = await res.json();
        setError(errJson.error || "저장에 실패했습니다");
        return;
      }

      setSuccess("회사 정보가 저장되었습니다");
      setTimeout(() => setSuccess(""), 3000);
    } finally {
      setSaving(false);
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
    <Card>
      <CardHeader>
        <h2 className="text-md font-semibold text-text-primary">
          회사 기본 정보
        </h2>
        <div className="flex items-center gap-sp-3">
          {error && (
            <span className="text-sm text-status-danger-text">{error}</span>
          )}
          {success && (
            <span className="text-sm text-status-success-text">{success}</span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-sp-6 lg:grid-cols-2">
          {/* 좌측 컬럼 */}
          <div>
            <Input
              label="회사명"
              value={form.companyName}
              onChange={(e) =>
                setForm({ ...form, companyName: e.target.value })
              }
              placeholder="주식회사 FlowHR"
              error={
                error && !form.companyName.trim()
                  ? "회사명은 필수입니다"
                  : undefined
              }
            />
            <Input
              label="사업자 등록번호"
              value={form.businessNumber}
              onChange={(e) =>
                setForm({ ...form, businessNumber: e.target.value })
              }
              placeholder="000-00-00000"
            />
            <Select
              label="업종"
              options={INDUSTRY_OPTIONS}
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
            <Input
              label="대표자"
              value={form.representative}
              onChange={(e) =>
                setForm({ ...form, representative: e.target.value })
              }
              placeholder="홍길동"
            />
          </div>

          {/* 우측 컬럼 */}
          <div>
            <Select
              label="회계연도 시작"
              options={FISCAL_YEAR_OPTIONS}
              value={form.fiscalYearStart}
              onChange={(e) =>
                setForm({ ...form, fiscalYearStart: e.target.value })
              }
            />
            <Select
              label="타임존"
              options={TIMEZONE_OPTIONS}
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            />

            {/* 기본 근무 시간 */}
            <div className="mb-sp-4">
              <label className="block text-sm font-medium text-text-secondary mb-sp-1">
                기본 근무 시간
              </label>
              <div className="flex items-center gap-sp-2">
                <input
                  type="time"
                  value={form.workStartTime}
                  onChange={(e) =>
                    setForm({ ...form, workStartTime: e.target.value })
                  }
                  className="flex-1 px-sp-3 py-sp-2 border rounded-sm text-md font-sans bg-surface-primary text-text-primary transition-colors duration-fast focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand/10 border-border"
                />
                <span className="text-sm text-text-tertiary">~</span>
                <input
                  type="time"
                  value={form.workEndTime}
                  onChange={(e) =>
                    setForm({ ...form, workEndTime: e.target.value })
                  }
                  className="flex-1 px-sp-3 py-sp-2 border rounded-sm text-md font-sans bg-surface-primary text-text-primary transition-colors duration-fast focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand/10 border-border"
                />
              </div>
            </div>

            {/* 회사 로고 */}
            <div className="mb-sp-4">
              <label className="block text-sm font-medium text-text-secondary mb-sp-1">
                회사 로고
              </label>
              <div className="flex items-center gap-sp-4">
                <div
                  className="flex items-center justify-center rounded-md border-2 border-dashed border-border bg-surface-secondary"
                  style={{ width: 80, height: 80 }}
                >
                  {form.logoUrl ? (
                    <Image
                      src={form.logoUrl}
                      alt="회사 로고"
                      width={80}
                      height={80}
                      className="h-full w-full rounded-md object-contain"
                    />
                  ) : (
                    <span className="text-xs text-text-tertiary text-center px-sp-1">
                      로고 없음
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-sp-2">
                  <Input
                    label=""
                    value={form.logoUrl}
                    onChange={(e) =>
                      setForm({ ...form, logoUrl: e.target.value })
                    }
                    placeholder="로고 이미지 URL"
                  />
                  <p className="text-xs text-text-tertiary">
                    권장 크기: 200x200px, PNG 또는 SVG
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Roles Tab (WI-055) ─────────────────────────────────────

interface RoleData {
  id: string;
  name: string;
  description: string | null;
  permissions: unknown;
  isSystem: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RoleFormData {
  name: string;
  description: string;
}

const EMPTY_ROLE_FORM: RoleFormData = {
  name: "",
  description: "",
};

function RolesTab() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [form, setForm] = useState<RoleFormData>(EMPTY_ROLE_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/roles");
      if (res.ok) {
        const json = await res.json();
        setRoles(json.roles);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  function openCreateModal() {
    setEditingRole(null);
    setForm(EMPTY_ROLE_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(role: RoleData) {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description || "",
    });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingRole(null);
    setError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("역할명은 필수입니다");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const isEdit = !!editingRole;
      const url = isEdit
        ? `/api/settings/roles/${editingRole.id}`
        : "/api/settings/roles";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        setError(errJson.error || "저장에 실패했습니다");
        return;
      }

      closeModal();
      fetchRoles();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: RoleData) {
    if (role.isSystem) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/settings/roles/${role.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errJson = await res.json();
        setError(errJson.error || "삭제에 실패했습니다");
        return;
      }

      fetchRoles();
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<RoleData>[] = [
    {
      key: "name",
      header: "역할명",
      render: (row) => (
        <div className="flex items-center gap-sp-2">
          <span className="font-semibold text-text-primary">{row.name}</span>
          {row.isSystem && (
            <Badge variant="info">시스템</Badge>
          )}
        </div>
      ),
    },
    {
      key: "description",
      header: "설명",
      render: (row) => (
        <span className="text-text-secondary">
          {row.description || "-"}
        </span>
      ),
    },
    {
      key: "userCount",
      header: "사용자 수",
      align: "right",
      render: (row) => (
        <span className="tabular-nums">{row.userCount.toLocaleString()}명</span>
      ),
    },
    {
      key: "actions",
      header: "액션",
      align: "center",
      width: "160px",
      render: (row) => (
        <div className="flex items-center justify-center gap-sp-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
          >
            수정
          </Button>
          {!row.isSystem && (
            <Button
              variant="ghost"
              size="sm"
              disabled={deleting || row.userCount > 0}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row);
              }}
            >
              삭제
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
          <h2 className="text-md font-semibold text-text-primary">
            역할 관리
          </h2>
          <Button onClick={openCreateModal}>역할 추가</Button>
        </CardHeader>
        <CardBody>
          {error && !modalOpen && (
            <div className="mb-sp-4 rounded-md bg-status-danger-bg px-sp-4 py-sp-3 text-sm text-status-danger-text">
              {error}
            </div>
          )}
          <DataTable<RoleData>
            columns={columns}
            data={roles}
            keyExtractor={(r) => r.id}
            emptyMessage="등록된 역할이 없습니다"
          />
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingRole ? "역할 수정" : "역할 추가"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-sp-4 rounded-md bg-status-danger-bg px-sp-4 py-sp-3 text-sm text-status-danger-text">
            {error}
          </div>
        )}
        <Input
          label="역할명"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="예: HR 관리자"
          error={error && !form.name.trim() ? "역할명은 필수입니다" : undefined}
        />
        <Input
          label="설명"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="이 역할의 설명을 입력하세요"
        />
      </Modal>
    </>
  );
}

// ─── Permissions Matrix (WI-056) ────────────────────────────

function PermissionsMatrix() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionState, setPermissionState] = useState<
    Record<string, PermissionMap>
  >({});
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/roles");
      if (res.ok) {
        const json = await res.json();
        setRoles(json.roles);
        const initial: Record<string, PermissionMap> = {};
        for (const role of json.roles as RoleData[]) {
          initial[role.id] = parseRolePermissions(role.permissions);
        }
        setPermissionState(initial);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  function handleCellClick(roleId: string, featureKey: string) {
    setPermissionState((prev) => {
      const current = (prev[roleId]?.[featureKey] || "없음") as PermissionLevel;
      const idx = PERMISSION_LEVELS.indexOf(current);
      const next = PERMISSION_LEVELS[(idx + 1) % PERMISSION_LEVELS.length];
      return {
        ...prev,
        [roleId]: { ...prev[roleId], [featureKey]: next },
      };
    });
    setHasChanges(true);
    setSuccess("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const promises = roles.map((role) => {
        const perms = permissionState[role.id];
        if (!perms) return Promise.resolve(new Response());
        return fetch(`/api/settings/roles/${role.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: perms }),
        });
      });
      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        setError("일부 권한 저장에 실패했습니다");
        return;
      }
      setHasChanges(false);
      setSuccess("권한이 저장되었습니다");
      setTimeout(() => setSuccess(""), 3000);
    } finally {
      setSaving(false);
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
    <Card>
      <CardHeader>
        <h2 className="text-md font-semibold text-text-primary">
          권한 매트릭스
        </h2>
        <div className="flex items-center gap-sp-3">
          {error && (
            <span className="text-sm text-status-danger-text">{error}</span>
          )}
          {success && (
            <span className="text-sm text-status-success-text">{success}</span>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-sp-4 py-sp-3 text-left text-sm font-semibold text-text-secondary">
                  기능
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="px-sp-4 py-sp-3 text-center text-sm font-semibold text-text-secondary"
                  >
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature) => (
                <tr
                  key={feature.key}
                  className="border-b border-border-subtle hover:bg-surface-secondary transition-colors duration-fast"
                >
                  <td className="px-sp-4 py-sp-3 text-sm font-medium text-text-primary">
                    {feature.label}
                  </td>
                  {roles.map((role) => {
                    const level = (permissionState[role.id]?.[feature.key] ||
                      "없음") as PermissionLevel;
                    return (
                      <td
                        key={role.id}
                        className="px-sp-4 py-sp-3 text-center cursor-pointer"
                        onClick={() => handleCellClick(role.id, feature.key)}
                      >
                        <Badge variant={getPermissionBadgeVariant(level)}>
                          {level}
                        </Badge>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-sp-4 text-xs text-text-tertiary">
          셀을 클릭하면 권한 수준이 변경됩니다: 전체 → 읽기 → 부서 → 팀 →
          본인 → 없음
        </p>
      </CardBody>
    </Card>
  );
}

// ─── Notifications Tab (WI-057) ──────────────────────────────

interface NotificationRule {
  id: string;
  event: string;
  channels: string[];
  recipients: string;
  enabled: boolean;
}

const INITIAL_NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: "nr-1",
    event: "휴가 신청",
    channels: ["이메일", "Slack"],
    recipients: "직속 팀장",
    enabled: true,
  },
  {
    id: "nr-2",
    event: "초과근무 상한 도달",
    channels: ["이메일", "Slack", "SMS"],
    recipients: "팀장 + HR 담당",
    enabled: true,
  },
  {
    id: "nr-3",
    event: "체크아웃 누락",
    channels: ["Slack"],
    recipients: "본인 + 팀장",
    enabled: true,
  },
  {
    id: "nr-4",
    event: "급여 명세서 발행",
    channels: ["이메일"],
    recipients: "본인",
    enabled: true,
  },
  {
    id: "nr-5",
    event: "문서 서명 요청",
    channels: ["이메일", "Slack"],
    recipients: "수신자",
    enabled: true,
  },
  {
    id: "nr-6",
    event: "계약 만료 알림",
    channels: ["이메일"],
    recipients: "HR 담당 + 부서장",
    enabled: false,
  },
];

function getChannelBadgeVariant(
  channel: string,
): "info" | "danger" | "neutral" {
  if (channel === "SMS") return "danger";
  return "info";
}

function NotificationsTab() {
  const [rules, setRules] = useState<NotificationRule[]>(
    INITIAL_NOTIFICATION_RULES,
  );

  function handleToggle(id: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    );
  }

  const columns: Column<NotificationRule>[] = [
    {
      key: "event",
      header: "이벤트",
      render: (row) => (
        <span className="font-medium text-text-primary">{row.event}</span>
      ),
    },
    {
      key: "channels",
      header: "채널",
      render: (row) => (
        <div className="flex flex-wrap gap-sp-1">
          {row.channels.map((ch) => (
            <Badge key={ch} variant={getChannelBadgeVariant(ch)}>
              {ch}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "recipients",
      header: "수신자",
      render: (row) => (
        <span className="text-text-secondary">{row.recipients}</span>
      ),
    },
    {
      key: "enabled",
      header: "상태",
      align: "center",
      width: "80px",
      render: (row) => (
        <button
          onClick={() => handleToggle(row.id)}
          className={[
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-fast",
            row.enabled ? "bg-brand" : "bg-border",
          ].join(" ")}
          aria-label={row.enabled ? "알림 끄기" : "알림 켜기"}
        >
          <span
            className={[
              "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-fast shadow-sm",
              row.enabled ? "translate-x-[18px]" : "translate-x-[3px]",
            ].join(" ")}
          />
        </button>
      ),
    },
    {
      key: "actions",
      header: "액션",
      align: "center",
      width: "80px",
      render: () => (
        <Button variant="ghost" size="sm">
          편집
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-md font-semibold text-text-primary">알림 규칙</h2>
        <Button size="sm">규칙 추가</Button>
      </CardHeader>
      <CardBody>
        <DataTable<NotificationRule>
          columns={columns}
          data={rules}
          keyExtractor={(r) => r.id}
          emptyMessage="등록된 알림 규칙이 없습니다"
        />
      </CardBody>
    </Card>
  );
}

// ─── Integrations Tab (WI-057) ───────────────────────────────

interface IntegrationService {
  id: string;
  name: string;
  description: string;
  initial: string;
  bgColor: string;
  connected: boolean;
  detail: { label: string; value: string }[];
}

const INTEGRATION_SERVICES: IntegrationService[] = [
  {
    id: "slack",
    name: "Slack",
    description: "메시지 알림 연동",
    initial: "S",
    bgColor: "#4A154B",
    connected: true,
    detail: [
      { label: "상태", value: "연결됨" },
      { label: "워크스페이스", value: "flowcommerce" },
      { label: "마지막 동기화", value: "2분 전" },
    ],
  },
  {
    id: "google",
    name: "Google Workspace",
    description: "SSO 및 캘린더 연동",
    initial: "G",
    bgColor: "#0078D4",
    connected: true,
    detail: [
      { label: "상태", value: "연결됨" },
      { label: "도메인", value: "flowcommerce.kr" },
      { label: "마지막 동기화", value: "15분 전" },
    ],
  },
  {
    id: "jira",
    name: "Jira",
    description: "프로젝트/이슈 연동",
    initial: "J",
    bgColor: "#333333",
    connected: false,
    detail: [
      { label: "상태", value: "설정 필요" },
      { label: "도메인", value: "\u2014" },
      { label: "마지막 동기화", value: "\u2014" },
    ],
  },
];

function IntegrationsTab() {
  return (
    <div className="space-y-sp-4">
      <div className="flex items-center justify-between">
        <h2 className="text-md font-semibold text-text-primary">연동 관리</h2>
      </div>
      <div className="grid grid-cols-1 gap-sp-4 md:grid-cols-2 lg:grid-cols-3">
        {INTEGRATION_SERVICES.map((svc) => (
          <Card key={svc.id}>
            <CardBody>
              <div className="p-sp-1">
                {/* 서비스 헤더 */}
                <div className="flex items-center gap-sp-3 mb-sp-4">
                  <div
                    className="flex items-center justify-center rounded-md text-white font-bold text-lg"
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: svc.bgColor,
                    }}
                  >
                    {svc.initial}
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">
                      {svc.name}
                    </div>
                    <div className="text-sm text-text-tertiary">
                      {svc.description}
                    </div>
                  </div>
                </div>

                {/* 상세 정보 */}
                <div className="space-y-sp-2">
                  {svc.detail.map((d) => (
                    <div
                      key={d.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-text-tertiary">{d.label}</span>
                      <span className="text-text-primary">
                        {d.label === "상태" ? (
                          <Badge
                            variant={svc.connected ? "success" : "warning"}
                          >
                            {d.value}
                          </Badge>
                        ) : (
                          d.value
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 액션 버튼 */}
                <div className="mt-sp-4">
                  <Button
                    variant={svc.connected ? "secondary" : "primary"}
                    size="sm"
                    className="w-full"
                  >
                    {svc.connected ? "설정" : "연결하기"}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Audit Log Tab (WI-058) ──────────────────────────────────

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  roleBadge: "success" | "info" | "neutral";
  action: string;
  target: string;
  ip: string;
}

const AUDIT_LOG_DATA: AuditLogEntry[] = [
  {
    id: "al-1",
    timestamp: "2026.03.12 14:32:18",
    user: "박유리",
    role: "HR 관리자",
    roleBadge: "info",
    action: "구성원 상태 변경",
    target: "정현우 (재직 중 → 퇴사 예정)",
    ip: "192.168.1.45",
  },
  {
    id: "al-2",
    timestamp: "2026.03.12 13:15:42",
    user: "김상훈",
    role: "슈퍼 관리자",
    roleBadge: "success",
    action: "역할 권한 수정",
    target: "급여 담당자 역할 — 리포트 읽기 권한 추가",
    ip: "192.168.1.10",
  },
  {
    id: "al-3",
    timestamp: "2026.03.12 11:08:33",
    user: "박유리",
    role: "HR 관리자",
    roleBadge: "info",
    action: "휴가 승인",
    target: "박서준 — 연차 3/20~21",
    ip: "192.168.1.45",
  },
  {
    id: "al-4",
    timestamp: "2026.03.12 10:30:05",
    user: "박유리",
    role: "HR 관리자",
    roleBadge: "info",
    action: "문서 발송",
    target: "강지민 — 근로계약서 발송",
    ip: "192.168.1.45",
  },
  {
    id: "al-5",
    timestamp: "2026.03.12 09:22:17",
    user: "김상훈",
    role: "슈퍼 관리자",
    roleBadge: "success",
    action: "시스템 설정 변경",
    target: "기본 근무 시간 09:00~18:00 확인",
    ip: "192.168.1.10",
  },
  {
    id: "al-6",
    timestamp: "2026.03.11 17:45:28",
    user: "인사팀 시스템",
    role: "시스템",
    roleBadge: "neutral",
    action: "자동 알림 발송",
    target: "체크아웃 누락 알림 4건 발송",
    ip: "10.0.0.1",
  },
  {
    id: "al-7",
    timestamp: "2026.03.11 16:30:12",
    user: "강태호",
    role: "부서장",
    roleBadge: "info",
    action: "초과근무 승인",
    target: "최도윤 — 3/11 야간근무 승인",
    ip: "192.168.1.72",
  },
];

const AUDIT_PAGE_SIZE = 7;
const AUDIT_TOTAL = 4521;

function AuditLogTab() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = AUDIT_LOG_DATA.filter((entry) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      entry.user.toLowerCase().includes(q) ||
      entry.action.toLowerCase().includes(q) ||
      entry.target.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(AUDIT_TOTAL / AUDIT_PAGE_SIZE);
  const startIdx = (currentPage - 1) * AUDIT_PAGE_SIZE;
  const displayed = filtered.slice(0, AUDIT_PAGE_SIZE);

  function handleExport() {
    const header = "시간,사용자,역할,액션,대상,IP";
    const rows = AUDIT_LOG_DATA.map(
      (e) =>
        `"${e.timestamp}","${e.user}","${e.role}","${e.action}","${e.target}","${e.ip}"`,
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function getPageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) return [1, 2, 3, "ellipsis", totalPages];
    if (currentPage >= totalPages - 2)
      return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    return [1, "ellipsis", currentPage, "ellipsis", totalPages];
  }

  const columns: Column<AuditLogEntry>[] = [
    {
      key: "timestamp",
      header: "시간",
      width: "170px",
      render: (row) => (
        <span className="text-sm text-text-secondary tabular-nums">
          {row.timestamp}
        </span>
      ),
    },
    {
      key: "user",
      header: "사용자",
      render: (row) => (
        <span className="font-medium text-text-primary">{row.user}</span>
      ),
    },
    {
      key: "role",
      header: "역할",
      width: "120px",
      render: (row) => <Badge variant={row.roleBadge}>{row.role}</Badge>,
    },
    {
      key: "action",
      header: "액션",
      render: (row) => (
        <span className="text-text-primary">{row.action}</span>
      ),
    },
    {
      key: "target",
      header: "대상",
      render: (row) => (
        <span className="text-text-secondary">{row.target}</span>
      ),
    },
    {
      key: "ip",
      header: "IP",
      width: "130px",
      render: (row) => (
        <span className="text-sm text-text-tertiary tabular-nums">
          {row.ip}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-md font-semibold text-text-primary">감사 로그</h2>
        <div className="flex items-center gap-sp-2">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="사용자, 액션 검색..."
            className="px-sp-3 py-sp-1.5 border rounded-sm text-sm bg-surface-primary text-text-primary transition-colors duration-fast focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand/10 border-border"
            style={{ width: 200 }}
          />
          <Button variant="secondary" size="sm" onClick={handleExport}>
            내보내기
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <DataTable<AuditLogEntry>
          columns={columns}
          data={displayed}
          keyExtractor={(r) => r.id}
          emptyMessage="검색 결과가 없습니다"
        />

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between mt-sp-4 pt-sp-4 border-t border-border-subtle">
          <span className="text-sm text-text-tertiary">
            총 {AUDIT_TOTAL.toLocaleString()}건 중 {startIdx + 1} &ndash;{" "}
            {Math.min(startIdx + AUDIT_PAGE_SIZE, AUDIT_TOTAL)} 표시
          </span>
          <div className="flex items-center gap-sp-1">
            <button
              className="px-sp-2 py-sp-1 text-sm rounded-sm border border-border hover:bg-surface-secondary disabled:opacity-50 transition-colors duration-fast"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              &laquo;
            </button>
            {getPageNumbers().map((page, idx) =>
              page === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-sp-2 py-sp-1 text-sm text-text-tertiary"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  className={[
                    "px-sp-2 py-sp-1 text-sm rounded-sm border transition-colors duration-fast",
                    currentPage === page
                      ? "border-brand bg-brand text-white"
                      : "border-border hover:bg-surface-secondary text-text-primary",
                  ].join(" ")}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ),
            )}
            <button
              className="px-sp-2 py-sp-1 text-sm rounded-sm border border-border hover:bg-surface-secondary disabled:opacity-50 transition-colors duration-fast"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
            >
              &raquo;
            </button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
