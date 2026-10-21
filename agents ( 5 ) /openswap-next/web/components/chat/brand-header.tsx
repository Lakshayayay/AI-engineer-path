import type { Ref } from "react";

interface BrandHeaderProps {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  toggleRef: Ref<HTMLButtonElement>;
}

// The logo, plus the button that opens the chat list on small screens.
export function BrandHeader({ sidebarOpen, onOpenSidebar, toggleRef }: BrandHeaderProps) {
  return (
    <header className="brand">
      <svg className="brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 8h10.5l-3-3M18 16H7.5l3 3"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="brand-name">
        Open<span>Swap</span>
      </span>
      <button
        ref={toggleRef}
        className="icon-button history-toggle"
        type="button"
        aria-label="Open previous chats"
        aria-controls="sidebar"
        aria-expanded={sidebarOpen}
        onClick={onOpenSidebar}
      >
        ☰
      </button>
    </header>
  );
}
