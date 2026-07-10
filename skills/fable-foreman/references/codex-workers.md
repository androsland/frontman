# Codex workers: probe, invoke, and read back

OpenAI's Codex CLI is an optional accelerator — never a requirement. When present, it adds a second family of worker seats (and spends a *separate* subscription's quota, which the user may prefer).

## The probe (run once per session, cache the result)

```bash
command -v codex                          # 1. installed?
test -s ~/.codex/auth.json                # 2. credentials on disk?
timeout 15 codex exec "echo ok"           # 3. actually functional?
```

All three pass → Codex seats available. Any fail → Claude-only routing, no drama; mention it once.

**Why file-existence, not a status subcommand:** auth subcommands get renamed/removed between Codex releases (a 3.8k-star orchestration project was silently broken for weeks when `codex auth status` disappeared in v0.114.0). `command -v` + credential file + a functional echo is version-tolerant. If the functional check fails while the file exists, credentials are likely expired — tell the user to run `codex login`; never initiate an interactive auth flow yourself.

## Invocation pattern

Non-interactive, one task per invocation, model pinned per the routing decision:

```bash
# Advisory / review work — read-only sandbox:
codex exec -m <model> --sandbox read-only -C <repo-path> - < .foreman/scratch/ticket-N.md

# Implementation work — writable workspace:
codex exec -m <model> --sandbox workspace-write -C <repo-path> - < .foreman/scratch/ticket-N.md
```

- Write the 7-section ticket to a file and pipe it via stdin (`- <`) — avoids shell-quoting bugs in long prompts.
- Choose the sandbox by the *task* (advisory vs implementation), not by the seat.
- Set the model with `-m` per invocation. Discover current tier names via the routing procedure (routing.md) — never from memory.
- `--json` emits a JSONL event stream; the final agent message is what you parse for the status line. Instruct the ticket's OUTPUT FORMAT to end with the four-status contract just like Claude workers.
- Long tasks: run in the background and collect; never foreground-block the session on a 20-minute Codex build.

## Reading back

Codex workers follow the same contract as Claude workers: four-status final line, evidence not narrative, artifacts to `.foreman/scratch/` with paths in the report. Treat their self-reports with the *same* distrust — frontier Codex tiers have independently measured record rates of eval-gaming (METR, 2026-06). Cross-family verification (Claude verifies Codex work) is the default, not the exception.

## Quota notes

- Codex plans meter **per model tier** in rolling windows — the cheapest tier typically has several times the headroom of the flagship. Routing FAST-class work to the cheap Codex seat buys real extra capacity.
- Rate limits are per-account: spawning more parallel Codex workers does not raise the ceiling. Sequential-by-default applies here too.
- If Codex returns rate-limit errors: don't burn retries — fall back to the Claude seat of the same class for the remainder of the run and note it in the ledger.
