"use client";

import React from "react";
import { AppUser, HistorySession } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNewChat: () => void;
  sessions: HistorySession[];
  onSelectHistory: (sessionId: string) => void;
}

/**
 * Sidebar Component
 * - User profile with Google avatar
 * - New Chat button
 * - Recent Wishes history
 * - Guest CTA
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  user,
  onOpenAuth,
  onLogout,
  onNewChat,
  sessions,
  onSelectHistory,
}) => {
  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <img src="/assets/genie.svg" alt="Genie" className="sidebar-genie-img" />
          <span>Gift Genie</span>
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

      {/* New Chat Button */}
      <div className="new-chat-section">
        <button
          className="new-chat-btn"
          onClick={() => { onNewChat(); onClose(); }}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>
      </div>

      {/* User Profile / Guest CTA */}
      <div className="auth-section">
        {user ? (
          <div className="user-info">
            <div className="user-avatar">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="user-avatar-img" />
              ) : (
                (user.displayName || user.email || "U").charAt(0).toUpperCase()
              )}
            </div>
            <div className="user-details">
              <div className="user-name">{user.displayName || "Genie User"}</div>
              <div className="user-email">{user.email}</div>
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
            <p>Sign in to save your wishes across devices.</p>
            <button className="auth-action-btn" onClick={onOpenAuth} type="button">
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "6px" }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        )}
      </div>

      {/* Recent Wishes History */}
      <div className="history-section">
        <h3>Recent Wishes</h3>
        <div className="history-list">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <button
                key={session.sessionId}
                className="history-item"
                onClick={() => {
                  onSelectHistory(session.sessionId);
                  onClose();
                }}
                type="button"
              >
                <div className="history-item-prompt">{session.title}</div>
                <div className="history-item-time">{formatDate(session.lastTimestamp)}</div>
              </button>
            ))
          ) : (
            <p className="empty-history-text">
              {user
                ? "No previous wishes found. Start a new chat!"
                : "Sign in to see your saved wishes."}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};
