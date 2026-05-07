# encryptedchart-site

Static source for **www.encryptedchart.com** — the public pillar site for *The Encrypted Chart*, the operational privacy publication for solo and small-group healthcare practice.

Deployed via Netlify (continuous deployment from `main` branch). Pushes to `main` trigger an auto-build; Netlify serves the static HTML at the production URL.

## Files

- `index.html` — homepage. Contains the **Latest Issue card** between marked HTML comment regions:
  - `<!-- LATEST_ISSUE_NUMBER_START -->` … `<!-- LATEST_ISSUE_NUMBER_END -->` (the "Issue No. XX." h2)
  - `<!-- LATEST_ISSUE_CARD_START -->` … `<!-- LATEST_ISSUE_CARD_END -->` (the linked card)
  
  These markers are the substitution boundary used by the `encryptedchart-deploy` skill when it points the homepage at a newly-published issue. Do not remove the markers when editing the homepage manually.

- `pillar-template.html` — canonical template for new issue pages. Substitution tokens (Jinja2-style):
  - `{{ TITLE }}` — full article title
  - `{{ DECK }}` — subtitle / one-sentence summary
  - `{{ SLUG }}` — URL slug (e.g. `ai-scribes`)
  - `{{ ISSUE_NUMBER }}` — e.g. `01`, `02`
  - `{{ KICKER_CATEGORY }}` — e.g. `DIGITAL DEFENSE`
  - `{{ DATE_HUMAN }}` — e.g. `April 30, 2026`
  - `{{ DATE_ISO }}` — e.g. `2026-04-30T12:00:00-04:00`
  - `{{ READ_TIME }}` — e.g. `8 min read`
  - `{{ ARTICLE_BODY }}` — full article HTML (paragraphs, headings, embedded footnote refs)
  - `{{ FOOTNOTES }}` — `<li>` elements for the footnotes `<ol>`
  
  Body and footnotes are also wrapped in `<!-- ARTICLE_BODY_START -->` / `<!-- ARTICLE_BODY_END -->` and `<!-- FOOTNOTES_START -->` / `<!-- FOOTNOTES_END -->` markers.

- `ai-scribes.html` — Issue No. 01 (April 30, 2026). Live.

- `brad-lieberman.jpg` — author photo, referenced by `index.html` and every pillar page as `/brad-lieberman.jpg`.

## Adding a new issue

The `encryptedchart-deploy` skill (built in agent thread) handles this:

1. Reads `pillar-template.html` from this repo via GitHub API
2. Substitutes the per-issue tokens against the issue's draft document
3. Writes the new `[slug].html` to the repo
4. Updates `index.html` Latest Issue card to point at the new issue
5. Commits both files in a single commit
6. Netlify auto-deploys from `main` → live in ~30 seconds

Manual fallback: clone the repo locally, copy `pillar-template.html` to `[slug].html`, hand-edit the tokens, edit `index.html` Latest Issue card by hand, commit and push.

## Style discipline (do not edit the template structurally)

The pillar template's CSS is the canonical visual system for The Encrypted Chart. Changes to typography, color, spacing, or layout must be reviewed against the brand discipline; do not edit ad hoc per issue. If a structural change is needed, edit `pillar-template.html` directly — the change applies to all future issues.
