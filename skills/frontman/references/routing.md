# Routing: resolving capability classes to live models

The skill's policy never names dated model IDs. This file is the procedure for resolving FRONTIER / WORKHORSE / FAST to what exists on the user's account **today**.

## The LEAD seat

The session model is the **LEAD seat** — it runs you, the frontman. Do not assume it is frontier-class: sessions start on mid-tier models, org fallbacks, and cost-capped configs. If FRONTIER-class judgment work is on the plan and you cannot establish that the LEAD seat is frontier-class (from the session's own model identity), say so and suggest the user switch models — routing architecture decisions to a mid-tier seat while calling it FRONTIER violates the First Law with extra steps.

## Claude seats

- **WORKHORSE** = the `sonnet` alias; **FAST** = the `haiku` alias. Aliases track the latest release in each family automatically — new releases require zero skill edits.
- Pass the model per dispatch via the Agent tool's `model` parameter (overrides agent-file frontmatter). Treat it as a *request*: runtimes may substitute if the org disallows a tier. If a dispatch behaves far above or below its class, log the seat as "unverified" rather than asserting it.
- The built-in `Explore` agent inherits the session model (capped at Opus-tier) — from a strong LEAD session that's an expensive default for background scanning. Dispatch `frontman-scout` (FAST) instead.

## Effort — use the controls that actually exist

Effort is a real dial, but only where a mechanism exists to set it. Per surface:

- **Codex workers**: set it explicitly per invocation — `-c model_reasoning_effort=<level>` (see codex-workers.md).
- **Claude subagents**: the bundled role files carry static defaults — scout `low`, worker `high`, verifier `high` — so a FAST scout never silently inherits an expensive session effort. If your harness offers a per-invocation effort control, it overrides these; if a model/effort combination isn't supported, the runtime falls back to the model's default — log what actually applied. Where no control exists, don't pretend: convey expected depth in the ticket ("mechanical batch edit; do not deliberate" / "reason carefully about the concurrency implications").
- Heuristics: low/minimal for mechanical work; provider default for normal work; deep effort only for hard verification and design. Raising effort on a cheap seat is often better economics than raising the tier — try it first for borderline tasks (precedence table row 2).

## Codex seats

Follow codex-workers.md: probe → consent → **discover the account's actual tiers** (config.toml preference, `/model`, or asking the user; documentation ≠ entitlement; IDs differ by auth mode) → verify each tier you intend to use with one tiny call → map verified tiers to classes by the provider's published positioning → record the mapping in the ledger.

Providers commonly ship flagship / workhorse / economy tiers, but treat that as a pattern to check, not an invariant. The user's configured default model is their *preference* — identify what it is before classifying it; a user who pinned the flagship as default did not thereby make the flagship your WORKHORSE.

> **Dated example — not policy.** As of 2026-07 the Codex flagship family was GPT-5.6: Sol (flagship), Terra (positioned "everyday workhorse"), Luna ("clear repeatable tasks"), with ChatGPT-account logins using suffixed IDs (`gpt-5.6-sol`) where API-key auth used bare ones (`gpt-5.6`). By the time you read this, assume the lineup has changed — run the discovery procedure.

## Choosing the seat for a task

1. Classify the task's *judgment content*, not its size. A 500-line mechanical rename is FAST; a 10-line concurrency fix is FRONTIER.
2. Apply the First Law: cheapest seat that clearly clears the bar; unsure → one seat up.
3. Claude vs Codex within a class: prefer the provider under less quota pressure; prefer cross-family pairing for build/verify; respect explicit user preference.
4. Log every routing decision in one ledger line: `task → class → seat (+effort if applied) — why`.

## Currency rule

If anything suggests your model knowledge is stale — an unfamiliar name from the user, an alias resolving oddly, an entitlement error on dispatch — verify against live provider docs or the account itself before routing. This repo's own first Codex dispatch failed on exactly this: a day-old model family, a CLI predating it, and an auth-mode ID split no static document had caught yet.
