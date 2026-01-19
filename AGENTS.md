# AGENTS Instructions

These rules apply to all future work in this repository.

## Core rules
- Always prioritize existing components and patterns already used in the codebase.
- PrimeVue components are the first choice; only introduce new UI components when no PrimeVue or existing component fits.
- Follow established structure, naming, and styling conventions in each file you touch.
- Prefer minimal, surgical changes; avoid large refactors unless explicitly requested.
- Do not modify `.env` unless the user explicitly asks.
- Avoid destructive git commands unless explicitly requested.

## UI/UX consistency
- Reuse existing UI components, CSS utilities, and helper functions before creating new ones.
- Match existing spacing, typography, and interaction patterns in the same area of the app.
- If you must add styling, keep it scoped and aligned with the current design system.
- For icons, prefer Lucide icons (lucide-vue-next) instead of custom SVGs.
- For tables (AG Grid), modals, inputs, and buttons, use existing Vue components already present in the codebase.
- For AG Grid pagination footers, only render them when total items exceed the current page size (or totalPages > 1).
- For delete confirmations, use the existing `DeleteConfirmModal` pattern used in the Users UI.
- For toasts tied to API calls, show backend response messages for success/error instead of hardcoding frontend strings.
- Always localize user-facing strings using the project's localization system.

## Implementation approach
- Search the codebase for similar patterns before implementing a feature.
- Prefer extending existing modules over adding new ones.
- Keep logic colocated with similar features (e.g., views, modals, cells, stores).
- For large settings UIs (e.g., Settings modal), split into focused subcomponents (sidebar/list/editor) instead of a single large file.

## Commits
- Use the same multi-line commit style as recent commits:
  - Detail, action-oriented subject line. with (feat, perf or tweak)
  - Body with bullet points starting with `- ` describing key changes.
- Split work into multiple small commits when it helps show progress.
- Never amend commits unless explicitly asked.

## Safety and verification
- If unexpected changes appear, stop and ask before proceeding.
- If behavior is unclear, ask clarifying questions rather than guessing.
