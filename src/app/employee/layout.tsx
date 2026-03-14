"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavSection } from "@/components/layout/Sidebar";

const EMPLOYEE_NAV: NavSection[] = [
  {
    items: [
      { id: "home", label: "홈", href: "/employee" },
      { id: "schedule", label: "일정", href: "/employee/schedule" },
      { id: "requests", label: "요청", href: "/employee/requests" },
      { id: "inbox", label: "인박스", href: "/employee/inbox" },
      { id: "documents", label: "문서", href: "/employee/documents" },
      { id: "profile", label: "내 정보", href: "/employee/profile" },
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
      <main className="flex-1 overflow-y-auto p-sp-8">{children}</main>
    </div>
  );
}
