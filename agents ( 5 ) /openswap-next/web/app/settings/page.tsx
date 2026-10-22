import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { SettingsForm } from "@/components/settings/settings-form";
import { getPreferences } from "@/lib/store/profiles";
import { authenticate } from "@/lib/supabase/server";

export const metadata = { title: "Settings · OpenSwap" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Settings />
    </Suspense>
  );
}

// The Settings screen: the user's saved preferences, ready to edit.
async function Settings() {
  const auth = await authenticate();

  if (!auth) redirect("/login");

  const preferences = await getPreferences(auth.db);

  return (
    <main className="app-shell settings-shell">
      <header className="brand">
        <BrandLogo />
      </header>

      <Link className="back-link" href="/">
        ← Back to chat
      </Link>
      <h1>Settings</h1>

      <SettingsForm initialPreferences={preferences} />
    </main>
  );
}
