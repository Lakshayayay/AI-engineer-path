// Only /search gets a skeleton, so /title and /watch keep real 404 status codes (streamed pages always return 200).
export default function Loading() {
  return (
    <div className="px-4 py-6 md:px-10" aria-busy="true" aria-label="Searching">
      <div className="h-12 max-w-2xl animate-pulse rounded-md bg-slate/50" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-lg bg-deep" />)}
      </div>
    </div>
  );
}
