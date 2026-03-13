import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ─── Types ──────────────────────────────────────────────────

interface ScheduledReport {
  id: string;
  name: string;
  schedule: string;
  format: string;
  recipients: string;
  lastSent: string;
  active: boolean;
}

// ─── In-memory store (demo) ─────────────────────────────────

const scheduledReports: ScheduledReport[] = [
  {
    id: "sr-1",
    name: "주간 근태 리포트",
    schedule: "매주 월요일 09:00",
    format: "Excel",
    recipients: "인사팀 전체",
    lastSent: "2026-03-09T00:00:00.000Z",
    active: true,
  },
  {
    id: "sr-2",
    name: "월간 인원 현황",
    schedule: "매월 1일 09:00",
    format: "PDF",
    recipients: "경영진",
    lastSent: "2026-03-01T00:00:00.000Z",
    active: true,
  },
  {
    id: "sr-3",
    name: "급여 요약 보고서",
    schedule: "매월 25일 18:00",
    format: "Excel",
    recipients: "CFO, 인사팀장",
    lastSent: "2026-02-25T00:00:00.000Z",
    active: true,
  },
  {
    id: "sr-4",
    name: "분기 이직률 분석",
    schedule: "분기 말 +5일",
    format: "PDF + Excel",
    recipients: "경영진, 부서장",
    lastSent: "2026-01-05T00:00:00.000Z",
    active: true,
  },
  {
    id: "sr-5",
    name: "채용 파이프라인 리포트",
    schedule: "격주 금요일 17:00",
    format: "PDF",
    recipients: "채용팀, 부서장",
    lastSent: "2026-03-07T00:00:00.000Z",
    active: false,
  },
];

let nextId = 6;

// ─── GET: list ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ schedules: scheduledReports });
}

// ─── POST: create ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, schedule, format, recipients } = body as {
    name: string;
    schedule: string;
    format: string;
    recipients: string;
  };

  if (!name || !schedule || !format || !recipients) {
    return NextResponse.json(
      { error: "필수 항목을 입력해주세요" },
      { status: 400 },
    );
  }

  const newReport: ScheduledReport = {
    id: `sr-${nextId++}`,
    name,
    schedule,
    format,
    recipients,
    lastSent: new Date().toISOString(),
    active: true,
  };

  scheduledReports.push(newReport);

  return NextResponse.json({ schedule: newReport }, { status: 201 });
}

// ─── PUT: update ────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, schedule, format, recipients, active } = body as {
    id: string;
    name?: string;
    schedule?: string;
    format?: string;
    recipients?: string;
    active?: boolean;
  };

  const idx = scheduledReports.findIndex((r) => r.id === id);
  if (idx === -1) {
    return NextResponse.json(
      { error: "스케줄을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  if (name !== undefined) scheduledReports[idx].name = name;
  if (schedule !== undefined) scheduledReports[idx].schedule = schedule;
  if (format !== undefined) scheduledReports[idx].format = format;
  if (recipients !== undefined) scheduledReports[idx].recipients = recipients;
  if (active !== undefined) scheduledReports[idx].active = active;

  return NextResponse.json({ schedule: scheduledReports[idx] });
}

// ─── DELETE ─────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID가 필요합니다" }, { status: 400 });
  }

  const idx = scheduledReports.findIndex((r) => r.id === id);
  if (idx === -1) {
    return NextResponse.json(
      { error: "스케줄을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  scheduledReports.splice(idx, 1);

  return NextResponse.json({ success: true });
}
