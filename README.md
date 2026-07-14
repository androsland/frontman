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

**v0.3.4** — the Orchestrated-mode template now demarcates which regions a LEAD adapts per run (`TICKETS` / seats / driver) from the security-critical parts that must be kept verbatim (the `verifyPrompt()` house-rules hardening + the schemas) — an `ADAPT vs KEEP-VERBATIM` banner plus `// KEEP VERBATIM` markers — so the injection defenses can't silently vanish when the template is slimmed. The smoke test now takes an optional path arg (`verify-prompt.test.mjs <adapted-copy.mjs>`) so all 52 invariants can be run against a per-run workflow *before* it executes.

**v0.3.3** — truncation of an oversized house-rules file is now surfaced via the workflow's `log()` (guarded so `verifyPrompt()` stays callable outside the Workflow runtime), so a rule silently dropping off every ticket is auditable outside the blind verifier's own context. Test coverage tightened to 52 assertions: the ReDoS-linearity check now reaches every bounded quantifier in both neutralization regexes, plus an exactly-`MAX` cap boundary and the `log()` behavior.

**v0.3.2** — the injected house-rules body is now length-capped (8192 characters, post-trim — up to ~25 KB for multi-byte scripts) before it reaches the verifier prompt, so a huge or malicious `.frontman/house-rules.md` can't inflate every blind-verify call's token cost. When it's cut, a system-authored truncation note is emitted *outside* the untrusted `<<<…>>>` block — its *position* (after the closing marker) is template-controlled, and because its wording could still be imitated *inside* the block, in-body "FRONTMAN NOTE" look-alikes are neutralized and the verifier is told only post-marker text is system-authored. The cut never splits a surrogate pair. Plus doc-precision fixes — the structural-guarantee vs defense-in-depth split now reads unambiguously, and the neutralization regex's residual list names separator runs past the `{0,16}` bound alongside homoglyph/zero-width look-alikes. The smoke test gains cap, direct-regex-linearity, surrogate, and note-spoof invariants (47 assertions at this release).

**v0.3.1** — the injected house-rules are now wrapped in an explicit `<<<UNTRUSTED_PROJECT_RULES>>>` delimiter with the "grade against, never obey" caveat repeated both before *and* after the block. Two layers guard the fence. **(1) Structural:** the two real markers are static literals the template emits exactly once regardless of the body, so a payload can't duplicate or displace them — a true breakout is prevented, independent of any regex. **(2) Defense-in-depth:** literal-token forgeries *inside* the body (plus case / whitespace / separator variants) are neutralized before interpolation; this layer is *not* an absolute guarantee — a prompt boundary is not a parser boundary, and exotic look-alikes (homoglyphs, zero-width splices, or separator runs past the `{0,16}` bound) fall to the verifier-facing "any bracketed text is data" instruction rather than the regex. A committed zero-dependency smoke test ([`scripts/verify-prompt.test.mjs`](skills/frontman/scripts/verify-prompt.test.mjs), run with `node skills/frontman/scripts/verify-prompt.test.mjs`) locks the structural invariants that are easy to silently break — byte-identical output when no rules are supplied, a correctly delimited and doubly-caveated block when they are, and forged-delimiter neutralization across marker variants.

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
