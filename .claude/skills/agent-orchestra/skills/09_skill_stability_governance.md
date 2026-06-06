---
title: Skill Stability and Anti-Regression Governance
type: reference
description: "Use before modifying skill routing descriptions, execution rules, gotchas, or eval cases to prevent action-at-a-distance regressions."
---

# Skill Stability and Anti-Regression Governance

## Purpose

Skill changes can create action-at-a-distance regressions.

A small description change intended to fix one routing bug can cause other skills to mis-trigger or stop being recalled.

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

## The Three Surgical Knives

### Routing Problem

False positive: narrow the `description` and add negative eval cases.
False negative: add missing semantic triggers and add positive eval cases.

### Execution Problem

Routing is correct, but behavior is wrong.
Keep `description` stable and add append-mostly gotchas or execution rules.

### Environment Problem

The skill did not change, but base prompt, tool availability, repository structure, API, or data changed.
Add environment assumptions or compatibility guards.

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
```

## Append-Mostly Policy

For execution bugs, prefer adding narrow gotchas over rewriting existing sections.

## Atomicity Policy

A skill should own one conceptual job. If a fix adds unrelated responsibilities, stop and decide whether that responsibility belongs in another skill, routing policy, shared governance file, eval, or runtime code.

## Eval Policy

Every routing description change must include eval changes.

Minimum eval coverage:

- At least one positive case proving the skill is recalled.
- At least one negative case proving it does not steal adjacent traffic.
- At least one neighbor-skill case if the wording broadens.
