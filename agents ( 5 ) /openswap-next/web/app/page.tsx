import { Suspense } from "react";
import { connection } from "next/server";
import { ChatController } from "@/components/chat/chat-controller";
import { listConversations } from "@/lib/store/conversations";
import { getStarterSwapOptions } from "@/lib/store/swaps";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Chat />
    </Suspense>
  );
}

// Saved chats change on every request, so wait for a real request before reading them.
async function Chat() {
  await connection();

  return <ChatController starterSwapNames={getStarterSwapOptions()} initialSummaries={await listConversations()} />;
}
