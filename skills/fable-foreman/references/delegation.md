# Delegation: tickets, statuses, escalation, ledger

## The 7-section ticket

Workers start with a fresh context. The ticket must carry everything; if the worker would need to ask a question, the ticket is incomplete.

```
TASK: <the task — for verifier tickets, the user's ORIGINAL words verbatim>
EXPECTED OUTCOME: <observable definition of done, gradeable before dispatch>
CONTEXT: <file PATHS to read; current state; background>
CONSTRAINTS: <stack, patterns, performance/compat requirements>
MUST DO: <non-negotiables, incl. the exact verify command to run>
MUST NOT: <the fence — files/scope off limits; no subagent spawning>
OUTPUT FORMAT: <status-first report per the contract below, plus role shape>
WRITE SET: <every file/glob this worker may create or modify — required for implementation tickets>
```

Inline-vs-path rule: short essentials go **inline verbatim** — the task text, acceptance criteria, a verifier's findings being handed to a fix worker. Bulk material — logs, diffs, generated docs, source files — travels as **paths** (workers read files themselves; artifacts go to `.foreman/scratch/`). A measured failure mode: a 42k-character dispatch prompt that was 99% pasted history.

One task per ticket. EXPECTED OUTCOME must be gradeable — if you can't write the acceptance check, you're not ready to delegate.

## Parallel dispatch

Only for genuinely independent tickets, and only with **provably disjoint write sets**:

1. Compare WRITE SET declarations across the wave — any overlap, including shared manifests, lockfiles, and generated files → serialize those tickets or give each worker worktree isolation (`isolation: worktree` where supported).
2. Snapshot the baseline first: current commit hash + `git status --porcelain` output into the ledger. Every reconciliation afterward is a diff against this baseline.
3. Sequential remains the default — it also rides shared prompt-cache warmth, which parallel dispatch forfeits.

## The three vocabularies (do not mix them)

**1. Worker status** — the first line of every worker report, all roles:

| Status | Meaning | Foreman's move |
|---|---|---|
| `DONE` | Complete, with evidence (commands run + results, files touched) | Deterministic checks → verifier |
| `DONE_WITH_CONCERNS` | Complete, risks flagged | Resolve every concern before accepting; correctness concerns → fix now |
| `NEEDS_CONTEXT` | Missing information; no risky guesses made | Supply it; re-dispatch same worker, same seat |
| `BLOCKED` | Cannot proceed | Triage below |

**2. Verifier verdict** — `PASS` / `FAIL` / `PASS_WITH_NOTES` (verification.md). A verdict is not a status; it grades a change, not a worker.

**3. Ledger lifecycle** — per task: `PENDING → DISPATCHED → REPORTED(status) → VERIFIED | FAILED | LOST`. `LOST` = dispatched, never reported (timeout, crash, dead session).

`BLOCKED` triage, in order: **(1)** Bad ticket (ambiguous, missing constraint) → fix ticket, same seat. **(2)** Capability gap → consult the precedence table. **(3)** External blocker (credentials, permissions, failing dependency) → surface to the user; do not work around it.

Reports are claims. Accept evidence — file:line references, command output, red-to-green transitions. Hedge language ("should work", "probably") is treated as a failure to verify.

## LOST workers and partial edits

A worker that hasn't reported within a reasonable bound for its task class, or whose process died:

1. Mark `LOST` in the ledger. Record what you know (job ID, artifact paths, exit code if any).
2. **Reconcile before retrying**: diff the tree against the ledger baseline. Partial edits are either completed by inspection (rare), reverted, or explicitly folded into the retry ticket. Never re-dispatch onto an unreconciled tree.
3. A LOST dispatch counts as a failure toward the precedence table.

Background jobs (including Codex workers): record the job identity and output path in the ledger **at dispatch time**, and capture exit codes on collection.

## The precedence table (single authority for retries and escalation)

For any failed, FAILED-verdict, or LOST task — apply the first matching row:

| # | Condition | Action |
|---|---|---|
| 1 | Failure caused by the ticket (ambiguity, missing context) | Fix ticket; retry **same seat** (doesn't count against the seat) |
| 2 | First real failure at this seat | Retry same seat with something changed: corrected ticket, added context, or raised effort |
| 3 | Second real failure at this seat | Escalate one seat, **or** the foreman takes over — whichever the task's class warrants |
| 4 | Failure at the top seat (or foreman takeover failed) | Stop; report to the user with evidence |
| 5 | Two consecutive failed **fix waves** against the same findings list | Stop; report to the user with the verifier's evidence — regardless of seats remaining |

Never a third identical retry anywhere. Escalations are one-way per task: once a task proves it needs a seat, don't re-try a cheaper one on it. Rows 4–5 exist so "keep trying" never silently becomes the plan.

## The degradation rule (budget pressure)

When usage limits bite, do **not** blanket-downshift. Re-run the routing decision for each remaining task:

- If a cheaper seat still clears that task's quality bar (tasks are often conservatively over-provisioned), step down **and journal it visibly**.
- If no affordable seat clears the bar, **stop after the current task and tell the user**. A clean stop beats degraded judgment — the First Law is not suspended by budget pressure.

## Fix waves

Findings from review/verification batch into **one** fix ticket carrying the complete findings list and the verifier's evidence verbatim — never one worker per finding (each rebuilds context and re-runs suites). Fix output re-enters verification. Two consecutive failed waves → precedence row 5.

## Ledger schema

`.foreman/ledger.md`, written before the first dispatch of any multi-task run:

```
# Foreman Ledger — <task title>
BASELINE: <commit hash> | <git status --porcelain summary> | <date>
## Plan       <numbered tasks, class per task>
## Routing    <task → seat (+effort if applied) — why, one line each>
## Tasks      <id | lifecycle state | attempts | owned paths | job id/artifacts>
## Decisions  <choices + why; seat changes; degradations; consent grants>
## Scratch    <artifact paths>
```

Update on every state change. **Resuming after compaction or restart:** read the ledger, then reconcile — `git status`/diff against BASELINE, check for still-running jobs, confirm REPORTED/VERIFIED states against actual artifacts — before dispatching anything. A stale `DONE` causes accepted-but-missing work; a stale `DISPATCHED` causes duplicate work. Trust the tree over the ledger.
