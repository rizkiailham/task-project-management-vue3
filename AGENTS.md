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
- For dropdown menus, use `src/components/ui/DropdownMenu.vue`.
- For tables (AG Grid), modals, inputs, and buttons, use existing Vue components already present in the codebase.
- For tables, use AG Grid and follow pagination patterns from `src/modules/user/components/UsersGrid.vue`.
- For AG Grid pagination footers, only render them when total items exceed the current page size (or totalPages > 1).
- For confirmations (including delete actions), use the global PrimeVue `ConfirmDialog` flow (`useConfirm`) with `src/components/ui/AppConfirmDialog.vue`; do not introduce local delete-confirm modal components.
- For toasts tied to API calls, show backend response messages for success/error instead of hardcoding frontend strings.
- Always localize user-facing strings using the project's localization system.
- For Settings modal content, follow the established layout and styling from `SettingsModal.vue` and `SettingsCustomFields.vue`:
  - Use the three-column layout pattern: list sidebar (`settings-list`), divider (`settings-divider`), content/editor (`settings-editor`).
  - Default list width is 280px and should be resizable with the same min/max bounds as Custom Fields (220–360).
  - Reuse the list row classes (`settings-list-row` with `is-selected`) and list header styles (`settings-list-title`).
  - Keep the Save Changes action only in the Settings modal footer; section components must not render their own primary save buttons.
  - Section components should expose `saveChanges()` and emit `update:canSave`, `update:isSaving`, `update:hasPendingChanges`.
  - Use the Settings modal empty state pattern for “Select a project first” (dashed border, centered text).
  - Follow the existing padding and typography: list header padding 19px, editor padding 24px/28px, section titles 16px/600, subtitles 12px/gray.

## Font styling
- In templates, prefer Tailwind typography utilities (`font-medium`, `text-*`) for consistency.
- In scoped CSS, avoid hardcoded numeric weights (`font-weight: 500/600`); use design tokens like `font-weight: var(--font-weight-medium)`.
- For Settings project sections, keep typography consistent across child components:
  - Title: `16px`, `font-weight: var(--font-weight-medium)`, `color: var(--color-gray-900)`.
  - Subtitle/Description: `12px`, `font-weight: var(--font-weight-medium)`, `color: var(--color-gray-500)`, `line-height: 1.5`.
- For list/sidebar item labels, use `font-medium` consistently for active and inactive states.

## Implementation approach
- Search the codebase for similar patterns before implementing a feature.
- Prefer extending existing modules over adding new ones.
- Keep logic colocated with similar features (e.g., views, modals, cells, stores).
- For large settings UIs (e.g., Settings modal), split into focused subcomponents (sidebar/list/editor) instead of a single large file.
- For multi-section settings (Project Settings), use a parent hub component to own the side list, tab switching, and Save Changes routing; each section should expose `saveChanges()` and emit `update:canSave`, `update:isSaving`, `update:hasPendingChanges`.

## Commits
- Use the same multi-line commit style as recent commits:
  - Detail, action-oriented subject line. with (feat, perf or tweak)
  - Body with bullet points starting with `- ` describing key changes.
- Split work into multiple small commits when it helps show progress.
- Never amend commits unless explicitly asked.

## Safety and verification
- If unexpected changes appear, stop and ask before proceeding.
- If behavior is unclear, ask clarifying questions rather than guessing.
