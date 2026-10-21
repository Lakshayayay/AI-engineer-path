const SELECTED_SWAPS_HEADER = "Starter swaps selected:\n";
const REQUEST_SEPARATOR = "\n\nUser request:\n";

// Build a prompt that includes the user's text and any selected starter swaps.
export function buildPrompt(typedText: string, selectedSwapNames: string[]): string {
  const promptSections: string[] = [];

  // Include the starter swaps if any are selected.
  if (selectedSwapNames.length > 0) {
    const selectedSwapsString = selectedSwapNames.map((swapName) => `- ${swapName}`).join("\n");
    promptSections.push(`${SELECTED_SWAPS_HEADER}${selectedSwapsString}`);
  }

  // Include the user's text if they typed anything.
  if (typedText.trim()) {
    promptSections.push(`User request:\n${typedText.trim()}`);
  }

  // Omit empty inputs, then separate the remaining labeled sections.
  return promptSections.join("\n\n");
}

// buildPrompt labels each section for the model. Turn those labels back into a short line for the transcript.
export function formatPromptForDisplay(prompt: string): string {
  const [selectionBlock, typedBlock] = prompt.split(REQUEST_SEPARATOR);

  if (!selectionBlock.startsWith(SELECTED_SWAPS_HEADER)) {
    return prompt.replace(/^User request:\n/, "");
  }

  const selectedNames = selectionBlock
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/^- /, ""))
    .filter(Boolean);
  const selectedText = `Selected: ${selectedNames.join(", ")}`;

  return typedBlock ? `${selectedText}\n${typedBlock}` : selectedText;
}
