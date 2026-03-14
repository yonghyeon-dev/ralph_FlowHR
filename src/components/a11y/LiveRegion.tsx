"use client";

import { useState, useCallback, createContext, useContext, type ReactNode } from "react";

interface LiveRegionContextType {
  // eslint-disable-next-line no-unused-vars
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const LiveRegionContext = createContext<LiveRegionContextType>({
  announce: (_message: string, _priority?: "polite" | "assertive") => {},
});

/**
 * 스크린 리더 알림을 위한 Provider
 * aria-live 영역을 통해 동적 콘텐츠 변경을 스크린 리더에 알림
 */
function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (priority === "assertive") {
        setAssertiveMessage("");
        requestAnimationFrame(() => setAssertiveMessage(message));
      } else {
        setPoliteMessage("");
        requestAnimationFrame(() => setPoliteMessage(message));
      }
    },
    []
  );

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
}

function useAnnounce() {
  return useContext(LiveRegionContext);
}

export { LiveRegionProvider, useAnnounce };
