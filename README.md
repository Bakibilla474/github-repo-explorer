# RepoScout — GitHub Repo Explorer

RepoScout is a responsive repository discovery app built with React and TypeScript. It searches GitHub's public repository API and turns the results into a small, readable catalog.

**Live demo:** [bakibilla474.github.io/github-repo-explorer](https://bakibilla474.github.io/github-repo-explorer/)

## Features

- Search public repositories by topic, language, or name
- Sort by stars or last update
- Paginate results, with search state reflected in the URL
- Handle loading, empty, API error, and rate-limit states
- Open a repository directly on GitHub
- Navigate by keyboard and use the interface with assistive technology

## Run locally

Requirements: Node.js 22.12 or newer and npm.

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Design and implementation notes

- Search requests are isolated in `src/api/github.ts` and typed in `src/types/github.ts`.
- Requests are cancelled when the query changes, preventing stale results from replacing newer ones.
- Search, sort, and page values are shareable through URL parameters and respond to browser Back/Forward.
- No GitHub token is stored in the browser. The public API applies rate limits to unauthenticated searches.
- The app only reads public repository metadata; it does not create, edit, or delete GitHub content.

## Scope

This is a learning and portfolio project. Search results are supplied by GitHub and can change over time. Search is limited by GitHub's public API policy and availability.
