"use client";

import React, { useState } from "react";
import { signInWithGoogle } from "@/lib/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Authentication Modal — Google Sign-In Only
 * Clean, single-action modal with glassmorphism design.
 */
export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        onClose();
      } else {
        setErrorMsg(result.error || "Google Sign-In failed.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Google Sign-In failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div
        className="modal-content glassmorphism"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          type="button"
          aria-label="Close modal"
        >
          &times;
        </button>

        {/* Header */}
        <div className="auth-modal-header">
          <img src="/assets/genie.svg" alt="Gift Genie" className="auth-genie-icon" />
          <h2 className="auth-title">Welcome to Gift Genie</h2>
          <p className="auth-subtitle">
            Sign in to save your wishes and sync across devices.
          </p>
        </div>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        {/* Google Sign-In Button */}
        <button
          type="button"
          className="google-btn"
          onClick={handleGoogleAuth}
          disabled={isSubmitting}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isSubmitting ? "Connecting..." : "Continue with Google"}
        </button>

        <p className="auth-footer-text">
          Your data is secured with Supabase and Google OAuth 2.0
        </p>
      </div>
    </div>
  );
};
