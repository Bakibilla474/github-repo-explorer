import { useEffect, useState, type FormEvent } from "react";
import { searchRepositories } from "./api/github";
import type { GitHubRepository, RepositorySort, SearchParams } from "./types/github";

const RESULTS_PER_PAGE = 12;
const MAX_SEARCH_RESULTS = 1_000;

type SearchStatus = "idle" | "loading" | "success" | "error";

function readSearchParams(): SearchParams {
  const params = new URLSearchParams(window.location.search);
  const pageValue = Number(params.get("page"));
  const sortValue = params.get("sort");

  return {
    query: params.get("q")?.trim() ?? "",
    sort: sortValue === "updated" ? "updated" : "stars",
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

function saveSearchParams(params: SearchParams): void {
  const url = new URL(window.location.href);
  if (params.query) url.searchParams.set("q", params.query);
  else url.searchParams.delete("q");

  if (params.sort === "stars") url.searchParams.delete("sort");
  else url.searchParams.set("sort", params.sort);

  if (params.page === 1) url.searchParams.delete("page");
  else url.searchParams.set("page", String(params.page));

  window.history.pushState(null, "", url);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

function RepoCard({ repository }: { repository: GitHubRepository }) {
  return (
    <article className="repo-card">
      <div className="repo-card__topline">
        <span className="repo-icon" aria-hidden="true">◈</span>
        <span className="repo-card__owner">{repository.full_name.split("/")[0]}</span>
        <span className="repo-card__slash" aria-hidden="true">/</span>
        <a className="repo-card__name" href={repository.html_url} target="_blank" rel="noreferrer">
          {repository.full_name.split("/")[1]}
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </div>

      <p className="repo-card__description">
        {repository.description?.trim() || "No description provided."}
      </p>

      <ul className="repo-card__stats" aria-label={`Repository details for ${repository.full_name}`}>
        <li><span className="stat-dot stat-dot--language" aria-hidden="true" />{repository.language || "No language"}</li>
        <li><span aria-hidden="true">★</span>{formatCount(repository.stargazers_count)} stars</li>
        <li><span aria-hidden="true">⑂</span>{formatCount(repository.forks_count)} forks</li>
      </ul>

      <p className="repo-card__updated">Updated {formatDate(repository.updated_at)}</p>
    </article>
  );
}

function LoadingGrid() {
  return (
    <div className="repo-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="repo-card skeleton" key={index}>
          <span className="skeleton__line skeleton__line--title" />
          <span className="skeleton__line" />
          <span className="skeleton__line skeleton__line--short" />
          <span className="skeleton__line skeleton__line--meta" />
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [searchParams, setSearchParams] = useState<SearchParams>(readSearchParams);
  const [inputValue, setInputValue] = useState(searchParams.query);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    const handlePopState = () => {
      const next = readSearchParams();
      setSearchParams(next);
      setInputValue(next.query);
      setValidationMessage("");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!searchParams.query) {
      setRepositories([]);
      setTotalCount(0);
      setStatus("idle");
      setErrorMessage("");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");
    setErrorMessage("");

    searchRepositories(searchParams.query, searchParams.sort, searchParams.page, controller.signal)
      .then((result) => {
        setRepositories(result.repositories);
        setTotalCount(result.totalCount);
        setStatus("success");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      });

    return () => controller.abort();
  }, [searchParams]);

  const pageCount = Math.max(1, Math.min(Math.ceil(totalCount / RESULTS_PER_PAGE), Math.ceil(MAX_SEARCH_RESULTS / RESULTS_PER_PAGE)));
  const visibleCount = Math.min(totalCount, MAX_SEARCH_RESULTS);

  function updateSearch(next: SearchParams): void {
    saveSearchParams(next);
    setSearchParams(next);
    setValidationMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const query = inputValue.trim();

    if (query.length < 2) {
      setValidationMessage("Enter at least two characters to search.");
      return;
    }

    updateSearch({ ...searchParams, query, page: 1 });
  }

  function handleSortChange(sort: RepositorySort): void {
    updateSearch({ ...searchParams, sort, page: 1 });
  }

  function handlePageChange(page: number): void {
    updateSearch({ ...searchParams, page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="GitHub Repo Explorer home">
          <span className="brand__mark" aria-hidden="true">R</span>
          <span>Repo<span className="brand__accent">Scout</span></span>
        </a>
        <a className="github-link" href="https://github.com" target="_blank" rel="noreferrer">
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow"><span className="eyebrow__dot" /> Open source, made easier to explore</p>
          <h1 id="page-title">Find your next<br /><span>favorite repository.</span></h1>
          <p className="hero__copy">Search public GitHub projects by topic, language, or name. Compare what matters and follow the work that inspires you.</p>

          <form className="search-form" onSubmit={handleSubmit} noValidate>
            <label className="visually-hidden" htmlFor="repository-query">Search GitHub repositories</label>
            <span className="search-form__icon" aria-hidden="true">⌕</span>
            <input
              id="repository-query"
              type="search"
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
                if (validationMessage) setValidationMessage("");
              }}
              placeholder="Try “react”, “accessibility”, or “data visualization”"
              maxLength={100}
              aria-describedby={validationMessage ? "search-validation" : undefined}
              aria-invalid={Boolean(validationMessage)}
            />
            <button type="submit">
              {status === "loading" ? "Searching…" : "Search repositories"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          {validationMessage && <p className="form-message" id="search-validation">{validationMessage}</p>}
          <p className="search-hint">Search results come directly from GitHub’s public API.</p>
        </section>

        <section className="results-section" aria-labelledby="results-title">
          <div className="results-heading">
            <div>
              <p className="section-kicker">DISCOVER</p>
              <h2 id="results-title">{searchParams.query ? "Search results" : "Start exploring"}</h2>
            </div>
            {status === "success" && repositories.length > 0 && (
              <label className="sort-control">
                <span>Sort by</span>
                <select value={searchParams.sort} onChange={(event) => handleSortChange(event.target.value as RepositorySort)}>
                  <option value="stars">Most stars</option>
                  <option value="updated">Recently updated</option>
                </select>
              </label>
            )}
          </div>

          <div className="results-live" aria-live="polite" aria-atomic="true">
            {status === "loading" && <p>Searching public repositories…</p>}
            {status === "success" && repositories.length > 0 && (
              <p>{formatCount(visibleCount)}{totalCount > MAX_SEARCH_RESULTS ? "+" : ""} repositories for <strong>{searchParams.query}</strong></p>
            )}
            {status === "success" && repositories.length === 0 && <p>No repositories matched <strong>{searchParams.query}</strong>.</p>}
            {status === "error" && <p>Search could not be completed.</p>}
          </div>

          {status === "idle" && (
            <div className="empty-state">
              <span className="empty-state__icon" aria-hidden="true">⌕</span>
              <h3>Curiosity starts with a search</h3>
              <p>Look up a language, framework, or idea to see public repositories from across GitHub.</p>
            </div>
          )}

          {status === "loading" && <LoadingGrid />}

          {status === "error" && (
            <div className="error-state" role="alert">
              <span aria-hidden="true">!</span>
              <div><h3>We couldn’t load those repositories</h3><p>{errorMessage}</p></div>
              <button type="button" onClick={() => updateSearch({ ...searchParams })}>Try again</button>
            </div>
          )}

          {status === "success" && repositories.length > 0 && (
            <>
              <div className="repo-grid">
                {repositories.map((repository) => <RepoCard key={repository.id} repository={repository} />)}
              </div>
              <nav className="pagination" aria-label="Search result pages">
                <button type="button" onClick={() => handlePageChange(searchParams.page - 1)} disabled={searchParams.page <= 1}>
                  <span aria-hidden="true">←</span> Previous
                </button>
                <span>Page <strong>{searchParams.page}</strong> of {pageCount}</span>
                <button type="button" onClick={() => handlePageChange(searchParams.page + 1)} disabled={searchParams.page >= pageCount}>
                  Next <span aria-hidden="true">→</span>
                </button>
              </nav>
            </>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <p><span className="brand__mark" aria-hidden="true">R</span> RepoScout</p>
        <p>Built for discovering open source. Data provided by GitHub.</p>
        <a href="https://docs.github.com/en/rest/search/search#search-repositories" target="_blank" rel="noreferrer">GitHub Search API docs <span aria-hidden="true">↗</span></a>
      </footer>
    </div>
  );
}

