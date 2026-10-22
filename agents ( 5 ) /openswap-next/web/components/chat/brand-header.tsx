import Link from "next/link";
import type { Ref } from "react";
import type { AccountSummary } from "@/lib/types";
import { BrandLogo } from "../brand-logo";

interface BrandHeaderProps {
  account: AccountSummary;
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  toggleRef: Ref<HTMLButtonElement>;
}

// The logo, the account menu, and the button that opens the chat list on small screens.
export function BrandHeader({ account, sidebarOpen, onOpenSidebar, toggleRef }: BrandHeaderProps) {
  return (
    <header className="brand">
      <BrandLogo />
      <AccountMenu account={account} />
      <button
        ref={toggleRef}
        className="icon-button history-toggle"
        type="button"
        aria-label="Open previous chats"
        aria-controls="sidebar"
        aria-expanded={sidebarOpen}
        onClick={onOpenSidebar}
      >
        ☰
      </button>
    </header>
  );
}

// A native popover: a click outside or Escape closes it, and no state or script is needed.
function AccountMenu({ account }: { account: AccountSummary }) {
  const label = account.name ?? account.email ?? "Account";

  return (
    <>
      <button className="icon-button account-trigger" type="button" aria-label="Account menu" popoverTarget="account-menu">
        {label.charAt(0).toUpperCase()}
      </button>
      <div id="account-menu" className="account-menu" popover="auto">
        <p className="account-name">{label}</p>
        {account.name && account.email && <p className="account-email">{account.email}</p>}
        <Link className="account-item" href="/settings">
          Settings
        </Link>
        <form action="/auth/signout" method="post">
          <button className="account-item" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
