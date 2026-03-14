import Link from "next/link";

// ─── Module definitions per permission layer ────────────────

interface ModuleLink {
  name: string;
  description: string;
  href: string;
  icon: string;
}

interface PermissionLayer {
  id: string;
  title: string;
  description: string;
  badgeColor: string;
  bgGradient: string;
  modules: ModuleLink[];
}

const PERMISSION_LAYERS: PermissionLayer[] = [
  {
    id: "admin",
    title: "HR 관리자",
    description:
      "인사, 근태, 휴가, 결재, 급여, 성과 등 HR 업무 전반을 관리합니다.",
    badgeColor: "bg-brand text-white",
    bgGradient: "from-brand-soft to-white",
    modules: [
      {
        name: "대시보드",
        description: "HR 현황 요약 및 KPI",
        href: "/admin",
        icon: "grid",
      },
      {
        name: "인사 관리",
        description: "직원 디렉토리 및 검색",
        href: "/admin/people",
        icon: "users",
      },
      {
        name: "조직도",
        description: "부서별 트리 구조",
        href: "/admin/org-chart",
        icon: "sitemap",
      },
      {
        name: "인사 변동",
        description: "입사, 이동, 퇴사 이력",
        href: "/admin/people/changes",
        icon: "timeline",
      },
      {
        name: "근태 관리",
        description: "출결 현황 및 교대 관리",
        href: "/admin/attendance",
        icon: "clock",
      },
      {
        name: "휴가 관리",
        description: "휴가 정책, 캘린더, 승인",
        href: "/admin/leave",
        icon: "calendar",
      },
      {
        name: "결재 관리",
        description: "승인 요청 및 워크플로우",
        href: "/admin/workflow",
        icon: "check-circle",
      },
      {
        name: "문서 관리",
        description: "템플릿, 발송, 보관함",
        href: "/admin/documents",
        icon: "file-text",
      },
      {
        name: "급여 관리",
        description: "급여 규칙, 마감, 명세서",
        href: "/admin/payroll",
        icon: "dollar",
      },
      {
        name: "성과 관리",
        description: "목표, 평가, 1:1",
        href: "/admin/performance",
        icon: "target",
      },
      {
        name: "채용 관리",
        description: "공고, 파이프라인, 온보딩",
        href: "/admin/recruiting",
        icon: "briefcase",
      },
      {
        name: "리포트",
        description: "인사이트 및 예약 리포트",
        href: "/admin/reports",
        icon: "bar-chart",
      },
      {
        name: "설정",
        description: "회사, 역할, 권한, 감사",
        href: "/admin/settings",
        icon: "settings",
      },
    ],
  },
  {
    id: "employee",
    title: "직원 포탈",
    description:
      "출퇴근 기록, 휴가 신청, 알림 확인, 개인 프로필 관리를 제공합니다.",
    badgeColor: "bg-status-info-solid text-white",
    bgGradient: "from-status-info-bg to-white",
    modules: [
      {
        name: "근무 스케줄",
        description: "출퇴근 체크 및 주간 일정",
        href: "/employee/schedule",
        icon: "clock",
      },
      {
        name: "신청",
        description: "휴가, 근태 정정 신청",
        href: "/employee/requests",
        icon: "send",
      },
      {
        name: "프로필",
        description: "기본정보 및 휴가 잔여",
        href: "/employee/profile",
        icon: "user",
      },
    ],
  },
  {
    id: "platform",
    title: "플랫폼 운영",
    description:
      "테넌트 관리, 빌링, 서포트 등 SaaS 플랫폼 운영 전반을 담당합니다.",
    badgeColor: "bg-surface-inverse text-white",
    bgGradient: "from-surface-secondary to-white",
    modules: [
      {
        name: "운영 대시보드",
        description: "전체 시스템 현황 및 KPI",
        href: "/platform",
        icon: "monitor",
      },
      {
        name: "테넌트 관리",
        description: "고객사 목록 및 상세",
        href: "/platform/tenants",
        icon: "building",
      },
    ],
  },
];

// ─── Icon component ─────────────────────────────────────────

const ICON_PATHS: Record<string, string> = {
  grid: "M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zm-11 0h7v7H3v-7z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m16-4a4 4 0 0 0 0-8m2 12v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  sitemap:
    "M12 2v6m0 0H6m6 0h6M6 8v4a2 2 0 0 0 2 2h1m3-6v4a2 2 0 0 1-2 2h-1m5-6v4a2 2 0 0 0 2 2M4 18h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z",
  timeline:
    "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  clock:
    "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  calendar:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z",
  "check-circle":
    "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  "file-text":
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-2 0v6h6M16 13H8m8 4H8m2-8H8",
  dollar:
    "M12 1v22m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7",
  target:
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  briefcase:
    "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  "bar-chart": "M12 20V10m6 10V4M6 20v-4",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm9.4-2.5a1.6 1.6 0 0 0 .3-1.8l-1.2-2a1.6 1.6 0 0 0-1.7-.7l-.5.1a8 8 0 0 0-1.2-.7V6.8a1.6 1.6 0 0 0-1.2-1.5l-2.2-.4a1.6 1.6 0 0 0-1.6.7l-.3.5a8 8 0 0 0-1.4 0l-.3-.5a1.6 1.6 0 0 0-1.6-.7l-2.2.4A1.6 1.6 0 0 0 5 6.8v.6a8 8 0 0 0-1.2.7l-.5-.1a1.6 1.6 0 0 0-1.7.7l-1.2 2a1.6 1.6 0 0 0 .3 1.8l.4.4a8 8 0 0 0 0 1.4l-.4.4a1.6 1.6 0 0 0-.3 1.8l1.2 2a1.6 1.6 0 0 0 1.7.7l.5-.1a8 8 0 0 0 1.2.7v.6a1.6 1.6 0 0 0 1.2 1.5l2.2.4a1.6 1.6 0 0 0 1.6-.7l.3-.5a8 8 0 0 0 1.4 0l.3.5a1.6 1.6 0 0 0 1.6.7l2.2-.4a1.6 1.6 0 0 0 1.2-1.5v-.6a8 8 0 0 0 1.2-.7l.5.1a1.6 1.6 0 0 0 1.7-.7l1.2-2a1.6 1.6 0 0 0-.3-1.8l-.4-.4a8 8 0 0 0 0-1.4l.4-.4z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  monitor:
    "M8 21h8m-4-4v4M2 4h20v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm0 0a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2",
  building:
    "M3 21h18M3 7v14M21 7v14M6 11h2m4 0h2m4 0h-2M6 15h2m4 0h2m4 0h-2M6 7h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2z",
};

function ModuleIcon({ name }: { name: string }) {
  const path = ICON_PATHS[name] ?? ICON_PATHS["grid"];
  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

// ─── Page component ─────────────────────────────────────────

export default function IndexNavigationHub() {
  return (
    <div className="min-h-screen bg-surface-canvas">
      {/* Header */}
      <header className="border-b border-border bg-surface-primary">
        <div className="mx-auto flex max-w-content items-center justify-between px-sp-6 py-sp-4">
          <div className="flex items-center gap-sp-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <span className="text-lg font-bold">F</span>
            </div>
            <h1 className="text-xl font-bold text-text-primary">FlowHR</h1>
          </div>
          <Link
            href="/login"
            className="rounded-md bg-brand px-sp-4 py-sp-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            로그인
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-surface-primary px-sp-6 py-sp-10">
        <div className="mx-auto max-w-content text-center">
          <h2 className="text-4xl font-bold text-text-primary">
            네비게이션 허브
          </h2>
          <p className="mt-sp-3 text-lg text-text-secondary">
            역할별 모듈에 빠르게 접근하세요. 로그인 후 권한에 맞는 화면으로
            이동합니다.
          </p>
        </div>
      </section>

      {/* Permission layers */}
      <main className="mx-auto max-w-content px-sp-6 py-sp-8">
        <div className="flex flex-col gap-sp-8">
          {PERMISSION_LAYERS.map((layer) => (
            <section key={layer.id}>
              {/* Layer header */}
              <div className="mb-sp-4 flex items-center gap-sp-3">
                <span
                  className={`inline-flex rounded-full px-sp-3 py-sp-1 text-xs font-semibold ${layer.badgeColor}`}
                >
                  {layer.title}
                </span>
                <span className="text-sm text-text-secondary">
                  {layer.description}
                </span>
              </div>

              {/* Module grid */}
              <div className="grid grid-cols-1 gap-sp-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {layer.modules.map((mod) => (
                  <Link
                    key={mod.href}
                    href={mod.href}
                    className="group flex items-start gap-sp-3 rounded-lg border border-border bg-surface-primary p-sp-4 shadow-xs transition-all hover:border-brand hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-text-secondary transition-colors group-hover:bg-brand-soft group-hover:text-brand">
                      <ModuleIcon name={mod.icon} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary group-hover:text-brand">
                        {mod.name}
                      </p>
                      <p className="mt-sp-1 text-xs text-text-tertiary">
                        {mod.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-primary px-sp-6 py-sp-6">
        <div className="mx-auto max-w-content text-center text-xs text-text-tertiary">
          FlowHR &copy; {new Date().getFullYear()}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
