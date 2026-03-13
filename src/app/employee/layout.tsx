"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavSection } from "@/components/layout/Sidebar";

const EMPLOYEE_NAV: NavSection[] = [
  {
    label: "메인",
    items: [{ id: "home", label: "홈", href: "/employee" }],
  },
  {
    label: "근무",
    items: [
      { id: "schedule", label: "출퇴근·스케줄", href: "/employee/schedule" },
      { id: "history", label: "출결 이력", href: "/employee/history" },
    ],
  },
  {
    label: "신청",
    items: [
      { id: "requests", label: "신청하기", href: "/employee/requests" },
    ],
  },
  {
    label: "알림·문서",
    items: [
      { id: "inbox", label: "수신함", href: "/employee/inbox" },
      { id: "documents", label: "문서", href: "/employee/documents" },
    ],
  },
  {
    label: "내 정보",
    items: [
      { id: "profile", label: "프로필", href: "/employee/profile" },
    ],
  },
];

function getActiveId(pathname: string): string {
  if (pathname === "/employee") return "home";
  const segment = pathname.split("/")[2];
  return segment ?? "home";
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeId = getActiveId(pathname);

  function handleNavigate(id: string) {
    const item = EMPLOYEE_NAV.flatMap((s) => s.items).find((i) => i.id === id);
    if (item?.href) router.push(item.href);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-canvas">
      <Sidebar
        variant="employee"
        sections={EMPLOYEE_NAV}
        activeId={activeId}
        onNavigate={handleNavigate}
      />
      <main className="flex-1 overflow-y-auto p-sp-6 md:p-sp-8">{children}</main>
    </div>
  );
}
