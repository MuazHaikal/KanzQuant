# KanzQuant Design References

This folder is a canonical visual reference pack for future KanzQuant frontend work.

## Structure

- `00-full/` — full-page canonical references
- `01-shell/` — top bar, sidebar, and shell controls
- `02-chart/` — chart header, toolbar, chart surface, and volume/axis treatment
- `03-right-rail/` — supporting research cards beside the main chart
- `04-bottom-analytics/` — compact analytics panels beneath the main chart
- `05-overview/` — overview-specific side panels
- `06-forecast/` — forecastability-specific analytical modules

## Usage instructions for Codex / Work

1. Open the relevant full-page reference in `00-full/` first.
2. Then inspect the matching micro-reference crops for the exact component being implemented.
3. Treat the visual composition, spacing, hierarchy, and containment as authoritative.
4. Do **not** copy the fake/example values from the mockups. Use KanzQuant's real data and real functionality.

## Important design rules

- The KanzQuant wordmark must remain **text only**.
- Ignore any decorative logo symbol visible in the generated mockups.
- Iconography should use **one consistent SVG line-icon system** rather than raster image icons.
- Dates, metadata, timestamps, labels, and actions should live **inside the relevant panels**.
- Only page title and optional short subtitle should generally sit outside panels.
- These references are for **visual design** only, not for inventing new unsupported features.
