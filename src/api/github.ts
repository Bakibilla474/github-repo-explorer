import type {
  GitHubRepository,
  RepositorySearchResponse,
  RepositorySort,
} from "../types/github";

const SEARCH_ENDPOINT = "https://api.github.com/search/repositories";
const RESULTS_PER_PAGE = 12;

export interface RepositorySearchResult {
  totalCount: number;
  repositories: GitHubRepository[];
}

export async function searchRepositories(
  query: string,
  sort: RepositorySort,
  page: number,
  signal: AbortSignal,
): Promise<RepositorySearchResult> {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("sort", sort);
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(RESULTS_PER_PAGE));
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
    signal,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const apiMessage = readErrorMessage(payload);
    if (response.status === 403) {
      throw new Error(
        apiMessage ?? "GitHub has temporarily rate-limited search. Wait a moment and try again.",
      );
    }
    throw new Error(apiMessage ?? `GitHub search failed with status ${response.status}.`);
  }

  if (!isSearchResponse(payload)) {
    throw new Error("GitHub returned an unexpected response. Please try again.");
  }

  return {
    totalCount: payload.total_count,
    repositories: payload.items,
  };
}

function isSearchResponse(value: unknown): value is RepositorySearchResponse {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.total_count === "number" && Array.isArray(record.items);
}

function readErrorMessage(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const message = (value as Record<string, unknown>).message;
  return typeof message === "string" ? message : null;
}

