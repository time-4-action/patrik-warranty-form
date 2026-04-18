---
name: nextjs-organize-files
description: Reorganize, move, or restructure existing files and folders in a Next.js project to match App Router conventions and the project's own established patterns. Use when the user asks to "reorganize", "restructure", "clean up the folder structure", "move", "relocate", or "tidy" files in a Next.js project — or when they describe a structural problem like "components are scattered everywhere", "I don't know where things go", "this folder is a mess", or "should this be in components/ or in the route folder?". Also use when auditing a project's layout for idiomatic App Router usage (colocation with _folder, components/ui vs components, lib/ organization). This skill is ONLY about moving and restructuring existing files — do NOT use it to create new components (use nextjs-scaffold-component) or to extract code from within a single file (use nextjs-extract-components).
---

# nextjs-organize-files

Move and restructure files in a Next.js App Router project so that location reflects usage: route-specific code lives near its route, shared code is centrally accessible, primitives are separable from composites, and nothing is in a random place just because that's where it got created.

The job is **moving files**, not writing new ones and not editing their contents (beyond fixing the imports the moves break). If the user wants new files or refactored file internals, redirect them.

## Core principles

**Location reflects usage.** A component used by one route belongs near that route. A component used by three routes belongs in a central place. When usage changes, the location should change with it.

**Colocation is the App Router default.** Next.js supports `_folder` and `(group)` precisely so that route-specific components, hooks, and helpers can live inside `app/` without being treated as routes. Use this aggressively for things that only one route cares about. A top-level `components/` folder full of `DashboardSidebar`, `BillingHeader`, and `SettingsForm` — each used in exactly one route — is a smell.

**The target structure is the project's existing structure, extrapolated.** If the project already uses feature folders (`features/billing/`), keep using them. If it uses flat `components/` + colocated `_components/`, keep doing that. Do not impose your preferred layout onto a project that has its own working system.

## Reference: App Router-idiomatic layout

When there is no established project convention (genuinely greenfield or inconsistent), this is the default to aim for:

```
src/
  app/
    layout.tsx
    page.tsx
    (marketing)/           # route group, no URL segment
      pricing/
        page.tsx
        _components/       # route-specific, not routable
          pricing-tier.tsx
    dashboard/
      layout.tsx
      page.tsx
      _components/
        dashboard-nav.tsx
      settings/
        page.tsx
        _components/
          settings-form.tsx
  components/
    ui/                    # primitives (Button, Input, Card) — often shadcn-managed
      button.tsx
    site-header.tsx        # composites shared across multiple routes
    footer.tsx
  hooks/
    use-media-query.ts
  lib/
    utils.ts               # cn(), formatters, small utilities
    db.ts                  # shared clients/instances
    actions/               # cross-route server actions
  types/
    index.ts
```

**Distinctions that matter:**

- `_components/` (leading underscore) inside `app/` is the opt-out-of-routing folder. Use it for route-specific pieces.
- `components/ui/` vs `components/` is the shadcn-ish split: primitives in `ui/`, composed things at the top level. Worth preserving if already present.
- `(group)/` (parentheses) groups routes without adding a URL segment. Use for organizing `app/` by section without changing URLs.
- `lib/` is for non-UI code. Data fetchers, utilities, clients. `lib/utils.ts` is the conventional home for `cn()` and tiny helpers.

## Workflow

### 1. Survey before proposing anything

Do not start moving files until you've looked at the whole shape. Run:

- `ls -la` on `app/`, `components/`, `src/` if present, `lib/`, `hooks/`.
- Peek into 2–3 component files to see how they import each other. Are imports going `../../../`? That's a signal the structure fights the usage.
- `grep -r` for import statements that reach across feature boundaries in unexpected ways.
- Check `tsconfig.json` for the path alias.
- Read `components.json` if it exists (shadcn config specifies where primitives live).

Build a mental map: which files are imported by one route only? Which are imported by many? Which are dead?

### 2. Distinguish real problems from stylistic preferences

**Real problems worth moving files over**:

- Route-specific components sitting in top-level `components/` (should colocate to `app/[route]/_components/`).
- Shared components buried inside one route's `_components/` (should promote to top-level).
- Primitives (Button, Input) mixed with composed components in the same folder.
- Utility functions in `components/` or UI code in `lib/`.
- A dead file with no inbound imports — either delete or ask.
- Naming drift: half the files `PascalCase.tsx`, half `kebab-case.tsx`. Pick the majority convention, flag the outliers.
- `use-*` hooks scattered between `hooks/`, `lib/`, and random component folders.

**Not worth moving files over** (leave alone or ask first):

- Personal preference between `components/ui/` vs `components/primitives/` when the project has consistently picked one.
- Whether `src/` is used or not — if the project has committed to one, do not migrate.
- Feature folders vs type folders — both are valid; do not change the paradigm on the user.
- Files that work fine where they are and have no inbound/outbound import weirdness.

### 3. Propose the plan before executing

Present a dry-run move list to the user and get explicit confirmation before touching anything. Format:

```
Plan:
  mv components/pricing-tier.tsx → app/(marketing)/pricing/_components/pricing-tier.tsx
     (only imported by app/(marketing)/pricing/page.tsx)
  mv components/button.tsx → components/ui/button.tsx
     (primitive; components.json expects ui/ folder)
  [no change] components/site-header.tsx
     (shared across 3 routes — correct location)
Leaving alone:
  components/misc/ — mixed bag, would need per-file decisions. Want to do a second pass?
```

Explicitly name what you're NOT moving and why. This prevents scope creep and lets the user veto specific moves.

### 4. Execute with `git mv`, not `mv`

Always use `git mv` for moves so the file's history is preserved and the diff shows up as a rename rather than a delete+add. If the user is not in a git repo (rare but possible), say so and use plain `mv` with a warning that history is lost.

Move one file at a time, update all its imports, verify the project still typechecks or builds, then move the next. Batch moves that break the build in several places at once are miserable to untangle.

### 5. Update imports consistently

After each move:

- Update every import of the moved file throughout the codebase. Use the project's path alias (not `../../../` relative paths that happen to work).
- Update imports *inside* the moved file if they used relative paths that are now wrong.
- If the file is re-exported from a barrel (`components/index.ts`), update or remove that export as appropriate.

### 6. Verify nothing broke

After each logical group of moves, run the project's typecheck (`tsc --noEmit`, `npm run typecheck`, `pnpm check`, whatever exists) and, if a build script exists, at minimum a syntax-level build. A successful typecheck is a strong signal; an untested reorganization is a liability.

### 7. Report clearly

At the end, give the user:

- The list of moves performed.
- Anything flagged but deliberately not moved, with reasoning.
- Anything that's borderline and deserves a decision later (not now).
- Any imports you touched that went beyond the mechanical path update — if you noticed a circular import or a dubious cross-feature reach, say so but do not fix it in this turn.

## What this skill does not do

- **Does not write new components.** Redirect to nextjs-scaffold-component.
- **Does not extract code from within a file.** Redirect to nextjs-extract-components.
- **Does not rename things for style reasons alone** (e.g., renaming `Header.tsx` → `SiteHeader.tsx` because you like it better). Rename only when the current name is actively misleading or inconsistent with the majority convention in the project.
- **Does not migrate Pages Router to App Router.** That is a much bigger project, not a reorganization.

## Examples

**Clear case**

Project has `components/DashboardSidebar.tsx`, imported only by `app/dashboard/page.tsx` and `app/dashboard/layout.tsx`.
Action: propose `git mv components/DashboardSidebar.tsx app/dashboard/_components/dashboard-sidebar.tsx`, update both import sites to the new alias path, typecheck.

**Push back**

User: "Reorganize my components folder, it's a mess."
Files: 8 components, all used across multiple routes, consistent naming, no stragglers.
Action: report that the folder is actually fine. Ask what specifically bothers them — is it discoverability? Is it the folder being flat with no grouping? Get the real problem before moving anything.

**Partial move with deferred decisions**

User: "Clean up the structure."
Finding: 20 components, 6 are clearly route-specific, 10 are clearly shared, 4 are ambiguous (used in 2 routes under the same section).
Action: move the 6 clear route-specific to `_components/`. Leave the 10 shared where they are. For the 4 ambiguous: list them with their usage sites and ask whether to promote them to shared or colocate under a route group.