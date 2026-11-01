export type RepositorySort = "stars" | "updated";

export interface GitHubRepository {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  updated_at: string;
}

export interface RepositorySearchResponse {
  total_count: number;
  items: GitHubRepository[];
}

export interface SearchParams {
  query: string;
  sort: RepositorySort;
  page: number;
}

