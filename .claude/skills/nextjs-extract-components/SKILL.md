---
name: nextjs-extract-components
description: Extract reusable components from existing bloated Next.js pages, layouts, or components. Use whenever the user wants to "clean up", "refactor", "break apart", "split", "extract", "pull out", or "make reusable" something in an existing .tsx/.jsx file — especially when a page.tsx, layout.tsx, or route file has grown long, repeats Tailwind class patterns, mixes server and client concerns, or contains inline logic that belongs in a hook. Also trigger when the user complains a file is "too long", "messy", "hard to read", "has too much going on", or says "this should be its own component". This skill is about REFACTORING EXISTING CODE ONLY — do NOT use for creating new components from scratch (use nextjs-scaffold-component for that) or for moving/reorganizing already-extracted files (use nextjs-organize-files).
---

# nextjs-extract-components

Refactor overgrown Next.js files into focused, reusable pieces without breaking the App Router's server/client boundaries or creating needless abstractions.

The job is not to shuffle code until it looks cleaner. The job is to identify real units of reuse and responsibility and extract them so the next person (often the same user in two weeks) is faster, not slower.

## When to extract, and when to refuse

Before touching anything, decide whether extraction is warranted. Over-componentization is as bad as under-componentization — a project full of one-off `<CardHeaderWithIcon />` components used in exactly one place is worse than inline JSX.

Extract when at least one of these is true:

- The same JSX + Tailwind pattern appears **3 or more times** in the file or across sibling files.
- A self-contained chunk of JSX is **40+ lines** and has a clear single-sentence name ("a pricing card", "a comment thread item", "the hero section").
- A block carries its own state, effects, or event handlers that are not used elsewhere in the parent.
- The file mixes server-rendered content with interactive `"use client"` islands and the interactive parts can be isolated (this is often the highest-value extraction — it can shrink the client bundle significantly).
- A piece of logic (form state, derived values, a data-fetching pattern) is reused or obviously reusable.

Push back and refuse to extract when:

- The pattern appears twice but the two usages are likely to diverge — that's premature abstraction.
- The proposed component would need 8+ props just to parameterize trivial differences — it's not really the same thing.
- The chunk is tightly coupled to parent state via many closures — extraction just moves the coupling into a long prop list.
- The user asked to "clean up" but the file is under ~150 lines and already readable. Say so and don't manufacture work.

When refusing, say which specific signal is missing. Don't hedge.

## Workflow

### 1. Map the file before touching it

Read the whole file and internally list:

- Top-level JSX sections (what does each visually represent?)
- Repeated class-name patterns or JSX shapes
- State, effects, refs, event handlers — which belong together?
- Presence of `"use client"`, and which parts genuinely need client vs. which are client by accident
- Data fetching: Server Component, route handler, client `useEffect`, or server action?
- Route segment exports (`metadata`, `generateMetadata`, `revalidate`, `dynamic`) — these must stay in `page.tsx`/`layout.tsx`
- Imports that hint at project conventions (`@/components/ui/...`, `~/lib/...`, `cn()`, etc.)

If project structure is unclear, run `ls` on `app/`, `components/`, `lib/` (or their `src/` equivalents) before deciding where extracted files go. Check `tsconfig.json` for the path alias. Do not guess.

### 2. Preserve server/client boundaries — the #1 footgun

- Server Components can render Client Components, not the other way around.
- `"use client"` makes the file and its entire import subtree client-side. Extracting a large chunk and slapping `"use client"` on it silently converts a server subtree into a client one and bloats the JS bundle.
- `async` Server Components cannot be imported into Client Components — the build will break.
- Hooks (`useState`, `useEffect`, `useContext`) and DOM event handlers (`onClick`, `onChange`) require `"use client"`.

**Rule of thumb**: extract interactive leaves as Client Components; keep their containers as Server Components; pass server-fetched data down as props. If you find yourself adding `"use client"` to a parent just so a small interactive piece works, the interactive piece should be its own client component instead.

When the refactor converts a fully-client page into server-by-default with client islands, mention the bundle-size win in the summary.

### 3. Extract from leaves inward

1. Pure presentational chunks first (card, badge, stat tile) — safest.
2. Stateful interactive pieces next (dropdown, form field group).
3. Custom hooks last — only after seeing the state in the extracted components and confirming the logic is genuinely worth isolating.
4. Do not touch data fetching unless asked. Moving fetches changes runtime behavior (caching, streaming, waterfalls) and is not "just refactoring."

After each extraction, the original file should still compile and behave identically. Run `tsc --noEmit` or the project's typecheck between steps when practical.

### 4. Match project conventions exactly

- **Path alias**: `@/components`, `~/components`, or relative — check `tsconfig.json`.
- **File naming**: `PascalCase.tsx` vs `kebab-case.tsx` (shadcn style) — match what's already there.
- **Folder layout**: colocate with `app/feature/_components/` for route-specific pieces; use top-level `components/` for shared. The `_folder` convention is idiomatic in App Router and preferred over polluting the top-level directory with route-specific components.
- **Styling utility**: if the project uses `cn()` from `@/lib/utils`, use it. If it uses `clsx` directly, match that. Don't introduce a new utility.
- **Primitives library**: if shadcn/ui, Radix, or HeadlessUI are present, compose them instead of hand-rolling primitives.

### 5. Name components for what they are

Good: `PricingCard`, `CommentThreadItem`, `SearchFilterBar`, `UserAvatar`.

Bad: `HomePageSection2`, `DashboardThingy`, `Wrapper`, `Container`, `MainContent`.

If a good name does not surface within a few seconds, the extraction boundary is probably wrong. Reconsider before committing.

### 6. Type props honestly

- Define a `Props` type for every extracted component.
- Use literal unions for variant props (`variant: "primary" | "secondary" | "ghost"`), not `string`.
- Optional props use `?:`, not required-with-undefined.
- When wrapping a native element, extend `ComponentPropsWithoutRef<"button">` (or appropriate) so callers can pass through native attributes without re-declaring them.
- Don't add props "just in case." Every prop needs a current caller.

### 7. Mind the App Router gotchas

- **Images**: use `next/image` unless the project has explicitly opted out. Preserve `priority`, `sizes`, `alt`.
- **Links**: `next/link` for internal nav, not `<a>`.
- **Route segment config**: `metadata`, `generateMetadata`, `revalidate`, `dynamic`, etc. must stay in `page.tsx`/`layout.tsx`.
- **`params` and `searchParams`** (Next 15+): these are Promises. The `await` stays in the page-level Server Component; extracted children receive resolved values as props.
- **Server actions (`'use server'`)**: can live in separate files, but the directive must be at the top of the file or the function. Moving a server action into a client-component file breaks it.

### 8. Report honestly

After the refactor, tell the user:

- What was extracted and where it lives.
- What you noticed but deliberately did NOT extract, and why.
- What's outside scope but worth flagging (e.g., "this fetches in a client `useEffect` — could be a Server Component fetch if you want me to tackle it separately").

Users often ask for "clean this up" and mean "fix everything you see." Distinguishing what you did from what you saw lets them direct the next step.

## Examples

**Extraction warranted**

`app/pricing/page.tsx`, 320 lines, three pricing tier blocks with near-identical structure differing only in title, price, and feature list.
Action: extract `PricingTier` to `app/pricing/_components/pricing-tier.tsx` with props `{ name, price, features, highlighted?, ctaLabel }`. Parent becomes ~80 lines rendering three `<PricingTier />` from an array.

**Refusal**

`app/dashboard/page.tsx`, 140 lines, one `<h1>`, one chart, one table. User says "break this into components."
Action: push back. File is already readable. Chart and table are presumably already their own components. Ask what specifically feels wrong.

**Server/client boundary fix (highest-value case)**

`app/blog/[slug]/page.tsx` is `"use client"` so a `<LikeButton />` can use `useState`. The entire page including MDX rendering ships to the client.
Action: remove `"use client"` from the page. Extract `LikeButton` into its own `"use client"` file. Page becomes a Server Component again; only the button ships interactivity. Mention the bundle-size win.