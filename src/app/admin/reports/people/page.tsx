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
  Button,
} from "@/components/ui";
import type { BarChartDatum } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface DepartmentDist {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

interface TenureGroup {
  label: string;
  count: number;
  percentage: number;
}

interface PeopleInsightsData {
  totalHeadcount: number;
  activeCount: number;
  onLeaveCount: number;
  resignedCount: number;
  avgTenureMonths: number;
  departmentDistribution: DepartmentDist[];
  tenureDistribution: TenureGroup[];
}

// ─── Helpers ────────────────────────────────────────────────

function formatTenure(months: number): string {
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (years === 0) return `${remaining}개월`;
  if (remaining === 0) return `${years}년`;
  return `${years}년 ${remaining}개월`;
}

// ─── Component ──────────────────────────────────────────────

export default function PeopleInsightsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-sp-12">
          <span className="text-sm text-text-tertiary">불러오는 중...</span>
        </div>
      }
    >
      <PeopleInsightsContent />
    </Suspense>
  );
}

function PeopleInsightsContent() {
  const [data, setData] = useState<PeopleInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/people");
      if (res.ok) {
        const json: PeopleInsightsData = await res.json();
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

  const deptChartData: BarChartDatum[] = data.departmentDistribution.map(
    (d) => ({ name: d.name, value: d.count })
  );

  const tenureChartData: BarChartDatum[] = data.tenureDistribution.map((t) => ({
    name: t.label,
    value: t.count,
  }));

  return (
    <div className="space-y-sp-6">
      {/* Page Header */}
      <div>
        <div className="text-xs text-text-tertiary mb-sp-1">
          Home &gt; Reports &gt; People Insights
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              인사 인사이트
            </h1>
            <p className="text-sm text-text-secondary mt-sp-1">
              부서별 인원 분포, 근속 분포 등 인사 현황 분석
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
          eyebrow="총 인원"
          value={data.totalHeadcount}
          label={`${data.activeCount}명 재직 중`}
          emphasis
        />
        <KPICard
          eyebrow="평균 근속"
          value={formatTenure(data.avgTenureMonths)}
          label="전체 평균"
        />
        <KPICard
          eyebrow="휴직"
          value={data.onLeaveCount}
          label="명"
        />
        <KPICard
          eyebrow="퇴사/해고"
          value={data.resignedCount}
          label="명"
        />
      </KPIGrid>

      {/* Charts: Department Distribution + Tenure Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-sp-6">
        {/* 부서별 인원 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>부서별 인원 분포</CardTitle>
          </CardHeader>
          <CardBody>
            {deptChartData.length > 0 ? (
              <>
                <BarChart
                  data={deptChartData}
                  layout="vertical"
                  height={Math.max(200, deptChartData.length * 48)}
                  showTooltip
                />
                {/* 부서 상세 테이블 */}
                <div className="mt-sp-4 border-t border-border pt-sp-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-tertiary text-left">
                        <th className="pb-sp-2 font-medium">부서</th>
                        <th className="pb-sp-2 font-medium text-right">인원</th>
                        <th className="pb-sp-2 font-medium text-right">비율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.departmentDistribution.map((dept) => (
                        <tr
                          key={dept.id}
                          className="border-t border-border/50"
                        >
                          <td className="py-sp-2 text-text-primary">
                            {dept.name}
                          </td>
                          <td className="py-sp-2 text-text-primary text-right">
                            {dept.count}명
                          </td>
                          <td className="py-sp-2 text-text-secondary text-right">
                            {dept.percentage}%
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
                  부서 데이터가 없습니다
                </span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* 근속 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>근속 연수 분포</CardTitle>
          </CardHeader>
          <CardBody>
            {tenureChartData.length > 0 ? (
              <>
                <BarChart
                  data={tenureChartData}
                  layout="horizontal"
                  height={250}
                  showTooltip
                  barColor="#048a88"
                />
                {/* 근속 상세 테이블 */}
                <div className="mt-sp-4 border-t border-border pt-sp-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-tertiary text-left">
                        <th className="pb-sp-2 font-medium">근속 구간</th>
                        <th className="pb-sp-2 font-medium text-right">인원</th>
                        <th className="pb-sp-2 font-medium text-right">비율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tenureDistribution.map((group) => (
                        <tr
                          key={group.label}
                          className="border-t border-border/50"
                        >
                          <td className="py-sp-2 text-text-primary">
                            {group.label}
                          </td>
                          <td className="py-sp-2 text-text-primary text-right">
                            {group.count}명
                          </td>
                          <td className="py-sp-2 text-text-secondary text-right">
                            {group.percentage}%
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
                  근속 데이터가 없습니다
                </span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
