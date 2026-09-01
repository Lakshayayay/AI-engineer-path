"use client";

import React from "react";

interface HeaderProps {
  onToggleSidebar: () => void;
  isFirebase: boolean;
}

/**
 * App Header Component
 * Displays branding, mobile navigation toggle, and current environment status badge.
 */
export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isFirebase }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
          type="button"
        >
          <svg viewBox="0 0 100 80" width="24" height="24" fill="currentColor">
            <rect width="100" height="15" rx="5"></rect>
            <rect y="30" width="100" height="15" rx="5"></rect>
            <rect y="60" width="100" height="15" rx="5"></rect>
          </svg>
        </button>
        <div className="title-group">
          <img src="/assets/genie.svg" alt="Genie" className="genie-icon-img" />
          <h1>Gift Genie</h1>
        </div>
      </div>
      <div className="header-right">
        <span className="active-mode-indicator">
          {isFirebase ? "Firebase Mode" : "Local Mode"}
        </span>
      </div>
    </header>
  );
};
