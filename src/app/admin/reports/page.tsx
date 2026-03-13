"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardBody,
  CardFooter,
  Button,
} from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface ReportCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  lastGenerated: string;
}

interface DashboardData {
  reports: ReportCard[];
}

// ─── Helpers ────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ─── Component ──────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/dashboard");
      if (res.ok) {
        const json: DashboardData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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
      <div className="mb-sp-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              리포트 센터
            </h1>
            <p className="mt-sp-1 text-md text-text-secondary">
              인사 데이터 인사이트, 분석 리포트, 정기 보고서 관리
            </p>
          </div>
          <div className="flex gap-sp-2">
            <Link href="/admin/reports/scheduled">
              <Button variant="secondary" size="sm">
                예약 보고서
              </Button>
            </Link>
            <Button variant="primary" size="sm">
              커스텀 리포트
            </Button>
          </div>
        </div>
      </div>

      {/* 7-Card Grid */}
      <div className="grid grid-cols-1 gap-sp-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.reports.map((report) => (
          <Card key={report.id}>
            <CardBody className="text-center" style={{ padding: "var(--sp-6)" }}>
              <div
                style={{ fontSize: "32px", marginBottom: "var(--sp-3)" }}
                role="img"
                aria-label={report.title}
              >
                {report.icon}
              </div>
              <div className="mb-sp-2 font-semibold text-text-primary">
                {report.title}
              </div>
              <div className="mb-sp-4 text-sm text-text-secondary">
                {report.description}
              </div>
              <Button variant="secondary" size="sm">
                리포트 보기
              </Button>
            </CardBody>
            <CardFooter>
              최근 생성: {formatDate(report.lastGenerated)}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
