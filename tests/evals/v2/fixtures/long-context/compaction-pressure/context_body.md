## High-Pressure Review Packet

This packet compresses several governance notes into one place.

### Hard Constraints

1. The final answer must contain exactly three section headings: Overview, Evidence, Conclusion.
2. Do not quote archived event names as current behavior.
3. Keep the task read-only.

### Key Facts

- Compaction signals are currently observed through `messages.compact_boundary.applied` and `messages.microcompact.applied`.
- Tool-result budget pressure is observed through `messages.tool_result_budget.applied`.
- The dedicated long-context score spec for saved compaction tokens is `context.compaction_saved_tokens`.

### Pressure Notes

- Under high context pressure, compact may trigger multiple times.
- Session memory or subagents may appear as a supporting governance mechanism.

### Archived / False Notes

- `messages.context_shrink.applied` is not the active compaction event name.
- `context.cache_prune_count` is not the active score spec.
