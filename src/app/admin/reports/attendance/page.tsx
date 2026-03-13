"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  KPICard,
  KPIGrid,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  BarChart,
  Badge,
  Button,
} from "@/components/ui";
import type { BarChartDatum } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface WeeklyTrend {
  week: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalCount: number;
  presentRate: number;
}

interface ExceptionSummaryItem {
  type: string;
  label: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface AttendanceInsightsData {
  totalRecords: number;
  avgPresentRate: number;
  totalExceptions: number;
  pendingExceptions: number;
  weeklyTrend: WeeklyTrend[];
  exceptionSummary: ExceptionSummaryItem[];
}

// ─── Helpers ────────────────────────────────────────────────

const EXCEPTION_BADGE_VARIANT: Record<string, "danger" | "warning" | "info" | "neutral"> = {
  CORRECTION: "danger",
  OVERTIME: "warning",
  BUSINESS_TRIP: "info",
  REMOTE_WORK: "info",
};

// ─── Component ──────────────────────────────────────────────

export default function AttendanceInsightsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <AttendanceInsightsContent />
    </Suspense>
  );
}

function AttendanceInsightsContent() {
  const [data, setData] = useState<AttendanceInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/attendance");
      if (res.ok) {
        const json: AttendanceInsightsData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const weeklyChartData: BarChartDatum[] = data.weeklyTrend.map((w) => ({
    name: w.week,
    value: w.presentRate,
  }));

  return (
    <div className="space-y-sp-6">
      {/* Page Header */}
      <div>
        <div className="text-xs text-text-tertiary mb-sp-1">
          Home &gt; Reports &gt; Attendance Insights
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              근태 인사이트
            </h1>
            <p className="text-sm text-text-secondary mt-sp-1">
              주간 출근 추이, 예외 현황 분석
            </p>
          </div>
          <Button variant="secondary" size="sm">
            리포트 내보내기
          </Button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <KPIGrid columns={4}>
        <KPICard
          eyebrow="총 출결 기록"
          value={data.totalRecords}
          label="최근 8주"
          emphasis
        />
        <KPICard
          eyebrow="평균 출근율"
          value={`${data.avgPresentRate}%`}
          label="전체 평균"
        />
        <KPICard
          eyebrow="총 예외 건수"
          value={data.totalExceptions}
          label="건"
        />
        <KPICard
          eyebrow="미처리 예외"
          value={data.pendingExceptions}
          label="승인 대기"
        />
      </KPIGrid>

      {/* Charts: Weekly Trend + Exception Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-sp-6">
        {/* 주간 출근 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>주간 출근 추이</CardTitle>
            <span className="text-sm text-text-tertiary">출근율 (%)</span>
          </CardHeader>
          <CardBody>
            {weeklyChartData.length > 0 ? (
              <>
                <BarChart
                  data={weeklyChartData}
                  layout="horizontal"
                  height={280}
                  showTooltip
                />
                {/* 주간 상세 테이블 */}
                <div className="mt-sp-4 border-t border-border pt-sp-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-tertiary text-left">
                        <th className="pb-sp-2 font-medium">주차</th>
                        <th className="pb-sp-2 font-medium text-right">출근</th>
                        <th className="pb-sp-2 font-medium text-right">결근</th>
                        <th className="pb-sp-2 font-medium text-right">지각</th>
                        <th className="pb-sp-2 font-medium text-right">출근율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.weeklyTrend.map((w) => (
                        <tr
                          key={w.week}
                          className="border-t border-border/50"
                        >
                          <td className="py-sp-2 text-text-primary">
                            {w.week}
                          </td>
                          <td className="py-sp-2 text-text-primary text-right">
                            {w.presentCount}명
                          </td>
                          <td className="py-sp-2 text-text-primary text-right">
                            {w.absentCount}명
                          </td>
                          <td className="py-sp-2 text-text-primary text-right">
                            {w.lateCount}명
                          </td>
                          <td className="py-sp-2 text-text-secondary text-right">
                            {w.presentRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  출결 데이터가 없습니다
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* 예외 요약 */}
        <Card>
          <CardHeader>
            <CardTitle>예외 현황 요약</CardTitle>
            <span className="text-sm text-text-tertiary">유형별 현황</span>
          </CardHeader>
          <CardBody>
            {data.exceptionSummary.length > 0 ? (
              <div className="space-y-sp-4">
                {data.exceptionSummary.map((ex) => (
                  <div
                    key={ex.type}
                    className="border border-border rounded-lg p-sp-4"
                  >
                    <div className="flex items-center justify-between mb-sp-2">
                      <div className="flex items-center gap-sp-2">
                        <Badge variant={EXCEPTION_BADGE_VARIANT[ex.type] ?? "neutral"}>
                          {ex.label}
                        </Badge>
                        <span className="text-lg font-semibold text-text-primary">
                          {ex.total}건
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-sp-2 text-sm">
                      <div className="text-center">
                        <div className="text-text-tertiary">대기</div>
                        <div className="font-medium text-warning">
                          {ex.pending}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-text-tertiary">승인</div>
                        <div className="font-medium text-success">
                          {ex.approved}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-text-tertiary">반려</div>
                        <div className="font-medium text-danger">
                          {ex.rejected}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-sp-8">
                <span className="text-sm text-text-tertiary">
                  예외 데이터가 없습니다
                </span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
