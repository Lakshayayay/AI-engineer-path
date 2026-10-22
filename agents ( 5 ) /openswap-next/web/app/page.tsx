import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChatController } from "@/components/chat/chat-controller";
import { listConversations } from "@/lib/store/conversations";
import { getStarterSwapOptions } from "@/lib/store/swaps";
import { authenticate } from "@/lib/supabase/server";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Chat />
    </Suspense>
  );
}

// Reading the login cookie makes this page run per request, which also keeps one user's chats from reaching another.
async function Chat() {
  const auth = await authenticate();

  // The proxy already redirects signed-out visitors; this is the real check behind it.
  if (!auth) redirect("/login");

  const { db, user } = auth;

  return (
    <ChatController
      // Send the browser only what it displays, not the user id.
      account={{ name: user.name, email: user.email }}
      starterSwapNames={getStarterSwapOptions()}
      initialSummaries={await listConversations(db)}
    />
  );
}
