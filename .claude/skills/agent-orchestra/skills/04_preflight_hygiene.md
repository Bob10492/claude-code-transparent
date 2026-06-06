---
title: Project Hygiene Gate
type: reference
description: "Use before agent-orchestra implementation when project state, workspace cleanliness, generated artifacts, truth sources, data freshness, schema compatibility, or blast radius may be unclear."
---

# Project Hygiene Gate

## Purpose

Check whether the project is clean and controllable before implementation.

This is not data-only preflight. It has two layers.

## A. General Project Hygiene

Check:

- Working tree cleanliness
- Current source/runtime truth source
- Generated artifacts and process files location
- Build/test/lint command availability
- Expected files to edit
- Forbidden files or areas
- Blast radius
- Whether a git worktree is needed

For L1 tasks, this may be a two-line check unless the workspace or truth source is unclear.

## B. Data / Observability Hygiene

Use when the task touches logs, metrics, ETL, dashboards, runners, scorers, gates, schemas, data cleaning, or experiments.

Check:

- Data freshness
- Data pollution
- Reference closure
- Schema compatibility
- Impact analysis

## Hard Rule

If the required hygiene layer fails, do not proceed to implementation.
