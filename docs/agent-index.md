# Agent Index listing

State of the listing on 2026-10-16, read from the public Index API
(`/v1/agent?agent_id=…`). Nothing here is published automatically; the owner
updates the listing with `plow-agents image set` or the
[agent-index-client](https://github.com/plow-pbc/agent-index-client).

## Canonical id: `ours`

`ours` is the listing to keep. It is blessed, deployable and tested (2026-10-06).
It has a video, four images, four capabilities, three stories and 3 of 3
successful installs. The image sets `AGENT_ID=ours`, so usage reports there.

## Duplicate: `plow-hours`

`plow-hours` is an earlier registration of the same repository and product. It is
not blessed or deployable and splits installs and stories (4 of 4 recorded
there). Retire it, or point its install URL at the `ours` page, so people land on
the one-tap listing.

## Fields to check on the next release

- **Tools.** The listing names only Plow Chat, with `latch: optional`. If the Sheets
  and wiki copies stay, add Plow Latch with what it reaches: "Optional: copies the
  timesheet to Google Sheets and a wiki on your Mac." Otherwise set `latch: none`.
- **Install URL.** It points at `#run-locally`, the developer path. With 1-click
  deploy enabled, point it at `#install`, which now leads with the one-tap flow.
- **Stories.** The three stories describe features. The strongest Index stories
  are first-person accounts of one real moment with a number in it. Add one
  from a real install when there is one, such as the first payday that needed
  no message digging. Never write one that did not happen.
