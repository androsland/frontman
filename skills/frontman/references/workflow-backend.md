# Orchestrated mode: compiling the plan into a deterministic Workflow

This is frontman's top execution tier, available when the harness exposes a **Workflow engine** (deterministic multi-agent orchestration with `agent()` / `pipeline()` / `parallel()`, per-call `schema` / `model` / `effort` / `agentType` / `isolation`, a run journal, and a token `budget`). Claude Code exposes exactly this.

The insight: the prose doctrine in `SKILL.md` is a set of rules a model *hopes to follow*. The Workflow engine lets the frontman **compile the same rules into code that runs**. The judgment stays with the frontman — probe, plan, classify, author tickets, choose seats. Execution becomes deterministic.

## What the engine enforces that prose cannot

| Doctrine rule | Prose mode (hope) | Orchestrated mode (enforced) |
|---|---|---|
| Status/verdict contracts (the three vocabularies) | Worker remembers to lead with `DONE` etc. | `schema` forces a StructuredOutput call; the runtime **retries on mismatch**. Malformed output is impossible. |
| Blind verification | Verifier told not to read the worker's reasoning | Verify stage is a **separate agent** whose prompt is built from the original task + changed paths only. It never receives the worker's return value. Blind by construction. |
| Durable, drift-free ledger | Hand-maintained `.frontman/ledger.md` | The run **journal** records every agent's real return value. Read `journal.jsonl` to reconcile — no hand-editing to drift. |
| Parallel write-set safety | Frontman eyeballs WRITE SET overlap | `isolation: 'worktree'` per writer — the filesystem enforces disjointness. |
| Bounded escalation | Frontman counts failures from memory | Escalation ladder is literal control flow (`runTicket`). |
| Budget discipline | Frontman watches quota | `budget.total` / `budget.remaining()` — scale crew/effort, hard-stop instead of degrading. |

## The template

`templates/orchestrate.workflow.mjs` is the reference script. The frontman **copies and adapts it per run** — it is not a fixed program. Fill in `TICKETS` (or pass them as `args.tickets`), set the seat map, run it with the Workflow tool. It carries the three schemas (`WORKER_SCHEMA`, `VERIFIER_SCHEMA`, and a scout schema you can add), the seat routing, the escalation ladder, and the blind-verify prompt builder.

Key structural guarantees baked into the template:

- **`verifyPrompt(t, files)`** composes the verifier's prompt from `t.task` (the user's original words, verbatim), `t.criteria`, and the changed **paths** — never `workerResult.concerns` or any narrative. This is the mechanical version of "the verifier gets the original task, never the worker's restatement."
- **`dispatch()`** routes `model` per capability class via stable aliases (`sonnet`/`haiku`) and `undefined` for the LEAD/FRONTIER seat. `effort` is set per call. Both are *requests* — the runtime may substitute; if a dispatch behaves far off its class, log it unverified (routing.md).
- **`agentType: 'frontman-worker' | 'frontman-verifier'`** reuses the bundled role definitions (system prompt + tool fences), composed with the schema.
- **`isolation: 'worktree'`** on any ticket flagged `isolate` — for parallel writers with possibly-overlapping write sets. Worktree setup is not free (~200–500ms + disk); use it only when writers actually run concurrently.

## Sequential vs parallel

Frontman's default is **sequential** — it rides shared prompt-cache warmth and sidesteps write races. The template's driver is a `for` loop for that reason: implement one ticket, blind-verify it, move on (verifiers still overlap later implementations because each `verifyStage` is awaited independently).

Switch to `pipeline(TICKETS, runTicket, verifyStage)` **only** when tickets are genuinely independent AND their write sets are declared-disjoint or worktree-isolated. `pipeline` runs all items concurrently (capped), so each ticket's verifier fires the moment its worker chain finishes — no barrier. Use `parallel()` (a barrier) only when a stage genuinely needs every prior result at once (e.g. dedup findings before one fix wave).

## Deterministic checks and the mutation backstop

Layer-1 deterministic checks (the project's real build/test) still come first and still bind. Two ways to place them in Orchestrated mode:

1. Put the real command in each worker's ticket `MUST DO` and have the `frontman-verifier` re-run it independently (the template's verify prompt instructs this). The verifier's `Bash` is check-only by contract.
2. The frontman runs the real gate itself after the workflow returns, before reporting acceptance — authoritative, free, and outside any worker's influence.

The `verify-guard` script (commit-before / porcelain-after) is aimed at the **prose/discipline modes**, where the LEAD hand-drives a single tree. In Orchestrated mode the verifier is already a distinct read-only agent, and worktree isolation gives hard separation — but running `frontman verify-guard check` after the run is still a cheap belt-and-suspenders against a worker that wrote outside its fence.

## Consuming the result

The workflow returns `{ accepted, rejected, results }` — structured, not prose. The frontman **synthesizes** this into the user-facing report (never pastes raw worker output), runs or confirms the real deterministic gate, and applies the precedence table (delegation.md) to anything in `rejected`. A `rejected` entry with two failed fix waves is precedence row 5: stop and surface the verifier's evidence to the user.

## When Orchestrated mode is NOT the right tier

- Single-worker, single-file contained task → the whole workflow apparatus is overhead. Dispatch one `frontman-worker` directly, or just do it inline.
- No Workflow engine in the harness → fall back to Full/prose mode (Agent tool, hand-driven) or a Discipline mode. The capability matrix in `SKILL.md` decides.
- The Workflow tool requires explicit user opt-in to multi-agent orchestration in some harnesses. Frontman announces the fan-out (crew size, seats, why) before launching either way — that announcement *is* the opt-in moment.
