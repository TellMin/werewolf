# Repository Guidelines

## Project Structure & Module Organization

- Next.js App Router files live in `src/app`; use `layout.tsx` for shared frames and `page.tsx` for route logic.
- Global styles and Tailwind tokens sit in `src/app/globals.css`; prefer utility classes and centralize palette tweaks there.
- Static assets belong in `public/`, while root configs (`next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `.eslintrc.cjs`, `prettier.config.mjs`) stay in the project root.

## Build, Test, and Development Commands

- `npm install` syncs dependencies (Next 15, React 19, Tailwind 4) before any work.
- `npm run dev` serves http://localhost:3000 with Turbopack hot reload for local development.
- `npm run build` emits the optimized bundle into `.next/`; run it before validating production behaviour.
- `npm run start` boots the built site; pair it with a fresh `npm run build` when smoke-testing.

## Linting & Formatting

- `npm run lint` executes ESLint with the `next/core-web-vitals` ruleset; keep the tree warning-free before pushing.
- `npm run format` applies Prettier repo-wide (2-space tabs, 100-column width, trailing commas); run it after structural edits.
- `npm run format:check` verifies formatting without writing changes—use it for CI or quick pre-PR audits.

## Coding Style & Naming Conventions

- Stick to TypeScript with ES modules and two-space indentation, matching the scaffolded files.
- Components, hooks, and providers use PascalCase (`Home`, `GameLobby`); route directories stay lowercase-kebab (`game-room`).
- Keep styling in Tailwind utility classes; define shared tokens or overrides inside `globals.css`. Add succinct comments only when logic is non-obvious.

## Testing Guidelines

- No harness is set up yet. Introduce unit tests with `@testing-library/react` under `src/__tests__/` using `.test.tsx` files that mirror route names (`page.test.tsx`).
- Prefer integration tests that render App Router segments over shallow component tests. Add an npm `test` script once tooling (Vitest or Jest) is added.

## Commit & Pull Request Guidelines

- Keep commit subjects concise, present-tense, and imperative (`setup lobby grid`, `tune tailwind theme`).
- Group related changes per commit; mention affected areas when helpful (`app/page.tsx`, `globals.css`).
- For PRs, provide a clear summary, before/after screenshots for UI tweaks, reproduction steps, and any follow-up TODOs. Confirm `npm run build` and `npm run lint` complete cleanly before requesting review.
