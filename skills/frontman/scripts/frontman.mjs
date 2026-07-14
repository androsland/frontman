#!/usr/bin/env node
// frontman.mjs — the thin enforcement layer for the frontman skill.
//
// Three jobs the LEAD model is otherwise trusted to do by hand (and can silently skip):
//   1. probe        — detect Codex / git / shell capabilities, secret-safe
//   2. ledger       — structured durable state, so it can't drift from prose edits
//   3. verify-guard — the commit-before / porcelain-after mutation backstop, as a real gate
//
// Zero dependencies. Node >=18. Cross-platform (no bash-isms, no GNU `timeout`).
// State lives in `.frontman/` under the CURRENT WORKING DIRECTORY (the repo being worked on).
//
// Usage:
//   node frontman.mjs probe
//   node frontman.mjs ledger init   --title "..." [--no-baseline]
//   node frontman.mjs ledger add    --id t1 --class WORKHORSE --desc "..." [--paths "a.ts,b.ts"]
//   node frontman.mjs ledger set    --id t1 --state DISPATCHED [--seat sonnet] [--effort high] [--job <id>]
//   node frontman.mjs ledger attempt --id t1 --seat sonnet --effort high --rev 1 \
//                                    --outcome "DONE" [--checks "npm test: pass"] [--evidence "..."]
//   node frontman.mjs ledger note   "consent: Codex chatgpt-subscription, user OK 14:22"
//   node frontman.mjs ledger show
//   node frontman.mjs ledger reconcile
//   node frontman.mjs verify-guard snapshot   # assert tree clean (candidate committed); record HEAD
//   node frontman.mjs verify-guard check      # assert HEAD + tracked tree unchanged since snapshot

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(process.cwd(), '.frontman');
const LEDGER = join(DIR, 'ledger.json');
const LEDGER_MD = join(DIR, 'ledger.md');
const HEADFILE = join(DIR, 'verify-head');

// ---- tiny helpers -----------------------------------------------------------

function ensureDir() { if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true }); }

// child_process without a shell → no quoting/injection surprises, cross-platform.
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 20000, ...opts });
  return {
    ok: !r.error && r.status === 0,
    code: r.status,
    out: (r.stdout || '').trim(),
    err: (r.stderr || '').trim(),
    missing: r.error && r.error.code === 'ENOENT',
  };
}
const git = (...a) => run('git', a);

// args parser: --flag value / --flag=value / boolean --flag
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) { out[a.slice(2, eq)] = a.slice(eq + 1); }
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) { out[a.slice(2)] = argv[++i]; }
      else { out[a.slice(2)] = true; }
    } else out._.push(a);
  }
  return out;
}

function nowISO() { return new Date().toISOString(); }
function die(msg, code = 1) { console.error(msg); process.exit(code); }

// ---- probe ------------------------------------------------------------------
// Reports capabilities as JSON. Never prints a secret: for Codex it extracts the
// billing *mode* keyword only, and never reads the contents of auth.json.

function probe() {
  const inRepo = git('rev-parse', '--is-inside-work-tree').out === 'true';
  const gitInfo = inRepo
    ? {
        repo: true,
        head: git('rev-parse', '--short', 'HEAD').out || null,
        branch: git('rev-parse', '--abbrev-ref', 'HEAD').out || null,
        dirty: git('status', '--porcelain').out.length > 0,
      }
    : { repo: false };

  // Codex — installed? authed? billing mode? (metadata only, zero billable calls)
  const codex = { installed: false, authed: 'unknown', billingMode: 'unknown', note: null };
  const ver = run('codex', ['--version']);
  if (!ver.missing) {
    codex.installed = true;
    const status = run('codex', ['login', 'status']);
    if (status.ok || status.out || status.err) {
      const blob = `${status.out}\n${status.err}`.toLowerCase();
      const authed = !/not logged in|no credentials|logged out/.test(blob) && (status.ok || /logged in|account|chatgpt|api key/.test(blob));
      codex.authed = authed ? true : (status.ok ? true : false);
      if (/chatgpt|subscription/.test(blob)) codex.billingMode = 'chatgpt-subscription';
      else if (/api[\s-]?key/.test(blob)) codex.billingMode = 'api-key';
      else codex.billingMode = 'unknown';
    } else {
      // status subcommand failed to run (renamed across releases?) → fall back to
      // credential-file EXISTENCE only. Existence ≠ known billing mode.
      const home = process.env.CODEX_HOME || join(homedir(), '.codex');
      const auth = join(home, 'auth.json');
      if (existsSync(auth)) {
        codex.authed = 'unknown';
        codex.note = 'credentials present but `codex login status` failed — billing mode UNKNOWN; require explicit consent before any billable call';
      } else {
        codex.authed = false;
      }
    }
  } else {
    // Binary not on PATH — but credentials may still exist (common when `codex` is on the user's
    // interactive PATH but not this non-interactive shell's). Flag it instead of silently ruling Codex out.
    const home = process.env.CODEX_HOME || join(homedir(), '.codex');
    if (existsSync(join(home, 'auth.json'))) {
      codex.note = `credentials found at ${home} but 'codex' is not on this shell's PATH — if you expect Codex, fix PATH before ruling it out`;
    }
  }

  const report = {
    shell: true, // this script is running, so a real shell exists
    node: process.version,
    git: gitInfo,
    codex,
    hint: codex.installed && codex.authed !== false
      ? 'Codex present — DISCLOSE billing mode and get consent before the first billable call (even `echo ok`).'
      : 'No consented Codex — Claude workers only. Nothing breaks.',
  };
  console.log(JSON.stringify(report, null, 2));
}

// ---- ledger -----------------------------------------------------------------

function loadLedger() {
  if (!existsSync(LEDGER)) die('No ledger. Run: frontman ledger init --title "..."');
  return JSON.parse(readFileSync(LEDGER, 'utf8'));
}

function saveLedger(l) {
  ensureDir();
  writeFileSync(LEDGER, JSON.stringify(l, null, 2) + '\n');
  writeFileSync(LEDGER_MD, renderLedger(l));
}

function renderLedger(l) {
  const lines = [];
  lines.push(`# Frontman Ledger — ${l.title}`);
  lines.push('');
  if (l.baseline) lines.push(`**BASELINE:** \`${l.baseline.commit || 'no-git'}\` | ${l.baseline.dirty ? 'dirty' : 'clean'} | ${l.baseline.date}`);
  lines.push('');
  lines.push('## Tasks');
  lines.push('');
  lines.push('| id | class | state | seat | paths | job |');
  lines.push('|----|-------|-------|------|-------|-----|');
  for (const t of l.tasks) {
    lines.push(`| ${t.id} | ${t.klass} | ${t.state} | ${t.seat || '—'}${t.effort ? '/' + t.effort : ''} | ${(t.paths || []).join(' ') || '—'} | ${t.job || '—'} |`);
  }
  lines.push('');
  lines.push('## Attempts (append-only)');
  lines.push('');
  for (const t of l.tasks) {
    for (const a of t.attempts || []) {
      lines.push(`- \`${t.id}\` #${a.rev} · ${a.seat || '?'}${a.effort ? '/' + a.effort : ''} · **${a.outcome}** · checks: ${a.checks || '—'} · ${a.evidence || ''} · ${a.at}`);
    }
  }
  lines.push('');
  if (l.notes?.length) {
    lines.push('## Decisions & consent');
    lines.push('');
    for (const n of l.notes) lines.push(`- ${n.at} — ${n.text}`);
    lines.push('');
  }
  return lines.join('\n');
}

function ledger(sub, args) {
  switch (sub) {
    case 'init': {
      if (!args.title) die('ledger init needs --title "..."');
      let baseline = null;
      if (!args['no-baseline'] && git('rev-parse', '--is-inside-work-tree').out === 'true') {
        baseline = {
          commit: git('rev-parse', 'HEAD').out || null,
          dirty: git('status', '--porcelain').out.length > 0,
          date: nowISO(),
        };
      }
      const l = { title: args.title, baseline, tasks: [], notes: [], created: nowISO() };
      saveLedger(l);
      console.log(`ledger initialized at ${LEDGER}`);
      if (baseline?.dirty) console.log('WARNING: baseline tree is dirty — commit or note pre-existing changes before dispatching.');
      break;
    }
    case 'add': {
      const l = loadLedger();
      if (!args.id) die('ledger add needs --id');
      if (l.tasks.find((t) => t.id === args.id)) die(`task ${args.id} already exists`);
      l.tasks.push({
        id: args.id,
        klass: args.class || 'WORKHORSE',
        desc: args.desc || '',
        paths: args.paths ? String(args.paths).split(',').map((s) => s.trim()).filter(Boolean) : [],
        state: 'PENDING',
        seat: null, effort: null, job: null,
        attempts: [],
      });
      saveLedger(l);
      console.log(`+ ${args.id} PENDING`);
      break;
    }
    case 'set': {
      const l = loadLedger();
      const t = l.tasks.find((x) => x.id === args.id) || die(`no task ${args.id}`);
      for (const k of ['state', 'seat', 'effort', 'job']) if (args[k] != null) t[k] = args[k];
      saveLedger(l);
      console.log(`~ ${t.id} → ${t.state}${t.seat ? ' @ ' + t.seat : ''}`);
      break;
    }
    case 'attempt': {
      const l = loadLedger();
      const t = l.tasks.find((x) => x.id === args.id) || die(`no task ${args.id}`);
      t.attempts.push({
        rev: Number(args.rev) || t.attempts.length + 1,
        seat: args.seat || t.seat || null,
        effort: args.effort || t.effort || null,
        outcome: args.outcome || '?',
        checks: args.checks || null,
        evidence: args.evidence || null,
        at: nowISO(),
      });
      saveLedger(l);
      console.log(`· ${t.id} attempt #${t.attempts.length}: ${args.outcome}`);
      break;
    }
    case 'note': {
      const l = loadLedger();
      const text = args._.join(' ') || die('ledger note needs text');
      l.notes.push({ text, at: nowISO() });
      saveLedger(l);
      console.log('noted.');
      break;
    }
    case 'show': {
      console.log(renderLedger(loadLedger()));
      break;
    }
    case 'reconcile': {
      const l = loadLedger();
      if (!l.baseline?.commit) { console.log('No git baseline recorded — nothing to reconcile.'); break; }
      const head = git('rev-parse', 'HEAD').out;
      const porcelain = git('status', '--porcelain').out;
      console.log(`baseline: ${l.baseline.commit.slice(0, 12)} (${l.baseline.dirty ? 'dirty' : 'clean'})`);
      console.log(`now:      ${head.slice(0, 12)} (${porcelain ? 'dirty' : 'clean'})`);
      if (head !== l.baseline.commit) console.log(`DRIFT: HEAD moved since baseline — ${git('rev-list', '--count', `${l.baseline.commit}..${head}`).out} new commit(s). Trust the tree; reconcile task states below.`);
      if (porcelain) console.log(`UNCOMMITTED changes present:\n${porcelain}`);
      const open = l.tasks.filter((t) => ['DISPATCHED', 'VERIFYING'].includes(t.state));
      if (open.length) console.log(`\nIn-flight tasks to confirm against the tree: ${open.map((t) => t.id).join(', ')}`);
      console.log('\nRule: a stale DONE hides missing work; a stale DISPATCHED causes duplicate work. Trust the tree over the ledger.');
      break;
    }
    default:
      die(`unknown ledger subcommand: ${sub}`);
  }
}

// ---- verify-guard -----------------------------------------------------------
// The mutation backstop, honest about its scope: it catches changes to TRACKED
// content and the HEAD ref. It cannot catch ignored files or external state —
// for hard isolation, run the verifier under `codex --sandbox read-only` or in a worktree.

function trackedDirty() { return git('status', '--porcelain', '-uno').out; } // tracked changes only
function untracked() {
  return git('status', '--porcelain', '--untracked-files=all').out
    .split('\n')
    .filter((l) => l.startsWith('??') && !l.includes('.frontman/')); // frontman's own state isn't a finding
}

function verifyGuard(sub) {
  if (git('rev-parse', '--is-inside-work-tree').out !== 'true') die('verify-guard needs a git repository.');
  if (sub === 'snapshot') {
    const dirty = trackedDirty();
    if (dirty) die(`REFUSING: working tree has uncommitted tracked changes.\nCommit the candidate change BEFORE verifying — the verifier must grade a committed state, not a dirty tree:\n${dirty}`);
    ensureDir();
    const head = git('rev-parse', 'HEAD').out;
    writeFileSync(HEADFILE, head + '\n');
    console.log(`snapshot OK — tree clean, HEAD ${head.slice(0, 12)} recorded. Dispatch the verifier now.`);
  } else if (sub === 'check') {
    if (!existsSync(HEADFILE)) die('No snapshot recorded — run `verify-guard snapshot` before the verifier.');
    const recorded = readFileSync(HEADFILE, 'utf8').trim();
    const head = git('rev-parse', 'HEAD').out;
    const dirty = trackedDirty();
    const newUntracked = untracked();
    let bad = false;
    if (head !== recorded) { console.error(`MUTATION: HEAD moved ${recorded.slice(0, 12)} → ${head.slice(0, 12)} during verification. Verdict VOID.`); bad = true; }
    if (dirty) { console.error(`MUTATION: verifier modified tracked files (its Bash is check-only by contract). Verdict VOID:\n${dirty}`); bad = true; }
    if (newUntracked.length) console.error(`NOTE: new untracked files (likely build artifacts, not necessarily malicious):\n${newUntracked.join('\n')}`);
    if (bad) process.exit(1);
    console.log(`check OK — HEAD ${head.slice(0, 12)} unchanged, no tracked mutation. Verdict stands.`);
  } else {
    die(`unknown verify-guard subcommand: ${sub}`);
  }
}

// ---- main -------------------------------------------------------------------

const [cmd, sub, ...rest] = process.argv.slice(2);
const args = parseArgs(sub && sub.startsWith('--') ? [sub, ...rest] : rest);

switch (cmd) {
  case 'probe': probe(); break;
  case 'ledger': ledger(sub, args); break;
  case 'verify-guard': verifyGuard(sub); break;
  default:
    console.log('frontman <probe | ledger <init|add|set|attempt|note|show|reconcile> | verify-guard <snapshot|check>>');
    process.exit(cmd ? 1 : 0);
}
