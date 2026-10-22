"use client";

import { useState, type FormEvent } from "react";
import { MAX_PREFERENCES_LENGTH } from "@/lib/types";
import { readErrorMessage, savePreferences } from "../chat/api-client";

type SaveStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

// The text box where the user writes what they want from recommendations, and the Save button.
export function SettingsForm({ initialPreferences }: { initialPreferences: string }) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Keep the form on the page so React can handle the request.
    event.preventDefault();
    setStatus({ kind: "saving" });

    try {
      await savePreferences(preferences);
      setStatus({ kind: "saved" });
    } catch (error: unknown) {
      setStatus({ kind: "error", message: readErrorMessage(error) });
    }
  }

  return (
    <form className="input-form" onSubmit={handleSubmit}>
      <div className="input-area">
        <label className="prompt-label" htmlFor="preferences">
          Your preferences
        </label>
        <p className="field-hint">The agent uses these when it ranks and filters alternatives for you.</p>
        <textarea
          id="preferences"
          value={preferences}
          maxLength={MAX_PREFERENCES_LENGTH}
          placeholder="E.g. I prefer self-hosted tools with an MIT or Apache license, written in TypeScript."
          onChange={(event) => {
            setPreferences(event.target.value);
            // Editing after a save means the shown "Saved" no longer matches the box.
            setStatus({ kind: "idle" });
          }}
        />
        <p className="field-hint counter">
          {preferences.length} / {MAX_PREFERENCES_LENGTH}
        </p>
      </div>

      <div className="form-footer">
        <p className={`save-status${status.kind === "error" ? " is-error" : ""}`} role="status">
          {status.kind === "saved" && "Saved. Your next message will use these."}
          {status.kind === "error" && status.message}
        </p>
        <button type="submit" className="submit-button" disabled={status.kind === "saving"}>
          <span>{status.kind === "saving" ? "Saving..." : "Save"}</span>
        </button>
      </div>
    </form>
  );
}
