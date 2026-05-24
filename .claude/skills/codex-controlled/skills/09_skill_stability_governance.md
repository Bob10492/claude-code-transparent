---
title: Skill Stability and Anti-Regression Governance
type: reference
description: Use before modifying skill routing descriptions, execution rules, gotchas, or eval cases to prevent action-at-a-distance regressions.
---

# Skill: Skill Stability and Anti-Regression Governance

## Purpose

Skill changes can create action-at-a-distance regressions.

A small description change intended to fix one routing bug can cause other skills to mis-trigger or stop being recalled.
This file defines a deterministic change discipline for `codex-controlled` and related skills.

## Core Rule

Do not blindly edit prompts.

Before changing a skill, classify the failure type:

1. Routing failure
2. Execution failure
3. Environment failure

Then apply the smallest matching fix and add eval coverage.

## Description vs Execution Rules

### `description` is routing-only

The frontmatter `description` should answer only:

- When should this skill be loaded?
- What user intent or task class should recall it?
- What adjacent tasks should not recall it?

Do not put execution details, edge-case patches, or workflow gotchas into `description`.

### `gotchas` and `execution_rules` are execution-only

Execution behavior belongs in the skill body or a reference file, not in the routing description.

Use these sections for execution fixes:

```md
## Gotchas

- When X happens, do not do Y. Do Z instead.

## Execution Rules

- After routing succeeds, follow these constraints...
```

### Why this matters

Changing `description` changes routing space.
Changing `gotchas` changes behavior after the skill is already selected.

Most bug fixes should be append-mostly gotchas, not description rewrites.

## The Three Surgical Knives

### 1. Routing Problem

Symptoms:

- False positive: the skill loads when it should not.
- False negative: the skill does not load when it should.

Fix strategy:

- False positive: narrow the `description`; add negative eval cases.
- False negative: add missing semantic triggers; add positive eval cases.

Allowed edits:

- Small targeted description edit.
- Routing aliases only when necessary.
- Positive / negative eval updates.

Do not:

- Add execution gotchas to description.
- Rewrite the whole skill body to fix routing.

### 2. Execution Problem

Symptoms:

- Correct skill loaded.
- The agent executes incorrectly inside that skill.
- Failure occurs only in a boundary case.

Fix strategy:

- Use append-mostly gotchas or execution rules.
- Keep the routing description stable.
- Add execution acceptance tests.

Allowed edits:

- Add `Gotchas` section.
- Add `Execution Rules` section.
- Add an acceptance case describing the boundary.

Do not:

- Rewrite `description` unless routing also failed.
- Expand routing keywords to hide execution weakness.

### 3. Environment Problem

Symptoms:

- Skill did not change, but behavior changed.
- Base prompt, global policy, tool availability, API behavior, repo structure, or data source changed.

Fix strategy:

- Record environment assumption.
- Add a diagnostic note or compatibility guard.
- Add eval only if the behavior should stay invariant.

Allowed edits:

- Add environment assumptions.
- Add compatibility checks.
- Add project hygiene or tool-availability guards.

Do not:

- Blame the local skill until routing and execution are ruled out.
- Patch unrelated skill descriptions.

## Change Workflow

Every skill change should follow this order:

1. State the failure type: routing / execution / environment.
2. State the observed symptom.
3. State the intended minimal fix.
4. Choose the edit target:
   - `description` only for routing fixes.
   - `gotchas` / `execution_rules` for execution fixes.
   - environment notes / hygiene checks for environment fixes.
5. Add or update eval cases.
6. Run the eval harness.
7. Summarize whether positive recall and negative non-recall still pass.

## Standard Change Checklist

```md
## Skill Change Checklist

### 1. Failure Classification
- [ ] Routing failure
- [ ] Execution failure
- [ ] Environment failure

### 2. Evidence
- Symptom:
- Expected behavior:
- Actual behavior:
- Affected skill:
- Neighbor skills at risk:

### 3. Edit Target
- [ ] Description changed because routing failed
- [ ] Gotcha added because execution failed
- [ ] Environment guard added because external condition changed

### 4. Eval Coverage
- [ ] Positive eval added or updated
- [ ] Negative eval added or updated
- [ ] Neighbor skill regression case considered

### 5. Verification
- [ ] Eval harness run
- [ ] No false-positive regression
- [ ] No false-negative regression
- [ ] Existing checkpoint/evidence/hygiene rules preserved
```

## Append-Mostly Policy

For execution bugs, prefer adding narrow gotchas.

Good:

```md
## Gotchas

- If the user asks to understand a visual checkpoint, do not continue execution. Enter Layered Explanation or Coach Mode first.
```

Bad:

```yaml
description: Use this skill for all visual checkpoint, execution, explanation, review, routing, and UI tasks...
```

The bad version broadens routing and can steal traffic from other skills.

## Atomicity Policy

A skill should own one conceptual job.

If a fix requires adding unrelated responsibilities, stop and ask whether the responsibility belongs in:

- another skill
- a routing policy
- a shared governance file
- a test case
- the runtime system rather than the skill text

## Eval Policy

Every routing description change must include eval changes.

Minimum eval coverage:

- At least one positive case proving the skill is recalled.
- At least one negative case proving it does not steal adjacent traffic.
- At least one neighbor-skill case if the change broadens wording.

Execution gotcha changes should include acceptance tests even if routing eval does not change.

## Anti-Regression Success Criteria

A skill change is acceptable only if:

- The failure type is identified.
- The edit target matches the failure type.
- The description stays routing-focused.
- Execution fixes are append-mostly when possible.
- Eval cases cover the new behavior.
- Existing control-plane guarantees are preserved.
