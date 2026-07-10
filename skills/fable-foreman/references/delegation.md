# Delegation: tickets, statuses, escalation

## The 7-section ticket

Workers start with a fresh context. The ticket must carry everything; if the worker would need to ask a question, the ticket is incomplete.

```
TASK: <one sentence — what to do>
EXPECTED OUTCOME: <observable definition of done, gradeable before dispatch>
CONTEXT: <file PATHS to read (never pasted content), current state, background>
CONSTRAINTS: <stack, patterns to follow, performance/compat requirements>
MUST DO: <non-negotiables, incl. the exact verify command to run>
MUST NOT: <the fence — files/scope it may not touch, no subagent spawning>
OUTPUT FORMAT: <the four-status report, plus role-specific shape>
```

Rules:

- **Paths, not pastes.** A real 42k-character dispatch prompt was measured at 99% pasted history. Workers read files themselves; bulk output goes to `.foreman/scratch/` with only the path reported back.
- **One task per ticket.** Don't paste prior tasks' summaries into later tickets.
- **EXPECTED OUTCOME must be gradeable.** If you can't write the acceptance check, you're not ready to delegate.
- Independent tickets dispatch in one message (parallel); dependent tickets go sequential — sequential dispatches are also cheaper (shared cache warmth).

## The four-status report contract

Every worker's final message leads with exactly one:

| Status | Meaning | Foreman's move |
|---|---|---|
| `DONE` | Complete, with evidence (commands run + results, files touched) | Run cheap checks; dispatch verifier if non-trivial |
| `DONE_WITH_CONCERNS` | Complete, but flagged risks | Resolve each concern *before* accepting; correctness concerns → fix now |
| `NEEDS_CONTEXT` | Missing information, made no risky guesses | Supply it; re-dispatch **same worker, same tier** |
| `BLOCKED` | Cannot proceed | Classify below |

`BLOCKED` triage, in order: **(1)** Bad ticket (ambiguous, missing constraint) → fix ticket, same tier. **(2)** Capability gap (task harder than classed) → escalate one seat, or reduce effort-mismatch first (bump effort before bumping tier). **(3)** External blocker (missing credentials, failing dependency, permission) → surface to the user; do not creatively work around it.

Reports are claims. Evidence — file:line references, command output, a red-to-green test transition — is what you accept. Reject hedge language ("should work", "probably passes") as if it were a failure.

## Bounded escalation ladder

- Start at the cheapest seat that plausibly clears the bar.
- After **two failures** at a seat: escalate one seat OR take over yourself. Never a third identical retry — same input, same seat, same result.
- Retries at the same seat must change something: a corrected ticket, added context, or a bumped effort dial.
- Escalations are one-way per task: once a task proves it needs WORKHORSE, don't re-try FAST on it to save money. The First Law already decided.

## The degradation rule (budget pressure)

When usage limits bite: step each seat down one tier **and write it in the ledger**, visibly. If the task class demands a seat the budget can't support, **stop after the current task and tell the user** — a clean stop beats silently degraded judgment. Never let economics quietly lower the quality bar.

## Fix waves

When review/verification returns findings: dispatch **one** fix worker carrying the complete findings list — never one worker per finding (each rebuilds context and re-runs suites; measured cost blowups are dramatic). The fix worker's ticket includes the verifier's evidence verbatim.

## Ledger

`.foreman/ledger.md`, written before the first dispatch of any multi-task run:

```
# Foreman Ledger — <task title>
## Plan          <numbered tasks, class per task>
## Routing       <task → seat (+effort) — why, one line each>
## Status        <task: PENDING | DISPATCHED | DONE | VERIFIED, updated live>
## Decisions     <choices made + why, tier changes, degradations>
## Scratch index <paths of worker artifacts>
```

Update on every status change. After compaction or a restart, **read the ledger before dispatching anything** — re-doing finished work is the single most expensive orchestration failure.
