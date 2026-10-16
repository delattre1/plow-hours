# plow-pattern-upgrade

Ours moved to the latest Plow OpenClaw base and the Plow agent pattern. Product
behaviour and the tuned prompt are unchanged, except for a real crash on contractor
swipe-replies, which is fixed.

## Summary

- **Base `3102992` → `ddbaa6b` (2026-10-06).** Ours picks up the base's swipe-reply
  fix, burst debounce, run silence, output and run-time caps, faster reconnects, and
  recovery of missed replies in new chats. `install.mjs` is re-anchored to the new
  base.
- **Bug fixed: a contractor's swipe-reply wedged their group.**
  - The cause: Plow sends `reply_to` as `{part_index, message}`, and the group
    attention step read `reply_to.sender`, so it threw.
  - The effect: the hours turn stayed incomplete and recovery replayed the same
    message.
  - It now reads the API shape, and the test reproduces the crash first.
- **Handle checks fail closed.** Plow rosters can list a member without a handle.
  Every owner and contractor comparison now goes through `sameHandle()`, where a
  missing handle matches no one.
- **Tests run without Docker.** `npm run check` assembles the image layout from the
  pinned base source and runs the CI typecheck and the full image suite. It also runs
  a new host-side repository contract.

## Changes by area

- **Runtime** (`install.mjs`, `plugin/`)
  - The base now handles iMessage email members itself. Ours asserts that contract
    instead of patching it.
  - Tool-policy, run-silence and result anchors moved to the new base code.
  - A contractor's clock messages skip burst debounce. They stay one ordered turn
    each and wait for the previous turn's outcome, not its admission.
- **Tests**
  - Attention tests use the real reply shape and cover a member with no handle.
  - A new test covers debounce exemption, ordering and latency. Both halves were
    checked to fail without the change.
  - The fake plugin APIs gain the `on()` hook the base now registers.
- **Contract** (`tests/repo-contract.test.mjs`, now a CI step)
  - The base is pinned by tag and digest, and the base prompt fixture matches that
    commit.
  - The seven base rules Ours relies on keep their Ours equivalents.
  - Every tool named in the prompt and skill exists.
  - The skill's frontmatter matches its install directory.
  - The image declares its identity, runtime and trust mode.
  - No `plow-credentials` or `.env` in Git or the build context.
- **Image**
  - Explicit `AGENT_RUNTIME=OpenClaw`.
  - Comments on the pin, the bump steps and why groups are untrusted.
  - `USER node` before `CMD` (same runtime user).
  - MIT license label.
  - `.env` ignored in Git and the build context.
- **Eval:** the reply scenario sends Plow's reply shape.
- **Docs**
  - README: one-tap install first, a Known limitations section, `npm run check`, and
    the base-bump steps.
  - New `REVIEW.md` with the blocking gates.
  - New `checks/manual-scenarios.md` with 19 real-line scenarios.
  - New `docs/agent-index.md` covering the listing state and the duplicate id.

## Tests

| | Base 3102992 (before) | Base ddbaa6b (after) |
|---|---|---|
| Typecheck (`tsc --noEmit`, base tsconfig) | clean | clean |
| Image suite (`node --test tests/*.test.ts`) | 145/145 | 147/147 |
| Repository contract (`node --test tests/*.test.mjs`) | did not exist | 6/6 |

All runs used `npm run check`, or `node scripts/test-local.mjs` for the before
column, on Node 24.21 and macOS arm64. On the new base before the fixes:
- `install.mjs` stopped at a moved anchor;
- then typecheck failed on the two API shapes;
- then 47 tests failed on the missing `on()` hook.

## Not verified here (no Docker on this machine)

- `docker build`, the in-image suite on Node 26 (CI's version), and the offline
  gateway probe. The probe needs the real image, because OpenClaw also embeds
  absolute paths in SQL.
- `tests/dev-boundaries.mjs`, the live-model conversation evaluator, and
  `checks/manual-scenarios.md` on a real line.
- Multi-arch publishing.

The CI workflow runs all of the image checks on the next push.

## Needs Enzo's decision

- **Release.** Tag a release so CI publishes the new image, then promote the digest
  to `ours`. Running agents keep the old base until then.
- **Duplicate listing.** Retire the `plow-hours` Index entry in favour of `ours`
  (see `docs/agent-index.md`).
- **Fallback model cap.** The new base adds `compat.maxTokensField: "max_tokens"` to
  its models, because Plow forwards `max_tokens` only. Ours' GPT 6 Sol fallback has
  no such compat, so its 128k cap may not reach the provider. I left it unchanged
  because I couldn't verify how Plow's proxy treats `max_tokens` for that reasoning
  model.
- **Eval handles.** The evaluator uses `ours-qa-*@icloud.com` handles. They only run
  against an isolated transport. Switch them to `example.test` if they aren't your
  own QA accounts.
