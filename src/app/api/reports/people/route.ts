import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

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

function getTenureBucket(hireDate: Date, now: Date): string {
  const months =
    (now.getFullYear() - hireDate.getFullYear()) * 12 +
    (now.getMonth() - hireDate.getMonth());
  if (months < 12) return "1년 미만";
  if (months < 36) return "1~3년";
  if (months < 60) return "3~5년";
  if (months < 120) return "5~10년";
  return "10년 이상";
}

const TENURE_ORDER = ["1년 미만", "1~3년", "3~5년", "5~10년", "10년 이상"];

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const employees = await prisma.employee.findMany({
    where: { tenantId },
    include: { department: { select: { id: true, name: true } } },
  });

  const now = new Date();

  const activeCount = employees.filter((e) => e.status === "ACTIVE").length;
  const onLeaveCount = employees.filter((e) => e.status === "ON_LEAVE").length;
  const resignedCount = employees.filter(
    (e) => e.status === "RESIGNED" || e.status === "TERMINATED"
  ).length;

  // Department distribution (active employees only)
  const deptMap = new Map<string, { id: string; name: string; count: number }>();
  for (const emp of employees) {
    if (emp.status === "RESIGNED" || emp.status === "TERMINATED") continue;
    const deptId = emp.department?.id ?? "unassigned";
    const deptName = emp.department?.name ?? "미배치";
    const entry = deptMap.get(deptId) ?? { id: deptId, name: deptName, count: 0 };
    entry.count++;
    deptMap.set(deptId, entry);
  }

  const activeTotal = employees.filter(
    (e) => e.status !== "RESIGNED" && e.status !== "TERMINATED"
  ).length;

  const departmentDistribution: DepartmentDist[] = Array.from(deptMap.values())
    .sort((a, b) => b.count - a.count)
    .map((d) => ({
      ...d,
      percentage: activeTotal > 0 ? Math.round((d.count / activeTotal) * 100) : 0,
    }));

  // Tenure distribution (active employees only)
  const tenureCounts = new Map<string, number>();
  let totalMonths = 0;
  let tenureCount = 0;

  for (const emp of employees) {
    if (emp.status === "RESIGNED" || emp.status === "TERMINATED") continue;
    const bucket = getTenureBucket(emp.hireDate, now);
    tenureCounts.set(bucket, (tenureCounts.get(bucket) ?? 0) + 1);

    const months =
      (now.getFullYear() - emp.hireDate.getFullYear()) * 12 +
      (now.getMonth() - emp.hireDate.getMonth());
    totalMonths += Math.max(0, months);
    tenureCount++;
  }

  const tenureDistribution: TenureGroup[] = TENURE_ORDER.map((label) => {
    const count = tenureCounts.get(label) ?? 0;
    return {
      label,
      count,
      percentage: activeTotal > 0 ? Math.round((count / activeTotal) * 100) : 0,
    };
  });

  const avgTenureMonths =
    tenureCount > 0 ? Math.round(totalMonths / tenureCount) : 0;

  const data: PeopleInsightsData = {
    totalHeadcount: employees.length,
    activeCount,
    onLeaveCount,
    resignedCount,
    avgTenureMonths,
    departmentDistribution,
    tenureDistribution,
  };

  return NextResponse.json(data);
}
