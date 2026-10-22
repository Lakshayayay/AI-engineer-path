// The OpenSwap mark and wordmark, shared by the chat header and the login screen.
export function BrandLogo() {
  return (
    <>
      <svg className="brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 8h10.5l-3-3M18 16H7.5l3 3"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="brand-name">
        Open<span>Swap</span>
      </span>
    </>
  );
}
