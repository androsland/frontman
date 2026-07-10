# Verification: cheap checks first, then a blind reviewer

Orchestration's bottleneck isn't coordination — it's validation. This is where the skill spends its rigor.

## When the verifier is required

Every accepted change, **except** single-file changes with no logic content (pure formatting, comments, docs). That's the whole rule. "It seemed straightforward" is not an exemption — straightforward-looking changes are where unreviewed regressions live. If you are tempted to skip the verifier, that impulse is itself a signal the change deserves one.

## Layer 1 — Deterministic checks (free, always first)

Run the project's **real** gate yourself via Bash before paying for model judgment:

- The actual build/test command the project ships (`npm run build`, `make test`, CI's exact command). **Never a weaker proxy** — a bare `tsc --noEmit` can pass while the real `tsc -b` build fails. Unsure what the real gate is? Read `package.json` scripts / CI config; don't invent one.
- In delegate-only mode (no real shell): you cannot run these — mark them **UNVERIFIED**, ask the user to run them, and never count an unrun check as passed.

A failing deterministic check needs no verifier — it goes straight into a fix ticket.

## Layer 2 — The blind verifier (`foreman-verifier`)

Dispatch with:

1. **The original task, verbatim** — the user's words, never the worker's restatement. Workers narrow problems in self-serving ways ("customer #4012" becomes "some customers").
2. The diff or changed-file paths.
3. The acceptance criteria from the ticket, inline.
4. **Nothing else.** No worker reasoning, no summaries. Anchoring the verifier on the builder's narrative defeats the point.

The verifier assumes the work is broken until it personally reproduces evidence otherwise: re-runs checks itself, walks the diff, and checks the *goal*, not just the checklist — "checks pass but the goal is broken" is a FAIL. Its tool allowlist is read-and-run only (`Read, Glob, Grep, Bash`) — no edit tools, no delegation, no skills — and its Bash use is check-only by contract. Because Bash can technically mutate, the foreman backstops the contract: snapshot `git status` before the verifier runs and confirm it unchanged after. Any mutation = the verification is void and the incident is itself a finding.

Verdicts: `PASS` / `FAIL` / `PASS_WITH_NOTES` — the first line of the verifier's report, whichever provider runs it (a Codex read-only reviewer acting as verifier uses this vocabulary, not the worker statuses). Per-criterion evidence table; everything unexamined goes under **Not checked** and counts as NOT verified. `PASS_WITH_NOTES` is legal only when every *required* criterion passed and the notes concern non-required observations — a required criterion under a note is a `FAIL`.

## Disagreement and flakiness rules

- **A reproduced deterministic failure is authoritative.** If the foreman's check fails and the verifier says PASS (or vice versa), the failing run wins until explained.
- Suspected flaky test: at most **3 reruns** to characterize it. Inconsistent results = treat as failing; report the flake itself as a finding. Never rerun-until-green.
- Verifier verdict vs deterministic evidence still unresolved after that → the change is **blocked**, not accepted. Report both artifacts to the user.

## Cross-family pairing

When both providers are available, verify across families: Codex built it → Claude verifies; Claude built it → a Codex read-only reviewer is a strong second opinion. Same-family reviewers share the builder's blind spots. This matters most at the frontier — independent pre-deployment evaluation in 2026 measured record rates of frontier models gaming checks (exploiting eval-environment bugs, extracting hidden test code). Worker self-reports from any provider's top tier are precisely what you don't trust.

## Acceptance rules for the foreman

- Trust flows from artifacts: diffs, command output, file:line citations. Narrative counts for nothing.
- A worker claiming a test passed is a claim; you or the verifier re-running it is a fact.
- Findings batch into **one** fix ticket (delegation.md), and the fix re-enters this same path. Two consecutive failed fix waves on the same findings → precedence table row 5: stop, escalate to the user with the evidence.
