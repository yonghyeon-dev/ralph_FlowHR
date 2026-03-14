"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  KPICard,
  KPIGrid,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  DataTable,
} from "@/components/ui";
import type { BadgeVariant, Column } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface PlanItem {
  id: string;
  name: string;
  description: string | null;
  pricePerSeat: number;
  maxSeats: number | null;
  storageGb: number;
  apiCallsPerMonth: number;
  supportLevel: string;
  features: string[];
  customerCount: number;
}

interface BillingAccountItem {
  id: string;
  tenantName: string;
  planName: string;
  monthlyAmount: number;
  paymentMethod: string;
  nextBillingDate: string;
  status: "ACTIVE" | "FAILED" | "GRACE_PERIOD" | "SUSPENDED";
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  tenantName: string;
  period: string;
  amount: number;
  issuedDate: string;
  paidAt: string | null;
  status: "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "CANCELLED" | "GRACE";
}

interface BillingData {
  kpi: {
    mrr: number;
    acv: number;
    accountsReceivable: number;
    churnRate: number;
  };
  planCatalog: PlanItem[];
  billingAccounts: BillingAccountItem[];
  invoices: InvoiceItem[];
}

// ─── Helpers ────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 100_000_000) {
    return `₩${(amount / 100_000_000).toFixed(1)}억`;
  }
  if (amount >= 10_000) {
    return `₩${(amount / 10_000).toFixed(amount >= 10_000_000 ? 1 : 0)}만`;
  }
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function formatAmount(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

const SUPPORT_LABELS: Record<string, string> = {
  email: "이메일",
  email_chat: "이메일 + 채팅",
  dedicated: "전담 매니저",
};

const BILLING_STATUS_MAP: Record<string, { text: string; variant: BadgeVariant }> = {
  ACTIVE: { text: "활성", variant: "success" },
  FAILED: { text: "실패", variant: "danger" },
  GRACE_PERIOD: { text: "유예", variant: "warning" },
  SUSPENDED: { text: "정지", variant: "danger" },
};

const INVOICE_STATUS_MAP: Record<string, { text: string; variant: BadgeVariant }> = {
  DRAFT: { text: "초안", variant: "neutral" },
  ISSUED: { text: "발행", variant: "info" },
  PAID: { text: "결제완료", variant: "success" },
  OVERDUE: { text: "연체", variant: "danger" },
  CANCELLED: { text: "취소", variant: "neutral" },
  GRACE: { text: "유예", variant: "warning" },
};

const PLAN_EMPHASIS: Record<string, string> = {
  Starter: "border-blue-200 bg-blue-50",
  Growth: "border-brand bg-brand-soft",
  Enterprise: "border-purple-200 bg-purple-50",
};

// ─── Component ──────────────────────────────────────────────

export default function PlatformBillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"accounts" | "invoices">("accounts");

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/billing");
      if (res.ok) {
        const json: BillingData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

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

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            플랜 &amp; 빌링
          </h1>
          <p className="mt-sp-1 text-md text-text-secondary">
            {new Date().toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · 매출 및 청구 현황
          </p>
        </div>
        <div className="flex items-center gap-sp-3">
          <Button variant="secondary">청구서 내보내기</Button>
          <Button variant="primary">결제 설정</Button>
        </div>
      </div>

      {/* KPI Row */}
      <KPIGrid columns={4}>
        <KPICard
          eyebrow="MRR"
          value={formatCurrency(data.kpi.mrr)}
          label="월간 반복 매출"
          emphasis
        />
        <KPICard
          eyebrow="ACV"
          value={formatCurrency(data.kpi.acv)}
          label="연간 계약 가치"
        />
        <KPICard
          eyebrow="미수금"
          value={formatCurrency(data.kpi.accountsReceivable)}
          label="미결제 청구액"
        />
        <KPICard
          eyebrow="이탈률"
          value={`${data.kpi.churnRate}%`}
          label="결제 이탈"
        />
      </KPIGrid>

      {/* Plan Catalog */}
      <div className="mt-sp-6">
        <h2 className="mb-sp-4 text-lg font-semibold text-text-primary">
          플랜 카탈로그
        </h2>
        <div className="grid grid-cols-1 gap-sp-4 md:grid-cols-3">
          {data.planCatalog.map((plan) => (
            <Card
              key={plan.id}
              className={[
                "border-2 transition-shadow hover:shadow-md",
                PLAN_EMPHASIS[plan.name] ?? "",
              ].join(" ")}
            >
              <CardHeader>
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="mt-sp-1 text-sm text-text-secondary">
                    {plan.description}
                  </p>
                </div>
                <Badge variant={plan.name === "Growth" ? "success" : "neutral"}>
                  {plan.customerCount}개 사용
                </Badge>
              </CardHeader>
              <CardBody>
                <div className="mb-sp-4">
                  <span className="text-2xl font-bold text-text-primary">
                    {formatAmount(plan.pricePerSeat)}
                  </span>
                  <span className="text-sm text-text-secondary"> / 좌석·월</span>
                </div>
                <div className="space-y-sp-2 text-sm text-text-secondary">
                  <div className="flex justify-between">
                    <span>최대 좌석</span>
                    <span className="font-medium text-text-primary">
                      {plan.maxSeats ? `${plan.maxSeats}석` : "무제한"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>스토리지</span>
                    <span className="font-medium text-text-primary">
                      {plan.storageGb} GB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>API 호출</span>
                    <span className="font-medium text-text-primary">
                      {(plan.apiCallsPerMonth / 1000).toFixed(0)}K / 월
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>지원</span>
                    <span className="font-medium text-text-primary">
                      {SUPPORT_LABELS[plan.supportLevel] ?? plan.supportLevel}
                    </span>
                  </div>
                </div>
                <div className="mt-sp-4 border-t border-border-subtle pt-sp-3">
                  <p className="mb-sp-2 text-xs font-semibold text-text-secondary">
                    포함 기능
                  </p>
                  <div className="flex flex-wrap gap-sp-1">
                    {plan.features.map((feat) => (
                      <Badge key={feat} variant="neutral">
                        {feat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* Tabs: 결제 계정 / 인보이스 */}
      <div className="mt-sp-6">
        <div className="mb-sp-4 flex gap-sp-2 border-b border-border">
          <button
            className={[
              "px-sp-4 py-sp-2 text-sm font-medium transition-colors",
              activeTab === "accounts"
                ? "border-b-2 border-brand text-brand"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
            onClick={() => setActiveTab("accounts")}
          >
            결제 계정 ({data.billingAccounts.length})
          </button>
          <button
            className={[
              "px-sp-4 py-sp-2 text-sm font-medium transition-colors",
              activeTab === "invoices"
                ? "border-b-2 border-brand text-brand"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
            onClick={() => setActiveTab("invoices")}
          >
            인보이스 ({data.invoices.length})
          </button>
        </div>

        {activeTab === "accounts" && (
          <BillingAccountsTable accounts={data.billingAccounts} />
        )}
        {activeTab === "invoices" && (
          <InvoicesTable invoices={data.invoices} />
        )}
      </div>
    </div>
  );
}

// ─── Billing Accounts Table ─────────────────────────────────

function BillingAccountsTable({
  accounts,
}: {
  accounts: BillingAccountItem[];
}) {
  const columns: Column<BillingAccountItem>[] = [
    {
      key: "tenantName",
      header: "테넌트",
      sortable: true,
    },
    {
      key: "planName",
      header: "플랜",
      render: (row) => (
        <Badge variant={row.planName === "Enterprise" ? "success" : "neutral"}>
          {row.planName}
        </Badge>
      ),
    },
    {
      key: "monthlyAmount",
      header: "월액",
      align: "right",
      sortable: true,
      render: (row) => formatAmount(row.monthlyAmount),
    },
    {
      key: "paymentMethod",
      header: "결제수단",
    },
    {
      key: "nextBillingDate",
      header: "다음 청구일",
      render: (row) =>
        new Date(row.nextBillingDate).toLocaleDateString("ko-KR"),
    },
    {
      key: "status",
      header: "상태",
      render: (row) => {
        const mapped = BILLING_STATUS_MAP[row.status] ?? {
          text: row.status,
          variant: "neutral" as BadgeVariant,
        };
        return <Badge variant={mapped.variant}>{mapped.text}</Badge>;
      },
    },
  ];

  return (
    <Card>
      <CardBody>
        <DataTable
          columns={columns}
          data={accounts}
          keyExtractor={(row) => row.id}
          emptyMessage="등록된 결제 계정이 없습니다."
        />
      </CardBody>
    </Card>
  );
}

// ─── Invoices Table ──────────────────────────────────────────

function InvoicesTable({ invoices }: { invoices: InvoiceItem[] }) {
  const columns: Column<InvoiceItem>[] = [
    {
      key: "invoiceNumber",
      header: "청구서 번호",
      sortable: true,
    },
    {
      key: "tenantName",
      header: "테넌트",
      sortable: true,
    },
    {
      key: "period",
      header: "기간",
    },
    {
      key: "amount",
      header: "금액",
      align: "right",
      sortable: true,
      render: (row) => formatAmount(row.amount),
    },
    {
      key: "issuedDate",
      header: "발행일",
      render: (row) =>
        new Date(row.issuedDate).toLocaleDateString("ko-KR"),
    },
    {
      key: "status",
      header: "상태",
      render: (row) => {
        const mapped = INVOICE_STATUS_MAP[row.status] ?? {
          text: row.status,
          variant: "neutral" as BadgeVariant,
        };
        return <Badge variant={mapped.variant}>{mapped.text}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: () => (
        <Button variant="ghost" size="sm">
          상세
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardBody>
        <DataTable
          columns={columns}
          data={invoices}
          keyExtractor={(row) => row.id}
          emptyMessage="인보이스 내역이 없습니다."
        />
      </CardBody>
    </Card>
  );
}
