"use client";

import React from "react";

interface HeaderProps {
  onToggleSidebar: () => void;
  user: { displayName: string; avatarUrl?: string } | null;
  onOpenAuth: () => void;
}

/**
 * App Header Component
 * Displays branding, mobile menu toggle, and user avatar / sign-in CTA.
 */
export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, user, onOpenAuth }) => {
  const userInitial = (user?.displayName || "U").charAt(0).toUpperCase();

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
        {user ? (
          <button
            className="header-avatar"
            title={user.displayName}
            type="button"
            onClick={onToggleSidebar}
            aria-label={`${user.displayName} — open menu`}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} className="header-avatar-img" />
            ) : (
              <span>{userInitial}</span>
            )}
          </button>
        ) : (
          <button className="header-signin-btn" onClick={onOpenAuth} type="button">
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
