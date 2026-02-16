# AGENTS.md - Coding Guidelines for Journalist

## Project Overview

Journalist is a personal journaling app with:

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL + Pydantic
- **Infrastructure**: Kubernetes (Kind) + Helm + Docker

---

## Design Philosophy (Todoist-Inspired)

### Core Principles

1. **Clarity over cleverness** - Simple, obvious interactions
2. **Content-first** - UI should fade into the background
3. **Breathing room** - Generous whitespace and padding
4. **Subtle affordances** - Hover states, not heavy borders
5. **Natural language** - "Today", "Yesterday" instead of ISO dates
6. **Progressive disclosure** - Show what matters, hide complexity

### Visual Design Rules

**Layout:**

- Max content width: `max-w-4xl` (1024px)
- Consistent padding: `px-8 py-8` for main content areas
- Collapsible sidebar: 64px collapsed, 256px expanded (`w-16` / `w-64`)
- Use flexbox for layout, grid sparingly

**Spacing:**

- Section spacing: `space-y-6` or `space-y-8`
- Card/item spacing: `space-y-4` internally, `gap-4` between
- Button height: `h-14` for primary actions, `h-9` for secondary
- Generous click targets (min 44x44px)

**Typography:**

- Headlines: `text-4xl font-bold` (Today heading)
- Subheadings: `text-lg font-semibold` (Entry titles)
- Body: `text-base` (default)
- Metadata: `text-sm text-muted-foreground`
- Use system font stack (Geist Sans)

**Colors:**

- Primary action: `bg-primary` (red accent)
- Muted text: `text-muted-foreground`
- Borders: `border-border` (subtle, not prominent)
- Hover: `hover:bg-accent/50` (subtle background change)
- Focus points/tags: `bg-secondary text-secondary-foreground`

**Interactive Elements:**

- Buttons: Use `variant="outline"` for large add buttons
- Hover states: Subtle background changes, no heavy shadows
- Focus states: Use built-in shadcn focus rings
- Transitions: `transition-colors` or `transition-all duration-200`
- Avoid heavy shadows (use `shadow-xs` or `shadow-sm` max)

**Components:**

- Use shadcn/ui components, never build from scratch
- Dialogs: `sm:max-w-[600px]` for forms
- Separators: Use `<Separator />` for visual breaks
- Empty states: Center-aligned with icon, heading, CTA button

### Component Patterns

**Entry List:**

```tsx
<div className="group hover:bg-accent/50 -mx-4 px-4 py-4 rounded-lg transition-colors cursor-pointer">
  {/* Negative margin + padding creates full-width hover without layout shift */}
</div>
```

**Date Headers:**

```tsx
<div className="mb-4">
  <h2 className="text-sm font-semibold text-muted-foreground">Today</h2>
  <Separator className="mt-2" />
</div>
```

**Focus Point Badges:**

```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground capitalize">
  {focusPoint.name}
</span>
```

**Large Action Buttons:**

```tsx
<Button
  size="lg"
  className="w-full justify-start text-left font-normal h-14 text-base"
  variant="outline"
>
  <Plus className="mr-3 h-5 w-5" />
  Add entry
</Button>
```

### Avoid These Patterns

- ❌ Bright colors or gradients (except red accent)
- ❌ Heavy drop shadows or elevation
- ❌ Aggressive animations or transitions
- ❌ Dense, cramped layouts
- ❌ Underlined links in body text
- ❌ Multiple borders on nested elements
- ❌ Explicit "Loading..." text without spinner context
- ❌ ISO date formats in UI (use natural language)

### When Adding Features

1. Check if shadcn/ui has a component first
2. Use `<Dialog>` for forms, never full-page routes
3. Add keyboard shortcuts for power users (Cmd+K patterns)
4. Support both light and dark modes
5. Keep sidebar navigation shallow (max 2 levels)
6. Use focus points for organization, not folders

---

## Build & Development Commands

### Frontend

```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server on port 3001
npm run build        # Production build
npm run lint         # Run ESLint
npm run start        # Start production server on port 3001
```

### Backend

```bash
cd backend
pip install -r requirements.txt   # Install dependencies
uvicorn main:app --reload --port 8001   # Start dev server
```

### Full Stack (Docker/Kubernetes)

```bash
make init            # First-time setup (creates cluster + deploys)
make dev             # Build, load images, and deploy
make port-forward    # Forward ports to localhost
make logs            # View backend logs
make logs-frontend   # View frontend logs
make status          # Check Kubernetes status
make clean           # Remove deployment (keeps cluster)
make destroy         # Destroy entire cluster
```

### Testing

- No test suite currently configured
- Add tests with pytest (backend) or Vitest/Jest (frontend) when needed

---

## Code Style Guidelines

### TypeScript (Frontend)

**Imports:**

- React/Next imports first
- Third-party libraries second (group related packages)
- Local aliases last (`@/components`, `@/lib`, `@/hooks`)
- Use `@/` path aliases for all local imports

**Formatting:**

- Use single quotes for strings
- No semicolons (enforced by Next.js ESLint config)
- 2-space indentation
- Max line length: 80-100 characters
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes

**Types:**

- Use explicit types for function props and returns
- Prefer interfaces over type aliases for objects
- Use `React.ComponentProps` for component prop extensions

**Components:**

- Use Server Components by default (Next.js 19)
- Mark Client Components with `"use client"` when needed
- Use shadcn/ui patterns: cva for variants, Slot.Root for asChild
- Lucide icons from `lucide-react`

**Naming:**

- PascalCase for components, interfaces, types
- camelCase for functions, variables, hooks
- SCREAMING_SNAKE_CASE for constants

### Python (Backend)

**Imports:**

- Standard library first
- Third-party packages second
- Local modules last

**Formatting:**

- 4-space indentation
- Line length: 88 characters (Black default)
- Two blank lines between top-level functions/classes
- One blank line between methods

**Types:**

- Use type hints for all function parameters and returns
- Use `typing.List`, `Optional`, etc. for Python < 3.9 compatibility
- Pydantic v2 models for request/response schemas

**Architecture:**

- Separate concerns: `models.py` (DB), `schemas.py` (API), `crud.py` (operations)
- Use FastAPI dependency injection with `get_db()`
- Raise `HTTPException` for error responses
- Use SQLAlchemy 2.0 style (no Query class)

**Naming:**

- snake_case for functions, variables, modules
- PascalCase for classes
- UPPER_CASE for constants

---

## UI/Styling Guidelines

- Use shadcn/ui components from `@/components/ui`
- Style with Tailwind CSS utility classes
- Use CSS variables for theming (in `globals.css`)
- Dark mode support via `next-themes`
- Follow shadcn "New York" style conventions

---

## Error Handling

**Frontend:**

- Use try/catch for async operations
- Display user-friendly error messages
- Use form validation with Zod + react-hook-form

**Backend:**

- Raise `HTTPException` with appropriate status codes
- Use 404 for "not found", 400 for bad requests, 422 for validation errors
- Database errors bubble up as 500s

---

## Git Workflow

- Write clear commit messages explaining "why" not "what"
- Do not commit secrets (`.env.local`, credentials)
- Do not commit unless explicitly asked
- Run `npm run lint` before committing frontend changes
