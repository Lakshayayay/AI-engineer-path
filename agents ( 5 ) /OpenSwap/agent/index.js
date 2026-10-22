import "../environment.js";
import { systemPrompt, finalAnswerSystemPrompt } from "./prompts.js";
import { tools } from "./tools.js";
import { searchSwaps } from "../store/swaps.js";
import { checkHealth } from "../store/github.js";

// Challenge: See challenge.md for instructions.
// Runs the agent loop until it finishes with an answer
export async function runAgent({ client, contextHistory, userPrompt }) {
  // Start the conversation with the user's request.
  const inputContext = [
    ...contextHistory,
    { 
      role: "user", 
      content: userPrompt 
    }
  ];

  // Limit how many turns the agent can take to avoid infinite loops.
  const maxTurns = 5;
  let turnCount = 0;

  // Keep going until the agent finishes or runs out of turns.
  while (turnCount < maxTurns) {
    turnCount++;
    console.log(`Turn ${turnCount}`);

    // Send the inputContext to the model and get its response.
    const turnResponse = await client.responses.create({
      model: process.env.AI_MODEL,
      instructions: systemPrompt,
      input: inputContext,
      tools,
    });

    console.log(turnResponse.output);

    // Preserve the model's whole output turn for the next request.
    // becuase we gotta send the whole input history and context rather than just the message
    inputContext.push(...turnResponse.output);


    // yes maybe - multiple tool calls

    // Create a list of all tool calls requested in this turn.
    const toolCalls = turnResponse.output.filter(
      (item) => item.type === "function_call"
    );

    // If there are no tool calls, return the model's final output text.
    if (toolCalls.length === 0) {
      return {
        swapAgentResponse: turnResponse.output_text,
        contextHistory: inputContext
      }
    }

    // Process each tool call in the order they were requested.
    for (const toolCall of toolCalls) {
      console.log("Tool call requested:", toolCall.name);
      console.log("Arguments:", toolCall.arguments); // arguments are defined in the tools shape

      const result = await runTool(toolCall); // actual function below
      console.log(
        `Tool result [${result.status}]:`,
        result.message || `${result.result?.length ?? 0} items`
      );

      inputContext.push({
        type: "function_call_output",
        call_id: toolCall.call_id,
        output: JSON.stringify(result),
      });
    }
  }

  // The turns ran out. Make one last request with tool calling switched off,
  // so the model answers from the tool results already in inputContext.
  const finalResponse = await client.responses.create({
    model: process.env.AI_MODEL,
    // Same assistant, now told the turns are gone.
    instructions: finalAnswerSystemPrompt,
    // The same accumulated history, so every tool result is still in view.
    input: inputContext,
    // Keep the same tool definitions in the request while forbidding new calls.
    tools,
    // tool_choice: "none" is what guarantees text instead of another tool call.
    tool_choice: "none",
  });

  // Keep the forced final answer in the history, like every other output turn.
  inputContext.push(...finalResponse.output);

  return {
    swapAgentResponse: turnResponse.output_text,
    contextHistory: inputContext
  }
}


// this is the function actual running the tool call
async function runTool(toolCall) {
  // Parse the tool's JSON arguments.
  const toolInput = JSON.parse(toolCall.arguments);
  // we took two things - 1) tool argument and 2) tool name

  try {
    // Run the store function for the tool the model requested.
    if (toolCall.name === "search_swaps") {
      return await searchSwaps(toolInput);
    }

    if (toolCall.name === "check_health") {
      return await checkHealth(toolInput);
    }
  } catch (error) {
    // If the tool call failed, return an error result the model can read.
    return {
      status: "error",
      retryable: false,
      message: error.message,
    };
  }

  // If the model requested a tool that doesn't exist, return an error result.
  return {
    status: "error",
    retryable: false,
    message: "Unknown tool",
  };
}
