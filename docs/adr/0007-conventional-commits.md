# ADR-0007 — Conventional Commits + milestone-tagged history

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-08 |
| **Decision-makers** | dellacee |

## Context

This project is a portfolio piece. A reviewer's first signal of quality is
often the GitHub commit history. A wall of "wip", "fix", "more changes"
commits says "I don't care". A clean, scoped history says "I work like a
senior engineer".

## Decision

- **Conventional Commits 1.0.0** for every commit message: `type(scope): subject`.
- One milestone (M0–M10) per commit, tagged in the subject line in
  parentheses (e.g. `feat(api): booking flow with seat-lock + payment webhooks (M3)`).
- Commit body explains *what* and *why* in present tense, not *how*.
- `commitlint` + `husky` enforce the format on local commits.

## Alternatives considered

- **Free-form messages** — Faster to write, but loses the audit trail and
  the ability to auto-generate changelogs.
- **Squash everything to a single "initial commit"** — Hides the
  thinking-by-milestone story that a reviewer can scroll through.

## Consequences

- The history reads as a tour of the project. M0 → M1 → M2 → ... is the
  natural reading order for a recruiter.
- `git log --oneline` is a working table of contents.
- Future tooling (release-please, semantic-release) drops in trivially
  because the commits already obey the contract.
- Trade-off: marginally more friction per commit. Worth it.
