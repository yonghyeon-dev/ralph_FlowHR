"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavSection } from "@/components/layout/Sidebar";

const PLATFORM_NAV: NavSection[] = [
  {
    label: "메인",
    items: [{ id: "home", label: "대시보드", href: "/platform" }],
  },
  {
    label: "운영",
    items: [
      { id: "tenants", label: "테넌트 관리", href: "/platform/tenants" },
      { id: "billing", label: "플랜 & 빌링", href: "/platform/billing" },
    ],
  },
  {
    label: "지원",
    items: [
      { id: "support", label: "서포트", href: "/platform/support" },
      { id: "monitoring", label: "모니터링", href: "/platform/monitoring" },
    ],
  },
  {
    label: "시스템",
    items: [
      { id: "audit", label: "감사 & 보안", href: "/platform/audit" },
      { id: "settings", label: "플랫폼 설정", href: "/platform/settings" },
    ],
  },
];

function getActiveId(pathname: string): string {
  if (pathname === "/platform") return "home";
  const segment = pathname.split("/")[2];
  return segment ?? "home";
}

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeId = getActiveId(pathname);

  function handleNavigate(id: string) {
    const item = PLATFORM_NAV.flatMap((s) => s.items).find((i) => i.id === id);
    if (item?.href) router.push(item.href);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-canvas">
      <Sidebar
        variant="platform"
        sections={PLATFORM_NAV}
        activeId={activeId}
        onNavigate={handleNavigate}
      />
      <main className="flex-1 overflow-y-auto p-sp-8">{children}</main>
    </div>
  );
}
