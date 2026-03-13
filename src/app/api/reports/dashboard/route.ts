import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

interface ReportCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  lastGenerated: string;
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports: ReportCard[] = [
    {
      id: "people",
      icon: "\uD83D\uDC65",
      title: "\uC778\uC6D0 \uD604\uD669 \uB9AC\uD3EC\uD2B8",
      description: "\uBD80\uC11C\uBCC4/\uC9C1\uAE09\uBCC4 \uC778\uC6D0 \uAD6C\uC131 \uBD84\uC11D",
      href: "/admin/reports/people",
      lastGenerated: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "attendance",
      icon: "\u23F0",
      title: "\uADFC\uD0DC \uB9AC\uD3EC\uD2B8",
      description: "\uCD9C\uD1F4\uADFC, \uCD08\uACFC\uADFC\uBB34, \uC608\uC678 \uD604\uD669 \uBD84\uC11D",
      href: "/admin/reports/attendance",
      lastGenerated: "2026-03-10T00:00:00.000Z",
    },
    {
      id: "leave",
      icon: "\uD83C\uDF34",
      title: "\uD734\uAC00 \uC0AC\uC6A9 \uB9AC\uD3EC\uD2B8",
      description: "\uC720\uD615\uBCC4 \uD734\uAC00 \uC0AC\uC6A9\uB960 \uBC0F \uC794\uC5EC \uD604\uD669",
      href: "/admin/reports/leave",
      lastGenerated: "2026-03-05T00:00:00.000Z",
    },
    {
      id: "turnover",
      icon: "\uD83D\uDD04",
      title: "\uC774\uC9C1\uB960 \uB9AC\uD3EC\uD2B8",
      description: "\uBD84\uAE30\uBCC4 \uC774\uC9C1\uB960 \uBC0F \uD1F4\uC0AC \uC0AC\uC720 \uBD84\uC11D",
      href: "/admin/reports/turnover",
      lastGenerated: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "payroll",
      icon: "\uD83D\uDCB0",
      title: "\uAE09\uC5EC \uC694\uC57D \uB9AC\uD3EC\uD2B8",
      description: "\uC6D4\uBCC4 \uAE09\uC5EC \uCD1D\uC561, \uC218\uB2F9, \uACF5\uC81C \uC694\uC57D",
      href: "/admin/reports/payroll",
      lastGenerated: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "recruiting",
      icon: "\uD83D\uDCCB",
      title: "\uCC44\uC6A9 \uD604\uD669 \uB9AC\uD3EC\uD2B8",
      description: "\uCC44\uC6A9 \uD30C\uC774\uD504\uB77C\uC778 \uBC0F \uCC44\uC6A9 \uD6A8\uC728 \uBD84\uC11D",
      href: "/admin/reports/recruiting",
      lastGenerated: "2026-03-08T00:00:00.000Z",
    },
    {
      id: "performance",
      icon: "\uD83C\uDFAF",
      title: "\uC131\uACFC \uB9AC\uD3EC\uD2B8",
      description: "\uBAA9\uD45C \uB2EC\uC131\uB960, \uD3C9\uAC00 \uC9C4\uD589 \uD604\uD669 \uBD84\uC11D",
      href: "/admin/reports/performance",
      lastGenerated: "2026-03-12T00:00:00.000Z",
    },
  ];

  return NextResponse.json({ reports });
}
