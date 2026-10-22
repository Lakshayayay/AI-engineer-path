import { describeToolStep, type ToolPart } from "./tool-step-text";

const STEP_ICONS = { running: null, done: "✓", error: "!" } as const;

// One card for one tool call, so the user can see what the agent did before it answered.
export function ToolStep({ part }: { part: ToolPart }) {
  const { status, text } = describeToolStep(part);

  return (
    <div className={`tool-step is-${status}`}>
      <span className="tool-step-icon" aria-hidden="true">
        {STEP_ICONS[status] ?? <span className="tool-step-spinner" />}
      </span>
      <span>{text}</span>
    </div>
  );
}
