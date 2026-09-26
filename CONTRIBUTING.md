# Contributing

Thanks for taking the time! This is a small project, so the process is light.

1. Fork and create a branch: `git switch -c feat/my-change`.
2. `npm ci`, then `npm run dev` to work on it locally.
3. Before opening a PR, make sure everything passes:
   ```bash
   npm run lint && npm run typecheck && npm test && npm run build
   ```
4. Algorithms live in `src/sorting/` and `src/pathfinding/` as pure functions that return a trace.
   A new algorithm needs tests that replay its trace and compare the result with a reference.
5. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:` …) and open the PR against `main`.
