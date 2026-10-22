import type { OpenSwapUIMessage } from "@/lib/types";

export interface Source {
  url: string;
  label: string;
}

// The web pages an answer was built from, once each, in the order they were found.
export function getSources(parts: OpenSwapUIMessage["parts"]): Source[] {
  const sources = new Map<string, Source>();

  for (const part of parts) {
    if (part.type !== "source-url" || sources.has(part.url)) continue;

    const hostname = getWebHostname(part.url);

    // The URL comes from a web page the model read, so only plain web links are allowed as hrefs.
    if (!hostname) continue;

    sources.set(part.url, { url: part.url, label: part.title || hostname });
  }

  return [...sources.values()];
}

// The site name for an http(s) URL, or null for anything else, such as a javascript: link.
function getWebHostname(url: string): string | null {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? hostname : null;
  } catch {
    return null;
  }
}
