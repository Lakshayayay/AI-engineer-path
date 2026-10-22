import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ICONS } from "@/components/chat/icons";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export const metadata = { title: "Sign in · OpenSwap" };

export default function Page(props: PageProps<"/login">) {
  return (
    <Suspense fallback={null}>
      <LoginScreen searchParams={props.searchParams} />
    </Suspense>
  );
}

// The sign-in screen. Someone who is already signed in goes straight to the chat.
async function LoginScreen({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  if (await getCurrentUser(await createClient())) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <BrandLogo />
        </div>
        <h1>Find open-source alternatives</h1>
        <p className="auth-lead">Sign in to save your chats and tune the results to your preferences.</p>

        {error && (
          <p className="auth-error" role="alert">
            Sign-in didn&apos;t finish. Please try again.
          </p>
        )}

        {/* A plain form POST: the server starts the Google redirect, so no client JavaScript is needed. */}
        <form action="/auth/login" method="post">
          <button className="submit-button google-button" type="submit">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={ICONS.google.path} fill="currentColor" />
            </svg>
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}
