<!-- .github/copilot-instructions.md - Guidance for AI coding assistants working on SlumLink -->
# Copilot instructions — SlumLink

Summary
- Small static dashboard SPA for the SLUMLINK project. Primary files: `index.html` (markup), `style.css` (styles), plus `README.md` (project purpose).
- There is no build system, backend, or tests in this repo — changes should be runnable by opening `index.html` in a browser.

What to prioritize
- Preserve layout and existing class names: `.topbar`, `.logo`, `.search`, `.container`, `.sidebar`, `.content`, `.card-grid`, `.card`.
- Keep UI changes minimal and cohesive with the current visual language (muted beige/blue palette). If adding new UI elements, mirror the existing `.card` pattern.

Quick actionable examples (use these as canonical patterns)
- Add a new slum card: insert <div class="card">New Slum Name</div> inside the `.card-grid` container in `index.html`.
- Add a new sidebar item: add an `<li>` under `.sidebar ul` in `index.html` (no JS adjustments required; this is static markup).
- Change spacing: modify `.card-grid` or `.card` in `style.css`. The layout uses CSS Grid (3 columns) and rounded cards.

Big-picture architecture (discoverable)
- Single-page static frontend only. The codebase currently represents a visual dashboard prototype — data is hard-coded into markup.
- Expected integration points (not implemented here): APIs for household registration, complaint reporting, event management and dashboards (these would replace static card contents).

Developer workflows (what actually works here)
- Run locally: open `index.html` in any browser. For live edit feedback, use VS Code Live Server or refresh the browser after edits.
- No npm, build, or test commands found: do not add build tooling without a follow-up plan.

Conventions and patterns specific to this repo
- Semantic, small set of CSS classes (no BEM). Reuse existing class names rather than creating many new single-purpose classes.
- Visual assets and texts are inline/static — prefer simple markup edits for prototype adjustments.

Safe edit rules for AI agents
- Do not remove or rename top-level classes (e.g., `.container`, `.sidebar`, `.content`, `.card-grid`) without an explicit reason and a short note in the PR.
- Keep changes isolated and minimal: modify only the files necessary for the change (usually `index.html` and/or `style.css`).
- If adding interactivity, document where new scripts are added and prefer unobtrusive vanilla JS inserted via a new `<script>` tag (keep it small and documented). Avoid introducing large frameworks.

Key files to reference
- `index.html` — primary markup and sample data (slum names, sidebar items)
- `style.css` — styling, layout, and color tokens
- `README.md` — project description and intent

When to ask the human
- If you need to add a build system, backend, or CI, ask for their preferences (tooling, languages, deployment targets).
- If you plan to change the color palette or branding, ask for design approval.

If you edit files, include in your PR/commit message
- Short summary of the change (1 line)
- Files changed (list)
- Local verification steps (e.g., "Open index.html and confirm new card appears")

Feedback
- After applying these instructions, ask maintainers whether they prefer Live Server edits, a GitHub Pages deployment, or conversion to a full frontend app with build tooling.

---
Generated/updated from reading `index.html`, `style.css`, and `README.md` in the repository root. Keep this file concise and sync with any future architectural changes.
