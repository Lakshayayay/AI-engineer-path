"use client";

import React, { useState } from "react";
import { signIn, signUp, signInWithGoogle } from "@/lib/auth";
import { SignInSchema, SignUpSchema } from "@/lib/schema";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Authentication Modal Dialog Component
 * Handles user login, registration, and Google OAuth with glassmorphism design and tab switching.
 */
export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleTabSwitch = (newTab: "login" | "signup") => {
    setTab(newTab);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Client-side Zod validation
    if (tab === "login") {
      const validation = SignInSchema.safeParse({ email, password });
      if (!validation.success) {
        setErrorMsg(validation.error.issues[0]?.message || "Invalid input");
        return;
      }
    } else {
      const validation = SignUpSchema.safeParse({ email, password, displayName: name });
      if (!validation.success) {
        setErrorMsg(validation.error.issues[0]?.message || "Invalid input");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let result;
      if (tab === "login") {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password, name);
      }

      if (result.success) {
        onClose();
        // Reset form
        setName("");
        setEmail("");
        setPassword("");
      } else {
        setErrorMsg(result.error || "Authentication failed.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`tab-btn ${tab === "login" ? "active" : ""}`}
            onClick={() => handleTabSwitch("login")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === "signup" ? "active" : ""}`}
            onClick={() => handleTabSwitch("signup")}
          >
            Register
          </button>
        </div>

        {/* Form Inputs */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {tab === "signup" && (
            <div className="form-group">
              <label htmlFor="auth-name">Name</label>
              <input
                type="text"
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              type="email"
              id="auth-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              type="password"
              id="auth-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {errorMsg && <div className="auth-error">{errorMsg}</div>}

          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Processing..."
              : tab === "login"
              ? "Sign In"
              : "Register"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <button
          type="button"
          className="google-btn"
          onClick={handleGoogleAuth}
          disabled={isSubmitting}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
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
          Google Account
        </button>
      </div>
    </div>
  );
};
