# Fable Foreman

**Your strongest model shouldn't be swinging the hammer.**

Fable Foreman turns the most capable Claude model on your account into a team lead: it plans, routes each task to the cheapest worker that clears the quality bar — Claude subagents or OpenAI Codex CLI workers, auto-detected — and, in full orchestration mode, refuses to accept meaningful changes until a blind, fresh-context verifier reproduces the evidence. (Environments without subagents get an honest reduced-assurance mode that says so.)

No dated model IDs in routing policy. No configuration files. No enforcement scripts. One skill, three agent roles, and a set of rules good enough that a frontier model actually follows them.

## Why

Anthropic's own engineering shows both sides of the ledger. Their [multi-agent research system writeup](https://www.anthropic.com/engineering/multi-agent-research-system) found an orchestrator-plus-cheaper-subagents design strongly outperformed single agents — an Opus lead with Sonnet workers, exactly this skill's shape — while consuming roughly **15x** the tokens of a single chat, which is why they conclude multi-agent work only pays for high-value tasks. Anthropic's own [cost guidance](https://code.claude.com/docs/en/costs) likewise recommends cheaper-tier teammates under a stronger lead as the default for multi-agent work. And the community has receipts for what happens without discipline — runaway-subagent cost stories are a genre of their own on every AI-coding forum, which is exactly why this skill bounds crew sizes, retries, and spend announcements the way it does.

The difference between those two outcomes is not orchestration machinery — it's **routing judgment and verification discipline**. That's what this skill installs.

## What it does

1. **Probes the job site** — what model is the session running, can it spawn agents, is a working Codex CLI present: binary on PATH, then `codex login status` for auth *and billing mode*, with a version-tolerant credential-file fallback if that subcommand ever changes — and no billable call, not even the functional `echo ok`, until you've consented to spending your OpenAI credits.
2. **Routes by capability class, not model name** — FRONTIER (judgment), WORKHORSE (implementation), FAST (scanning). Classes resolve at runtime to stable aliases and to whatever Codex tiers your account offers today. New model releases require zero skill updates.
3. **Delegates with self-contained tickets** — 7 core sections plus a mandatory write-set fence on implementation work, file paths instead of pasted context, gradeable acceptance criteria.
4. **Collects four-status reports** — `DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED` — with a bounded escalation ladder: two failures at a seat, then escalate one seat or take over. Never a third identical retry.
5. **Verifies like it trusts no one** — the project's real build/test command first (free), then a blind verifier that gets the original task verbatim and none of the worker's reasoning. Required for every accepted change except single-file zero-logic edits. Cross-family when possible: Claude verifies Codex work and vice versa.
6. **Respects your budget both directions** — sequential dispatch by default (prompt-cache warmth), announced fan-outs, and the degradation rule: under quota pressure it steps seats down *visibly* and prefers stopping cleanly over silently shipping degraded work. **Economics never lowers the quality bar.**

## Install

**Claude Code (plugin):**

```
/plugin marketplace add olsenbrands/fable-foreman
/plugin install fable-foreman@fable-foreman
```

**Claude Code (manual):** clone this repo, copy `skills/fable-foreman` into `~/.claude/skills/` and `agents/*.md` into `~/.claude/agents/`.

**Claude Desktop / claude.ai:** package the skill folder as a ZIP and upload it under Settings → Customize → Skills (requires code execution enabled; see Anthropic's current docs for plan availability):

```bash
cd skills && zip -r fable-foreman-skill.zip fable-foreman/
```

Releases on this repo will also attach a pre-built `fable-foreman-skill.zip`. Without the Agent tool, the skill runs in *discipline mode* — separate plan/execute/self-review passes, ledger, and status contracts on your single conversation model. That's honest same-model self-review, weaker than full mode; the skill says so rather than pretending otherwise.

**Recommended:** add one line to your `CLAUDE.md` so the skill fires reliably (the [fables project](https://github.com/czlonkowski/fables) measured description-based triggering alone at only ~50–60% recall):

```
For any multi-file or multi-stage task, use the fable-foreman skill.
```

## What it needs

- **For full orchestration:** Claude Code, any model — the stronger your session model, the more the economics favor delegation. On claude.ai/Desktop the skill still installs and runs in discipline mode.
- **Optional:** OpenAI Codex CLI, installed and logged in. If present — and only with your explicit OK, since it spends your OpenAI subscription or API credits — execution can route to Codex tiers, discovered from your account at runtime and chosen per task the same way Claude tiers are. If absent, everything falls back to Claude workers. Nothing breaks.

## Honest alternatives

- **[claude-octopus](https://github.com/nyldn/claude-octopus)** — if you want a full multi-provider orchestration *platform* (10+ providers, consensus councils, 50 commands, enforcement hooks), octopus is more mature than this skill and actively maintained. Foreman is the narrow, opinionated alternative: one lead, cheap workers, blind verification, one-minute install.
- **`opusplan`** — Claude Code's built-in alias routes Opus for plan mode and Sonnet outside it. Zero-setup, but only fires in Plan Mode and does no per-task judgment, no Codex, no verification.

## Notes on quotas

Subscription users: subagent calls share your plan's quota — delegation buys *quality-per-token*, and cheaper tiers drain shared quota more slowly (some plans additionally meter cheaper tiers in larger buckets — check yours). It does not buy discounts. API users: the cost savings are direct.

## License

MIT © Jordan Olsen
