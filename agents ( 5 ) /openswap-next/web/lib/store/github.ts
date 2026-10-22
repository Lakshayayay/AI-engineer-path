import { getEnv } from "../env";
import { failure, noResults, okResult, type ToolResult } from "../tool-result";
import { findSwapByProjectName, getRepoPath } from "./swaps";

const GITHUB_API = "https://api.github.com";
const RELEASE_WINDOW_DAYS = 90;
const RELEASES_PER_PAGE = 100;
const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

// "owner/name" as GitHub allows it. The lookahead refuses "." and "..", so the value can't climb out of /repos/.
const REPO_PATH_PATTERN = /^[A-Za-z0-9-]{1,39}\/(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/;

// The few GitHub fields we read. Everything else is ignored.
interface GitHubRepo {
  archived?: boolean;
  open_issues_count?: number;
  stargazers_count?: number;
  license?: { spdx_id?: string | null } | null;
}

interface GitHubCommit {
  commit?: {
    committer?: { date?: string | null };
    author?: { date?: string | null };
  };
}

interface GitHubRelease {
  tag_name?: string;
  published_at?: string | null;
}

// The facts the agent needs to judge whether a project is maintained.
export interface RepoHealth {
  repo: string;
  archived: boolean;
  last_commit_date: string | null;
  days_since_last_commit: number | null;
  open_issues: number | null;
  latest_version: string | null;
  days_since_last_release: number | null;
  releases_last_90_days: number;
  stars: number | null;
  license: string | null;
}

interface GitHubResponse {
  ok: boolean;
  statusCode: number;
  data: unknown;
}

type RepoHealthLookup =
  | { ok: true; health: RepoHealth; releasesOk: boolean }
  | { ok: false; statusCode: number };

// The agent passes the model's check_health arguments into this function.
export async function checkHealth({
  projectName,
  githubRepo,
}: {
  projectName: string;
  githubRepo?: string | null;
}): Promise<ToolResult<RepoHealth>> {
  // Find the catalog entry so we can connect its display name to a GitHub repo.
  const swap = findSwapByProjectName(projectName);

  if (!swap) {
    // A project found on the web has no catalog entry. Trust the model's repo only once it looks like owner/name,
    // because it becomes part of the GitHub URL path.
    if (githubRepo && REPO_PATH_PATTERN.test(githubRepo)) return reportHealth(githubRepo, projectName);

    return noResults(
      `Project doesn't exist in the OpenSwap database: ${projectName}. Try again with another official name for the project before answering. For a project found on the web, pass its GitHub repo as owner/name.`,
    );
  }

  const repoPath = getRepoPath(swap);

  if (!repoPath) {
    return noResults(`"${swap.name}" has no GitHub repo on record, so it can't be health-checked.`);
  }

  return reportHealth(repoPath, swap.name);
}

// Fetch the repository first, then its latest commit and recent releases, and word the result for the model.
async function reportHealth(repoPath: string, displayName: string): Promise<ToolResult<RepoHealth>> {
  const lookup = await getRepoHealth(repoPath);

  if (!lookup.ok) return describeGitHubFailure(lookup.statusCode, displayName);

  const { health, releasesOk } = lookup;
  const releaseSummary = releasesOk
    ? describeReleaseFreshness(health.days_since_last_release)
    : "release data unavailable";

  return okResult(
    health,
    `${displayName}: last commit ${formatAgo(health.days_since_last_commit)}, ${releaseSummary}.` +
      (releasesOk ? "" : " Release data was unavailable, so it is missing from the result."),
  );
}

async function getRepoHealth(repoPath: string): Promise<RepoHealthLookup> {
  const repoResponse = await fetchFromGitHub(`/repos/${repoPath}`);

  // Without the repository details, there is no health check to return.
  if (!repoResponse.ok) return { ok: false, statusCode: repoResponse.statusCode };

  const commitResponse = await fetchFromGitHub(`/repos/${repoPath}/commits?per_page=1`);

  // The latest commit is core health evidence, so this request must succeed.
  if (!commitResponse.ok) return { ok: false, statusCode: commitResponse.statusCode };

  const releaseResponse = await fetchFromGitHub(`/repos/${repoPath}/releases?per_page=${RELEASES_PER_PAGE}`);

  // A project can still be health-checked when release data is unavailable.
  const releases = releaseResponse.ok ? asArray<GitHubRelease>(releaseResponse.data) : [];
  const commits = asArray<GitHubCommit>(commitResponse.data);

  return {
    ok: true,
    health: shapeRepoHealth(repoPath, repoResponse.data as GitHubRepo, commits, releases),
    releasesOk: releaseResponse.ok,
  };
}

async function fetchFromGitHub(path: string): Promise<GitHubResponse> {
  // These headers select GitHub's JSON API and identify the application.
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "openswap-health-check",
  };

  // A token is optional, but it gives the app a much higher rate limit.
  const { GITHUB_TOKEN } = getEnv();
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  // no-store: Next.js must not cache a health check, it should always be fresh.
  const response = await fetch(GITHUB_API + path, { headers, cache: "no-store" });
  // Some failed GitHub responses have no JSON body, so parsing may return null.
  const data: unknown = await response.json().catch(() => null);

  return { ok: response.ok, statusCode: response.status, data };
}

// Shape GitHub's responses into the small set of facts the agent needs.
function shapeRepoHealth(
  repoPath: string,
  repo: GitHubRepo,
  commits: GitHubCommit[],
  releases: GitHubRelease[],
): RepoHealth {
  const latestCommit = commits[0]?.commit?.committer?.date ?? commits[0]?.commit?.author?.date ?? null;
  const latestRelease = releases[0] ?? null;

  return {
    repo: repoPath,
    archived: repo.archived ?? false,
    last_commit_date: toDateString(latestCommit),
    days_since_last_commit: daysSince(latestCommit),
    // GitHub's open_issues_count includes open pull requests.
    open_issues: repo.open_issues_count ?? null,
    latest_version: latestRelease?.tag_name ?? null,
    days_since_last_release: daysSince(latestRelease?.published_at),
    releases_last_90_days: countReleasesWithin(releases, RELEASE_WINDOW_DAYS),
    stars: repo.stargazers_count ?? null,
    license: repo.license?.spdx_id ?? null,
  };
}

function describeGitHubFailure(statusCode: number, projectName: string): ToolResult<never> {
  if (statusCode === 404) {
    return noResults(`GitHub has no repo for "${projectName}" (it may have been renamed or removed).`);
  }

  if (statusCode === 401) return failure("GitHub rejected the token. Check GITHUB_TOKEN in .env.local.");

  if (statusCode === 403 || statusCode === 429) {
    return failure("GitHub rate limit reached. Add a GITHUB_TOKEN or wait before retrying.", true);
  }

  return failure(`GitHub request failed with status ${statusCode}.`, statusCode >= 500);
}

function describeReleaseFreshness(days: number | null): string {
  return days === null ? "no tagged releases yet" : `latest release ${formatAgo(days)}`;
}

function formatAgo(days: number | null): string {
  if (days === null) return "unknown";
  if (days === 0) return "today";

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function toDateString(isoTimestamp: string | null | undefined): string | null {
  return isoTimestamp ? isoTimestamp.slice(0, 10) : null;
}

// Count complete days since the event.
function daysSince(isoTimestamp: string | null | undefined): number | null {
  if (!isoTimestamp) return null;

  return Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / MILLIS_PER_DAY);
}

// Count only published releases whose timestamp falls inside the window.
function countReleasesWithin(releases: GitHubRelease[], windowDays: number): number {
  const cutoff = Date.now() - windowDays * MILLIS_PER_DAY;

  return releases.filter((release) => {
    return release.published_at && new Date(release.published_at).getTime() >= cutoff;
  }).length;
}

function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}
