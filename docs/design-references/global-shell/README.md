# KanzQuant Global Shell Reference Pack

Extract this folder to:

`docs/design-references/global-shell/`

Use these images as the canonical visual reference for the shared KanzQuant shell and reusable UI patterns.

## Primary references
- `00-full-shell.png` — overall shell composition
- `01-topbar.png` — compact top bar and global search
- `02-left-sidebar.png` — sidebar structure
- `03-sidebar-states.png` — selected, hover, neutral, expanded states
- `04-control-patterns.png` — buttons, tabs, segmented controls, dropdowns, icon buttons
- `05-filter-and-indicator-chips.png` — filter pills and removable chart indicator chips
- `06-scrollable-table-pattern.png` — dense workstation table treatment
- `07-icon-system-reference.png` — canonical line-icon language
- `08-panel-and-page-pattern.png` — panel headers, chart/analytics composition, containment

## Rules
- Text-only `KanzQuant` wordmark in the implemented product.
- Use one consistent SVG line-icon system; do not use rasterized generated icons in production.
- Keep shell compact and near-black/graphite.
- Blue is interaction/selection; green/red are semantic values, not generic UI accents.
- Panel-specific dates, metadata, controls, legends, and status stay inside their panel.
- Avoid stacked global header layers and nested-card clutter.
- Tables and dense workspaces should use internal scrolling where appropriate.
