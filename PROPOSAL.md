# Future PMs

**Tech for Good 2026** · GDG Coimbatore · Build weekend Aug 8–9, GRD College

**Track:** AI for Strong Institutions
**Team code:** TEAM-067

## Problem

In e-Office, every time a file is submitted from one desk to another it leaves a tidy little trail: who sent it, who received it, the stage it is at (a draft note, an approval, a marking), and the timestamp. So the raw material to catch a stuck file already exists inside the system. The gap is that nobody reads the shape of that trail over time. A file can sit on one officer's received list for months with no draft note ever opened, or it can bounce between two desks as remarks please or clarification indefinitely, and e-Office treats both as perfectly normal, because it shows you today's status, not the pattern across weeks. The officer who owns the file usually only learns it is dead when a citizen complains, an MLA raises it, or it surfaces awkwardly in the monthly review meeting. By then the delay is already on the record. We want to reverse that order: put the rotting and looping files on a desk on Monday morning, before anyone has to complain to find them.

## Who it helps

We are building for exactly one person this weekend and ignoring everyone else on purpose: the Section Officer or Under Secretary who heads a dealing section. Picture Mr. Iyer in a Revenue or Finance section, with somewhere around 120 to 150 live eFiles on his plate at any given moment. He is the most junior officer in the chain who can actually do something about a stuck file: tell the Dealing Assistant to prioritise it, drop an urgent marking on it, push it for concurrence. A citizen cannot do that, and a Dealing Assistant cannot either, which is precisely why we picked him and not them. Today his only method for finding a stuck file is memory or luck. Our tool hands him a single red list of his section's files that have overshot the deadline for their current stage, so he can act in the same sitting he reads it. Citizens and vigilance wings benefit later, downstream, but they are not our user for the hackathon, we are not designing screens for them, and we are not letting their wishes inflate the scope.

## Solution

The smallest version that still has teeth is a red-list generator for idle files. For each live eFile we count how many days it has sat at its current desk without the next expected action: no draft note opened, no approval recorded, no onward submission. We compare that against a per-stage deadline, taken as the median time historically spent at that same stage and department, with a hard absolute floor so a brand-new file can never look stuck (nothing younger than 14 days gets flagged). Days idle minus stage deadline gives days overdue. That one number is the friction score for the MVP, and we chose a plain number on purpose: in our reading a supervisor will trust '23 days overdue, last moved by X, currently waiting on Finance concurrence' far more than an opaque 0-to-100 model score he cannot pull apart and question. The output is a ranked table: file or diary number, current holder, days overdue, the stage it is jammed at, and a one-line suggested remark. That is the whole of v1. Loop detection, the ping-pong case, is deliberately NOT in this build. We would love it, but stacking loop detection plus desk-hopping plus a scoring model plus an API is exactly how a 24-hour project dies half-finished, so loops go into the next sprint.

## Architecture

 Ingest: we read e-Office-style movement logs, one row per submission carrying file id, from-desk, to-desk, stage and timestamp. For the weekend these come from a synthetic dataset we generate to match the real e-Office schema (eFile id, diary number, submission timestamps, stage), since we plainly cannot pull live government data on a Saturday, and we will say so out loud in the demo. 

Compute: a single pandas pass that, per file, finds the latest movement, measures idle days, looks up the stage deadline from a small config table of medians, computes days overdue, then sorts. Show: one Streamlit page with the red list, a click-to-expand movement trail per file so Mr. Iyer sees why it is stuck and not merely that it is, and a copy-remark button. We also write an acknowledged timestamp the moment he clicks into a file, purely so that later we can compare whether acknowledged files move faster than ignored ones, which is the only honest way to ever claim an improvement number instead of guessing at it.

## Tech stack

Python and pandas do the compute; a groupby median per department and stage is a handful of lines, so there is no reason to drag in a heavyweight ML library on day one. Storage for the weekend is CSV and SQLite. We had Postgres and Neo4j in an earlier draft and we are dropping both, because Postgres is overkill for a few hundred synthetic files and Neo4j only mattered for loop detection, which we cut. The frontend is Streamlit rather than React. For a one-user internal tool on a 24-hour clock, React plus a separate API is a trap, and we would rather ship something that runs than architect something that does not. We move to FastAPI and a real database only if this ever leaves the hackathon. Git and GitHub for version control.

## Getting started

1. Accept your collaborator invite (check your email / GitHub notifications).
2. Clone this repo and start building.
3. Commit early and often — this repo is what you present on the day.

---

_Created automatically when your proposal was validated._