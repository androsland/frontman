# Routing: resolving capability classes to live models

The skill's policy never names dated model IDs. This file is the procedure for resolving FRONTIER / WORKHORSE / FAST to whatever exists on the user's account **today**.

## Claude seats

- **FRONTIER** = the session model. The user chose it; it's the strongest seat you have. You occupy it — that's why you delegate.
- **WORKHORSE** = the `sonnet` alias. **FAST** = the `haiku` alias. Aliases resolve to the latest release in each family automatically — a new Sonnet ships and the skill needs zero edits.
- Pass the model per dispatch via the Agent tool's `model` parameter (it overrides agent-file frontmatter). Treat the parameter as a *request*: runtimes may silently substitute if the org disallows a tier. If a dispatch behaves far above or below its class, note the tier as "unverified" in the ledger rather than asserting it.
- **Effort dial** (separate from model): `low` for mechanical/scoped work, default `high`, `xhigh`+ only for the hardest verification or design calls. Deeper effort on a cheap model is often better economics than a tier bump — try that first for borderline tasks.
- The built-in `Explore` agent inherits the session model (capped at Opus). From a Fable-tier session that is an expensive default for background scanning — dispatch `foreman-scout` (FAST) instead.

## Codex seats (when the probe passed)

Discover the current lineup at runtime — do not trust training data, Codex ships new tiers frequently:

1. `codex --version` and `codex exec --help` for flags.
2. Read `~/.codex/config.toml` for the user's configured default (`model = ...`) — respect it as their WORKHORSE preference unless the task demands otherwise.
3. If the current model families are unclear or the user names an unfamiliar tier, fetch the live docs (developers.openai.com/codex) before routing.

Map by each tier's *official positioning*, not its name. Example as of 2026-07 (verify before relying on it): the GPT-5.6 family ships as Sol (`gpt-5.6`, flagship — FRONTIER seat), Terra (`gpt-5.6-terra`, "everyday workhorse" — WORKHORSE), Luna (`gpt-5.6-luna`, "clear repeatable tasks" — FAST). Whatever the current names are, providers consistently ship a flagship/workhorse/fast triple; map positioning → class and record the mapping in the ledger so it's auditable.

## Choosing the seat for a task

1. Classify the task's *judgment content*, not its size. A 500-line mechanical rename is FAST; a 10-line concurrency fix is FRONTIER.
2. Apply the First Law: pick the cheapest seat that clearly clears the quality bar; when unsure, one seat up.
3. Claude vs Codex for the same class: prefer the provider whose quota is under less pressure; prefer cross-family pairing for build/verify (builder and verifier from different families); respect explicit user preference.
4. Log every routing decision in one ledger line: `task → class → seat (+effort) — why`.

## Currency rule

If anything suggests your model knowledge is stale — an unfamiliar name from the user, an alias resolving oddly, a provider announcement — verify against live provider docs before routing. Guessing model capabilities from training data is how routing tables rot.
