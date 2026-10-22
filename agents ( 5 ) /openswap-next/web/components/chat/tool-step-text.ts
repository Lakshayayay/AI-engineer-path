import type { OpenSwapUIMessage } from "@/lib/types";

// One tool call inside an answer: its name, its state, and (once finished) its input and output.
export type ToolPart = Extract<OpenSwapUIMessage["parts"][number], { type: `tool-${string}` }>;

export function isToolPart(part: OpenSwapUIMessage["parts"][number]): part is ToolPart {
  return part.type.startsWith("tool-");
}

export interface ToolStepView {
  status: "running" | "done" | "error";
  text: string;
}

const RUNNING_TEXT: Record<ToolPart["type"], string> = {
  "tool-search_swaps": "Searching the catalog...",
  "tool-check_health": "Checking project health...",
  "tool-web_search": "Searching the web...",
  "tool-send_to_discord": "Sending to Discord...",
};

// The one line a step card shows. The tools' own messages are worded for the user as well as the model.
export function describeToolStep(part: ToolPart): ToolStepView {
  if (part.state === "output-error") return { status: "error", text: "This step failed." };
  if (part.state !== "output-available") return { status: "running", text: RUNNING_TEXT[part.type] };

  switch (part.type) {
    case "tool-search_swaps": {
      if (part.output.status === "error") return { status: "error", text: part.output.message };

      const count = part.output.result?.length ?? 0;
      return { status: "done", text: `Catalog: “${part.input.query}”, ${count === 0 ? "none" : count} found` };
    }

    case "tool-check_health": {
      if (part.output.status === "error") return { status: "error", text: part.output.message };
      if (part.output.status === "no_results") {
        return { status: "done", text: `No health data for “${part.input.project_name}”` };
      }

      return { status: "done", text: part.output.message + (part.output.result?.archived ? " (archived)" : "") };
    }

    case "tool-web_search":
      return { status: "done", text: "Searched the web" };

    case "tool-send_to_discord":
      return part.output.status === "ok"
        ? { status: "done", text: "Sent to Discord" }
        : { status: "error", text: part.output.message };
  }
}
