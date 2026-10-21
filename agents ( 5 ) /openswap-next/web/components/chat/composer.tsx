import { useEffect, useRef, type FormEvent } from "react";

interface ComposerProps {
  input: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  canSubmit: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}

// The text box and the submit button.
export function Composer({ input, label, placeholder, submitLabel, canSubmit, onInputChange, onSubmit }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // After a send clears the text, shrink the box back to one line.
  useEffect(() => {
    if (!input && textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Keep the form on the page so React can handle the request.
    event.preventDefault();
    onSubmit();
  }

  return (
    <section className="input-panel">
      <form className="input-form" onSubmit={handleSubmit}>
        <div className="input-area">
          <label className="prompt-label" htmlFor="user-input">
            {label}
          </label>
          <textarea
            ref={textareaRef}
            id="user-input"
            placeholder={placeholder}
            value={input}
            onChange={(event) => {
              onInputChange(event.target.value);
              // Reset first so the textarea can shrink as well as grow.
              event.target.style.height = "auto";
              event.target.style.height = `${event.target.scrollHeight}px`;
            }}
          />
        </div>

        <div className="form-footer">
          <button type="submit" className="submit-button" disabled={!canSubmit}>
            <span>{submitLabel}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
