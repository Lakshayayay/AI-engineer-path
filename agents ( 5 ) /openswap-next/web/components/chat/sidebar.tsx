import type { Ref } from "react";
import type { ConversationSummary } from "@/lib/types";

interface SidebarProps {
  summaries: ConversationSummary[];
  activeConversationId: string | null;
  disabled: boolean;
  inert: boolean;
  closeButtonRef: Ref<HTMLButtonElement>;
  onOpenConversation: (id: string) => void;
  onNewConversation: () => void;
  onClose: () => void;
}

// The list of saved chats, plus the New chat button.
export function Sidebar({
  summaries,
  activeConversationId,
  disabled,
  inert,
  closeButtonRef,
  onOpenConversation,
  onNewConversation,
  onClose,
}: SidebarProps) {
  return (
    <>
      <aside id="sidebar" className="conversation-sidebar" aria-label="Previous chats" inert={inert}>
        <div className="sidebar-header">
          <h2>Your chats</h2>
          <div className="sidebar-actions">
            <button
              className="icon-button new-conversation"
              type="button"
              aria-label="New chat"
              title="New chat"
              disabled={disabled}
              onClick={onNewConversation}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 3l5 5M10 14l1-5 7-7 5 5-7 7-5 1Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              ref={closeButtonRef}
              className="icon-button close-sidebar"
              type="button"
              aria-label="Close previous chats"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m6 6 12 12M6 18 18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="conversation-list" aria-label="Previous chats list">
          {summaries.length === 0 && (
            <p className="conversation-empty">Your chats will appear here after you send your first message.</p>
          )}

          {summaries.map((summary) => {
            const isActive = summary.id === activeConversationId;

            return (
              <button
                key={summary.id}
                type="button"
                className={`conversation-link${isActive ? " active" : ""}`}
                // Long titles are cut off by CSS; the tooltip shows the full text.
                title={summary.title}
                aria-current={isActive ? "true" : undefined}
                disabled={disabled}
                onClick={() => onOpenConversation(summary.id)}
              >
                {summary.title}
              </button>
            );
          })}
        </nav>
      </aside>

      <button className="sidebar-backdrop" type="button" aria-label="Close previous chats" tabIndex={-1} onClick={onClose} />
    </>
  );
}
