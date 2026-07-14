# Frontman

**Your strongest model shouldn't be swinging the hammer.**

Frontman turns the most capable model on your account into a team lead: it plans, routes each task to the cheapest worker that clears the quality bar — Claude subagents or OpenAI Codex CLI workers, auto-detected — and refuses to accept a meaningful change until a blind, fresh-context verifier reproduces the evidence.

Where the harness exposes a **Workflow engine** (Claude Code does), the whole doctrine stops being rules a model *hopes* to follow and **compiles into a deterministic run**: schema-enforced status/verdict contracts, the run journal as a drift-free ledger, worktree write-safety, and blind verification guaranteed by construction.

> **Lineage.** Frontman is a derivative of [**fable-foreman** by Jordan Olsen](https://github.com/olsenbrands/fable-foreman) (MIT), whose routing-judgment-and-verification-discipline design is the foundation here. Frontman keeps that doctrine intact and adds an execution backend and an enforcement layer — see [What's new](#whats-new-vs-fable-foreman). Credit for the core ideas is his.

## Why

Anthropic's own engineering shows both sides of the ledger. Their [multi-agent research system writeup](https://www.anthropic.com/engineering/multi-agent-research-system) found an orchestrator-plus-cheaper-subagents design strongly outperformed single agents — a strong lead with cheaper workers, exactly this skill's shape — while consuming roughly **15×** the tokens of a single chat, which is why they conclude multi-agent work only pays for high-value tasks. The difference between the good outcome and a runaway-cost horror story is not orchestration machinery — it's **routing judgment and verification discipline**. That's what this installs. On this machine, it also *enforces* it.

## What it does

1. **Probes the job site** — `frontman.mjs probe` reports git state and whether a working, authenticated Codex CLI is present *and how it's billed* — secret-safe (it reads the billing **mode**, never a token). No billable call until you've consented to spending your OpenAI credits.
2. **Routes by capability class, not model name** — FRONTIER (judgment), WORKHORSE (implementation), FAST (scanning). Classes resolve at runtime to stable aliases (`sonnet`/`haiku`) and to whatever Codex tiers your account offers today. New model releases require zero skill edits.
3. **Delegates with self-contained tickets** — 7 core sections plus a mandatory write-set fence on implementation work; file paths instead of pasted context; gradeable acceptance criteria.
4. **Collects four-status reports** — `DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED` — with a bounded escalation ladder: two failures at a seat, then escalate one seat or take over. Never a third identical retry.
5. **Verifies like it trusts no one** — the project's real gate first (free), then a blind verifier that gets the original task verbatim and none of the worker's reasoning. Required for **every change a worker produces** — no exemption inferred from the worker's own report; a change trivial enough to skip review is one the LEAD makes inline, never a ticket. Cross-family when possible: Claude verifies Codex work and vice versa.
6. **Respects your budget both directions** — sequential dispatch by default (prompt-cache warmth), announced fan-outs, and visible degradation under quota pressure. **Economics never lowers the quality bar.**

## What's new vs fable-foreman

Three additions, all aimed at the original's one honest gap — that it was *unenforced prose discipline*:

- **Orchestrated mode** — a new top execution tier. When a Workflow engine is present, frontman compiles its routing plan into a Workflow script ([`templates/orchestrate.workflow.mjs`](skills/frontman/templates/orchestrate.workflow.mjs)). Schemas make the three vocabularies *types* the runtime enforces; the journal is the ledger; blind verification is structural (a separate schema'd verifier agent that never sees the worker's output); `isolation: 'worktree'` makes disjoint-write-set safety a filesystem guarantee. See [`references/workflow-backend.md`](skills/frontman/references/workflow-backend.md).
- **A thin enforcement layer** — one dependency-free Node CLI, [`scripts/frontman.mjs`](skills/frontman/scripts/frontman.mjs):
  - `probe` — capability + Codex detection, secret-safe.
  - `ledger` — structured state (`init/add/set/attempt/note/show/reconcile`) so the ledger can't drift from prose edits.
  - `verify-guard` — the commit-before / porcelain-after mutation backstop as a **real gate**: `snapshot` refuses a dirty tree, `check` exits non-zero if the verifier moved HEAD or touched a tracked file.
- **Sharper honesty** — an explicit [when-NOT-to-use](#when-not-to-use-it) section, a gated `CLAUDE.md` trigger that matches the dispatch gate instead of firing on every multi-file edit, and a capability matrix row for Orchestrated mode.

**v0.3** — blind verification is now unconditional in Orchestrated mode (the trivial-skip that keyed off the worker's own summary is gone), plus an optional `.frontman/house-rules.md` whose standing conventions the verifier enforces on every change.

The pure-prompt Discipline modes still work with none of the above (claude.ai / Desktop), honestly labeled "self-reviewed, not blind-verified."

## Install

**Claude Code (manual):** copy `skills/frontman` into `~/.claude/skills/` and `agents/*.md` into `~/.claude/agents/`. The scripts run with your system `node` (>=18), zero dependencies.

**Claude Code (plugin):** if you publish this fork, `/plugin marketplace add <your-repo>` then `/plugin install frontman@frontman`.

**Claude Desktop / claude.ai:** package the skill folder as a ZIP and upload under Settings → Customize → Skills (requires code execution). There it runs in *Discipline mode* — honest same-model self-review, weaker than full mode, and it says so.

**Recommended** `CLAUDE.md` line — gated to match the dispatch gate, so it doesn't fire the machinery on small work:

```
For any multi-file or multi-stage task that would burn premium quota on non-judgment work, use the frontman skill.
```

## When NOT to use it

- **Small, contained, single-file tasks.** The orchestration tax (plan → ticket → dispatch → checks → verify → synthesize) costs an order of magnitude more tokens; on small work the LEAD doing it directly is faster, cheaper, and better. Frontman's dispatch gate says this too — respect it.
- **When your LEAD seat isn't frontier-class** and the task needs frontier judgment — switch models first; routing architecture decisions to a mid-tier seat while calling it FRONTIER violates the First Law with extra steps.
- **As a discount.** On subscription plans, subagent calls share your plan quota — delegation buys *quality-per-token*, not cheaper bills. API users see direct savings; Codex spends a separate account.

## What it needs

- **For Orchestrated mode:** Claude Code with its Workflow engine. **For Full mode:** the Agent tool + a real shell. Weaker environments degrade honestly through the capability matrix down to Discipline mode.
- **Optional:** OpenAI Codex CLI, installed and logged in. Only with your explicit OK (it spends your OpenAI credits). If absent, everything falls back to Claude workers. Nothing breaks.

## License

MIT. Copyright © 2026 Jordan Olsen (original: fable-foreman) and Andreas Demetriou (frontman derivative). See [LICENSE](LICENSE).
