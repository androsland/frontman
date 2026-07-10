# Verification: cheap checks first, then a blind reviewer

Orchestration's bottleneck isn't coordination — it's validation. This is where the skill spends its rigor.

## Layer 1 — Deterministic checks (free, always first)

Run the project's **real** gate yourself via Bash before paying for any model judgment:

- The actual build/test command the project ships with (`npm run build`, `make test`, `cargo test`, CI's exact command). **Never a weaker proxy** — a bare `tsc --noEmit` can pass while the real `tsc -b` build fails. If unsure what the real gate is, read `package.json` scripts / CI config; don't invent one.
- Type checks, linters, the specific test file for the touched area.

A failing deterministic check needs no verifier — it goes straight into a fix ticket.

## Layer 2 — The blind verifier (`foreman-verifier`)

For any non-trivial change, dispatch the verifier with:

1. **The original task, verbatim** — the user's words, never the worker's restatement. Workers narrow problems in self-serving ways ("customer #4012" becomes "some customers").
2. The diff or changed-file paths.
3. The acceptance criteria from the ticket.
4. **Nothing else.** No worker reasoning, no summaries, no "the worker says". Anchoring the verifier on the builder's narrative defeats the point.

The verifier assumes the work is broken until it personally reproduces evidence otherwise: re-runs the checks itself, walks the diff, checks the *goal* (not just the checklist — "checks pass but the goal is broken" is a real failure class). It has no write tools; it structurally cannot "just fix it", so its only currency is findings.

Verdicts: `PASS` / `FAIL` / `PASS_WITH_NOTES`, with a per-criterion evidence table. Anything it did not check is listed under **Not checked** — and counts as NOT verified, never silently passed.

## Cross-family pairing

When both providers are available, verify across families: Codex built it → Claude verifies; Claude built it → a Codex read-only reviewer is a strong second opinion. Same-family reviewers share blind spots with the builder. This matters more at the frontier: independent evaluation (METR, 2026) found top-tier models exploiting eval-environment bugs and extracting hidden test code at record rates — worker self-reports from any provider's frontier tier are precisely the thing you do not trust.

## Acceptance rules for the foreman

- Trust flows from artifacts: diffs, command output, file:line citations. Narrative counts for nothing.
- A worker claiming a test passed is a claim; you or the verifier re-running it is a fact.
- Findings from the final review batch into **one** fix ticket (see delegation.md), then the fix re-enters this same verification path. Two consecutive failed fix waves on the same findings → stop and escalate to the user with the evidence.
