"use client";

import React from "react";
import { AppUser, HistoryItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
  isFirebase: boolean;
  onOpenAuth: () => void;
  onLogout: () => void;
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
}

/**
 * ==============================================================================
 * SIDEBAR COMPONENT
 * ==============================================================================
 * - Shows User Info (Avatar initials, name, email, mode badge, logout button).
 * - Shows Guest CTA ("Sign In / Register") when logged out.
 * - Displays Recent Wishes history list with click-to-load functionality.
 * - Slides in/out smoothly on mobile screens.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  user,
  isFirebase,
  onOpenAuth,
  onLogout,
  history,
  onSelectHistory,
}) => {
  const userInitials = (user?.displayName || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      {/* Sidebar Header & Mobile Close */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <img src="/assets/genie.svg" alt="Genie" className="sidebar-genie-img" />
          <span>Genie Panel</span>
        </div>
        <button
          className="mobile-close-btn"
          onClick={onClose}
          aria-label="Close Sidebar"
          type="button"
        >
          &times;
        </button>
      </div>

      {/* Authentication Profile / Guest CTA */}
      <div className="auth-section">
        {user ? (
          <div className="user-info">
            <div className="user-avatar">{userInitials}</div>
            <div className="user-details">
              <div className="user-name">{user.displayName || "Genie User"}</div>
              <div className="user-email">{user.email}</div>
              <span className={`mode-badge ${isFirebase ? "firebase" : ""}`}>
                {isFirebase ? "Firebase Mode" : "Local Mode"}
              </span>
            </div>
            <button
              className="icon-btn"
              onClick={onLogout}
              title="Sign Out"
              type="button"
              aria-label="Sign Out"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        ) : (
          <div className="guest-info">
            <p>Sign in to save your gift ideas and history.</p>
            <button className="auth-action-btn" onClick={onOpenAuth} type="button">
              Sign In / Register
            </button>
          </div>
        )}
      </div>

      {/* Recent Wishes History List */}
      <div className="history-section">
        <h3>Recent Wishes</h3>
        <div className="history-list">
          {history.length > 0 ? (
            history.map((item) => (
              <button
                key={item.id}
                className="history-item"
                onClick={() => {
                  onSelectHistory(item);
                  onClose();
                }}
                type="button"
              >
                <div className="history-item-prompt">{item.prompt}</div>
                <div className="history-item-time">{formatDate(item.timestamp)}</div>
              </button>
            ))
          ) : (
            <p className="empty-history-text">
              {user
                ? "No previous wishes found. Summon some gifts first!"
                : "Sign in to see your saved wishes!"}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};
