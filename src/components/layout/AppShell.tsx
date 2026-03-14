"use client";

import { useState, type ReactNode } from "react";

interface AppShellProps {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
}

function AppShell({ header, sidebar, children, className = "" }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className={[
        "grid min-h-screen grid-rows-[theme(height.header)_1fr]",
        "grid-cols-1 md:grid-cols-[theme(width.sidebar)_1fr]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header */}
      {header}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/45 md:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSidebarOpen(false);
          }}
          role="button"
          tabIndex={-1}
          aria-label="사이드바 닫기"
        />
      )}

      {/* Sidebar */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 w-sidebar transition-transform duration-normal ease-out-custom",
          "top-header md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {sidebar}
      </div>

      {/* Main content */}
      <main id="main-content" className="overflow-y-auto bg-surface-canvas p-sp-6">
        {children}
      </main>

      {/* Mobile menu toggle */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-sp-6 left-sp-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-lg md:hidden"
        aria-label={sidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {sidebarOpen ? (
            <>
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </>
          ) : (
            <>
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="15" x2="17" y2="15" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

export { AppShell };
export type { AppShellProps };
