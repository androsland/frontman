# Fable Foreman

**Your strongest model shouldn't be swinging the hammer.**

Fable Foreman turns the most capable Claude model on your account into a team lead: it plans, routes each task to the cheapest worker that clears the quality bar — Claude subagents or OpenAI Codex CLI workers, auto-detected — and refuses to call anything done until a blind, fresh-context verifier reproduces the evidence.

No hardcoded models. No configuration files. No enforcement scripts. One skill, three worker roles, and a set of rules good enough that a frontier model actually follows them.

## Why

Anthropic's own published numbers make the case: a frontier orchestrator with mid-tier workers hits **96% of all-frontier quality at 46% of the cost** (BrowseComp). The counterweight is real too — multi-agent runs consume roughly **15x** the tokens of solo work, and the community is littered with receipts for what happens without discipline: $47k burned in 3 days by runaway subagents; 49 parallel agents at 887k tokens/minute; a $100 budget gone in 9 minutes.

The difference between those two outcomes is not orchestration machinery — it's **routing judgment and verification discipline**. That's what this skill installs.

## What it does

1. **Probes the job site** — what model is the session running, can it spawn agents, is a working authenticated Codex CLI present (checked robustly: binary + credential file + a live `echo ok`, never fragile auth-status parsing).
2. **Routes by capability class, not model name** — FRONTIER (judgment), WORKHORSE (implementation), FAST (scanning). Classes resolve at runtime to stable aliases and to whatever Codex tiers your account offers today. New model releases require zero skill updates.
3. **Delegates with self-contained tickets** — 7 sections, file paths instead of pasted context, gradeable acceptance criteria, an explicit fence.
4. **Collects four-status reports** — `DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED` — with a bounded escalation ladder: two failures at a tier, then escalate or take over. Never a third identical retry.
5. **Verifies like it trusts no one** — the project's real build/test command first (free), then a blind verifier that gets the original task verbatim and none of the worker's reasoning. Cross-family when possible: Claude verifies Codex work and vice versa.
6. **Respects your budget both directions** — sequential dispatch by default (prompt-cache warmth), announced fan-outs, and the degradation rule: under quota pressure it steps seats down *visibly* and prefers stopping cleanly over silently shipping degraded work. **Economics never lowers the quality bar.**

## Install

**Claude Code (plugin):**

```
/plugin marketplace add olsenbrands/fable-foreman
/plugin install fable-foreman
```

**Claude Code (manual):** clone this repo, copy `skills/fable-foreman` into `~/.claude/skills/` and `agents/*.md` into `~/.claude/agents/`.

**Claude Desktop / claude.ai:** upload the release ZIP under Settings → Features → Skills. Desktop can't spawn tier-routed workers, so the skill runs in *discipline mode* — separate plan/execute/verify passes, ledger, and status contracts on your single model — and tells you what Claude Code would add.

**Recommended:** add one line to your `CLAUDE.md` so the skill fires reliably (measured: description-based triggering alone catches only ~50–60% of intended uses):

```
For any multi-file or multi-stage task, use the fable-foreman skill.
```

## What it needs

- **Required:** Claude Code with any model. The stronger your session model, the more the economics favor delegation.
- **Optional:** OpenAI Codex CLI, installed and logged in. If present, execution can route to Codex tiers (as of mid-2026: Sol / Terra / Luna), chosen per task the same way Claude tiers are. If absent, everything falls back to Claude workers. Nothing breaks.

## Honest alternatives

- **[claude-octopus](https://github.com/nyldn/claude-octopus)** — if you want a full multi-provider orchestration *platform* (10+ providers, consensus councils, 50 commands, enforcement hooks), octopus is more mature than this skill and actively maintained. Foreman is the narrow, opinionated alternative: one lead, cheap workers, blind verification, one-minute install.
- **`opusplan`** — Claude Code's built-in alias routes Opus for plan mode and Sonnet outside it. Zero-setup, but only fires in Plan Mode and does no per-task judgment, no Codex, no verification.

## Notes on quotas

Subscription users: subagent calls share your plan's quota — delegation buys *quality-per-token* and *headroom* (both Anthropic and OpenAI meter cheaper tiers in separate, larger buckets), not discounts. API users: the cost savings are direct.

## License

MIT © Jordan Olsen
