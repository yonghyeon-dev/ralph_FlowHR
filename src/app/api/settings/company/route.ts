import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

interface CompanySettings {
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

const DEFAULT_SETTINGS: CompanySettings = {
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

// ─── GET: 회사 설정 조회 ────────────────────────────────
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, settings: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const stored =
    typeof tenant.settings === "object" && tenant.settings !== null
      ? (tenant.settings as Record<string, unknown>)
      : {};

  const company: CompanySettings = {
    ...DEFAULT_SETTINGS,
    companyName: (stored.companyName as string) || tenant.name || "",
    businessNumber: (stored.businessNumber as string) || "",
    industry: (stored.industry as string) || "",
    representative: (stored.representative as string) || "",
    fiscalYearStart: (stored.fiscalYearStart as string) || "1",
    timezone: (stored.timezone as string) || "Asia/Seoul",
    workStartTime: (stored.workStartTime as string) || "09:00",
    workEndTime: (stored.workEndTime as string) || "18:00",
    logoUrl: (stored.logoUrl as string) || "",
  };

  return NextResponse.json({ company });
}

// ─── PATCH: 회사 설정 수정 ──────────────────────────────
export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const body = await request.json();

  const {
    companyName,
    businessNumber,
    industry,
    representative,
    fiscalYearStart,
    timezone,
    workStartTime,
    workEndTime,
    logoUrl,
  } = body as Partial<CompanySettings>;

  if (!companyName || !companyName.trim()) {
    return NextResponse.json(
      { error: "회사명은 필수입니다" },
      { status: 400 },
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const existing =
    typeof tenant.settings === "object" && tenant.settings !== null
      ? (tenant.settings as Record<string, unknown>)
      : {};

  const updatedSettings = {
    ...existing,
    companyName: companyName.trim(),
    businessNumber: businessNumber?.trim() ?? "",
    industry: industry ?? "",
    representative: representative?.trim() ?? "",
    fiscalYearStart: fiscalYearStart ?? "1",
    timezone: timezone ?? "Asia/Seoul",
    workStartTime: workStartTime ?? "09:00",
    workEndTime: workEndTime ?? "18:00",
    logoUrl: logoUrl ?? "",
  };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: companyName.trim(),
      settings: updatedSettings,
    },
  });

  return NextResponse.json({ success: true, company: updatedSettings });
}
