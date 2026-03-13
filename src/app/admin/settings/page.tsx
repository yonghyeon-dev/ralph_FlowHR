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
} from "@/components/ui";

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
      {activeTab === "roles" && <PlaceholderTab label="역할 및 권한" />}
      {activeTab === "notifications" && <PlaceholderTab label="알림 설정" />}
      {activeTab === "integrations" && <PlaceholderTab label="연동 관리" />}
      {activeTab === "audit" && <PlaceholderTab label="감사 로그" />}
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

// ─── Placeholder for future tabs ────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">
            {label} 기능은 준비 중입니다
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
