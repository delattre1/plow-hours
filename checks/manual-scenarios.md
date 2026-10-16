# Ours end-to-end checklist (real line)

Run this before promoting a release, on a real Plow line with two phones: the owner and
one contractor. Use a QA contractor contact, not a real worker. Every box must pass;
write failures next to the item with the time and what was sent.

Setup:

```sh
npm ci --ignore-scripts --no-audit --no-fund && npm run check   # offline suites green first
plow-agents login && plow-agents lines
plow-agents deploy --local --line LINE_UID                      # writes plow-credentials, starts Compose
docker compose logs -f agent                                    # wait for "plow-boot: identity resolved"
```

## 0. Image

- [ ] **Boot.** The log shows `plow-boot: identity resolved` and no `parked` line.
- [ ] **Probe.** `docker compose exec agent /opt/plow/probe` prints `PLOW_HOURS_PROBE_OK`.
- [ ] **Local dashboard.** <http://localhost:3331/hours> loads on this machine only.

## 1. Owner setup

1. [ ] **First contact.** As the owner, text: "Add Alex, QA_CONTACT, to work on the
   landing page. Create a group with us."
   - Expect: one short introduction, then a question for only the missing facts
     (hourly rate and timezone). No menu, no "How can I help?".
2. [ ] **Group.** Answer "$20/hour, São Paulo time."
   - Expect: Ours reuses an existing owner + Alex + bot group, or creates one with an
     introduction. It reports the request as accepted, never as delivered.
   - Check: the group appears on both phones with exactly three participants.
3. [ ] **Registration receipt.** Expect a confirmation only after the saved receipt.
   Asking "Is Alex registered?" gets a yes that matches the dashboard.

## 2. A workday in the contractor's group

4. [ ] **Start without a task.** As Alex: "Starting work now."
   - Expect: the clock starts at the message's time, then one question about the work.
5. [ ] **Overview later.** "Making the checkout animation."
   - Expect: saved as a note; the start time does not move.
6. [ ] **Split bubbles.** Send "Back on the landing page" and "the hero section" within
   two seconds.
   - Expect: two separate replies in order. Neither message starts a second clock.
7. [ ] **Swipe-reply.** Long-press Ours' question and reply "Yes, the hero".
   - Expect: Ours answers. The turn does not fail, retry or go silent.
8. [ ] **Human talk stays human.** As the owner in the group: "Alex, can you check the
   landing page?"
   - Expect: Ours stays silent and no clock changes.
9. [ ] **Shortcut.** As Alex: `/out commit abc123`.
   - Expect: an immediate stop receipt with the total, without a model delay.
10. [ ] **Own report.** "How much did I work today, and how much did I earn?"
    - Expect: Alex's own duration and USD value from the ledger, exact to the second.
11. [ ] **No cross-worker data.** "How much does the other contractor earn?"
    - Expect: a refusal. No other worker's name, rate or hours.

## 3. Owner privacy and corrections

12. [ ] **Report asked in the group.** As the owner in Alex's group: "Send me the dashboard."
    - Expect: a short "I'll reply privately" in the group; the link arrives only in the
      owner's DM. The group never shows the URL.
13. [ ] **Correction.** In the owner DM: "Alex started at 9:10, not 9:30, yesterday."
    - Expect: the same entry is corrected with a reason; nothing is voided and recreated,
      and Alex is not asked to clock again.

## 4. Paperwork and billing

14. [ ] **Payment details before billing.** As Alex: send a Pix key and beneficiary.
    - Expect: saved and confirmed without repeating the key.
15. [ ] **Request paperwork.** In the owner DM, request the period's invoice for Alex (BR).
    - Expect: the paperwork request lands in Alex's group, not the DM.
16. [ ] **Close and review.** Close the period, then have Alex send a nota fiscal link and
    amount that match.
    - Expect: "ready for your review" in the owner DM; the amount matches the closed value.
17. [ ] **Approval is exact.** Approve in the owner DM. Then have Alex change the Pix key.
    - Expect: the approval is revoked and the owner gets a private alert. Nothing is
      paid or marked paid at any point.

## 5. Recovery

18. [ ] **Restart mid-day.** With a clock open, run `docker compose restart agent`, then
    have Alex send "Finished for today."
    - Expect: the stop closes the original session; no duplicate entry or second receipt.
19. [ ] **Backups.** `docker compose exec agent ls /var/lib/plow/plow-hours/backups` shows a
    fresh encrypted snapshot.

Record the image digest, the date and the line used at the top of the release notes.
