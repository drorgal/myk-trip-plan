# Contributing to myk-trip-plan

## Local Development Setup

This project depends on [myk-library](https://www.npmjs.com/package/myk-library) which is published on npm.

```bash
# Clone the repo
git clone https://github.com/drorgal/myk-trip-plan.git
cd myk-trip-plan

# Install dependencies (includes myk-library from npm)
npm install

# Start dev server
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Optional | Google OAuth Client ID for Gmail sync feature |

## Code Style

- TypeScript strict mode
- No `any` types
- Styled-components for custom styles; prefer myk-library components
- Hebrew strings go directly in JSX (no i18n layer needed — app is Hebrew-only)

## Submitting a PR

1. Fork the repo and create a feature branch
2. Run `npm run lint` and `npm run build` — both must pass
3. Open a PR with a clear description of what changed and why

## Reporting Issues

Use the GitHub issue templates:
- **Bug report** — for unexpected behavior
- **Feature request** — for new ideas
