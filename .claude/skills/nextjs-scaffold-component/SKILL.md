---
name: nextjs-scaffold-component
description: Create a new component from scratch in a Next.js project, placed in the right location with the right conventions. Use when the user asks to "create", "add", "make", "scaffold", "build", "generate", or "write" a new component, hook, or server action that does NOT yet exist in the codebase. Also trigger for requests like "I need a X component", "give me a Button/Card/Modal", or "start a new [thing]". This skill is for GREENFIELD CREATION ONLY — do NOT use when the user wants to pull existing code out of a bloated file (use nextjs-extract-components) or when reorganizing files that already exist (use nextjs-organize-files). If the user is unclear whether they want creation or extraction, ask.
---

# nextjs-scaffold-component

Create new Next.js components, hooks, and server actions that fit the project's conventions on first try — correct folder, correct naming, correct server/client designation, correct types — so the user does not have to move or fix the file afterward.

The goal is not to drop a file with default boilerplate. The goal is to produce a file that looks like it was written by whoever wrote the rest of the codebase.

## Workflow

### 1. Before writing anything, learn the project

A new component written against the wrong conventions is worse than no component — the user has to rewrite it. Spend 30 seconds gathering:

- **Path alias**: read `tsconfig.json` `compilerOptions.paths`. Common: `@/*` → `./src/*` or `./`.
- **Existing components folder**: `ls components/`, `ls src/components/`, `ls app/` for `_components/` directories. Identify the pattern.
- **Naming convention**: look at 2–3 existing component files. `PascalCase.tsx` or `kebab-case.tsx`? Is the component name inside the file exported as default or named?
- **Styling**: Tailwind? CSS Modules? styled-components? If Tailwind, is there a `cn()` utility in `lib/utils.ts`? Is `class-variance-authority` (cva) used for variants? Is shadcn/ui installed (check `components.json` or `components/ui/`)?
- **TypeScript stance**: are props typed with `type`, `interface`, or inline? Are props spread into native elements via `ComponentPropsWithoutRef`?
- **React version and Next.js version**: check `package.json`. Affects whether to use the `use` hook, async Server Components, Next 15+ Promise `params`, etc.

If any of this is genuinely ambiguous (e.g., no existing components yet), ask the user rather than guessing. One question now saves a rewrite later.

### 2. Decide: Server Component or Client Component

Default to **Server Component** (no `"use client"` directive). Only mark `"use client"` when the component uses at least one of:

- React hooks (`useState`, `useEffect`, `useRef`, `useContext`, `useReducer`, custom hooks that use these)
- DOM event handlers (`onClick`, `onChange`, `onSubmit`, etc.)
- Browser-only APIs (`window`, `document`, `localStorage`, `navigator`)
- Third-party components that themselves require client (most animation libs, Framer Motion, etc.)

Presentational components — even ones that "look interactive" like a static Button without an onClick — should be Server Components. The parent decides whether to pass an `onClick`; if it does, the parent is the client component, not the button.

**Common mistakes to avoid**:

- Adding `"use client"` "just in case it might need state later." Add it when it needs state.
- Writing `async function MyComponent()` and also marking `"use client"` — async components are server-only.
- Making a wrapper a Client Component just to hold one interactive child. Make the child the client component instead.

### 3. Decide where the file lives

- **Used only within one route**: colocate at `app/[route]/_components/component-name.tsx`. The `_` prefix opts the folder out of routing. This is the App Router-idiomatic choice for route-specific pieces.
- **Shared across routes**: `components/component-name.tsx` (or `src/components/...`).
- **Design system primitive** (Button, Input, Card, Dialog): `components/ui/component-name.tsx` if the project has a `ui/` folder (almost always the case with shadcn).
- **Custom hook**: `hooks/use-thing.ts` or `lib/hooks/use-thing.ts` — check which the project uses. Hooks must start with `use`.
- **Server action**: `app/[route]/actions.ts` for route-specific, or `lib/actions/...` for shared. Top of file: `'use server'`.
- **Utility function**: `lib/utils.ts` if it's tiny, its own file in `lib/` if it's substantive.

If the project already has a different structure (e.g., feature folders: `features/billing/components/...`), match that instead. Convention > dogma.

### 4. Write the file

**Shape the component to do one thing.** Avoid god-components that handle layout + data + interactivity. If the request implies multiple concerns, write multiple files and compose them.

**Props**:

- Type with `type Props = { ... }` or `interface Props { ... }` — match project style.
- Use literal unions for variants (`variant: "primary" | "secondary"`), not `string`.
- Optional with `?:`, not `T | undefined` on required props.
- Provide sensible defaults with destructuring: `{ variant = "primary" }`.
- When the component wraps a native element, extend `ComponentPropsWithoutRef<"button">` so consumers can pass `aria-*`, `disabled`, `type`, etc. through without re-declaration.

**Styling**:

- If Tailwind + `cn()`: compose classes with `cn("base-classes", conditional && "extra", className)` and accept `className` as a prop for composability.
- If shadcn/cva is used: write a `cva(...)` call for variants instead of ad-hoc conditionals.
- Do not introduce a new styling approach. If the project uses CSS modules, keep using CSS modules.

**Imports**:

- Use the project's path alias.
- Prefer `next/image` over `<img>`, `next/link` over `<a>` for internal nav.
- Import types with `import type { ... }` when the project uses that convention.

**Export**:

- If other components in the same folder use `export default`, match that.
- If they use named exports (typical for shadcn-style libraries that export multiple pieces from one file), match that.

### 5. Provide a minimal, truthful usage example

After creating the file, show the user one realistic usage snippet. Not ten variants. Not a full page. One call site that reflects how they'll actually use it. If it's a client component that must be used inside a server component, show that boundary in the example.

### 6. Do not scaffold things that don't need scaffolding

If the user asks for something the ecosystem already provides well — a Button, a Dialog, a Dropdown — and the project has shadcn/ui or Radix installed, suggest the existing primitive first. Writing a new `<Button>` from scratch in a project that already has `components/ui/button.tsx` is noise.

Similarly, if they ask for something trivial like "a div that centers its children" — that's a class, not a component. Say so.

### 7. Stay out of adjacent concerns

Scaffolding is creation, not refactoring and not reorganization. If while scaffolding you notice the target folder is a mess, or that the user's existing component is bloated, mention it briefly at the end but do not start fixing it in the same turn. Separate turns, separate concerns.

## Examples

**Good scaffold request, straightforward**

User: "Create a PricingCard component I can reuse on the marketing site."
Action: Check project → shadcn + Tailwind + `cn()` + `components/` for shared. Write `components/pricing-card.tsx` as a Server Component with typed props (`name`, `price`, `features: string[]`, `highlighted?: boolean`, `ctaHref`, `ctaLabel`, `className?`). Use existing `Button` from `components/ui/button.tsx`. Show one usage example.

**Scaffold request that should be redirected**

User: "Make me a Button component."
Action: Check project → `components/ui/button.tsx` already exists (shadcn). Point this out, show how to use it, offer to extend it with a new variant if that's the real need.

**Scaffold request that needs clarification**

User: "I need a Modal."
Action: Ask — is this for one specific place (colocate) or project-wide (design system)? Does the project already have Radix Dialog or similar installed? A Modal wrapper around an existing primitive is a different file than a from-scratch focus-trapping dialog.