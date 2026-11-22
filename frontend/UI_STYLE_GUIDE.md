# SpendWise UI + CSS Style Guide

**Updated** 2026-11-22

**Stylesheet** `frontend/src/index.css`

## Appearance settings

Open **Settings → Appearance** from the sidebar. Preferences apply across SpendWise as you change them and are saved in the current browser. **Reset to defaults** restores the device color mode and clears the saved overrides.

### Light to dark

| Position | Appearance |
|---|---|
| 1 | Brightest light surfaces |
| 2–99 | The shared palette darkens one step at a time |
| 100 | Darkest surfaces |

Drag the slider or use **− / +** to select **Manual** and adjust the whole app immediately. **Light** selects 1, **Dark** selects 100, and **System** tracks the device’s color mode while the page is open. Manual mode remembers its last position. All positions use the same formula, `(position - 1) / 99`. Positions 49, 50, and 51 are ordinary adjacent points in the palette.

Surfaces interpolate in OKLCH. Gamut mapping reduces chroma to keep computed colors within sRGB. Text, focus indicators, financial states, and chart colors have independent contrast rules. Text polarity can change when a surface gets dark enough to require lighter text. The engine applies the foreground and its surface together so an independent color animation cannot leave them out of sync.

### Interface

| Setting | Choices |
|---|---|
| Accent color | Different color on each page, Indigo, Blue, Teal, Rose |
| Interface size | Default, Smaller, Larger |
| Content spacing | Default, Compact, Spacious |
| Corner shape | Default, Sharper, Rounder |
| Shadows | Default, Off, Soft, Strong |
| Motion | Use device setting, Reduce motion |

Appearance uses the same `CustomSelect` as filters and forms. Menus open with a 150 ms fade and 2 px slide from the trigger side and close with a 100 ms fade. The app’s **Reduce motion** setting and the device’s reduced-motion preference minimize the motion.

| File | Responsibility |
|---|---|
| `frontend/src/components/appearance.ts` | Valid options and defaults |
| `frontend/src/components/ThemeControls.tsx` | Quick theme switch and intensity controls |
| `frontend/src/components/themeStore.ts` | Early root initialization, browser persistence, migration, cross-tab synchronization, and System updates |
| `frontend/src/components/themeColors.ts` | HEX conversion, OKLCH interpolation, gamut mapping, and contrast calculations |
| `frontend/src/components/themePalette.ts` | Semantic palette and accent variants for a given slider position |
| `frontend/src/index.css` | Semantic colors, shared component styles, route accents, and appearance overrides |

The theme store writes semantic properties such as `--background`, `--card`, `--control-surface`, `--foreground`, `--income`, and `--expense` to the root. It uses `data-appearance-*` for interface preferences. Public and signed-in layouts use a `page-theme[data-page]` shell to select the route accent. Quick note and calculator render inside that shell. `CustomSelect` portals menus into the nearest themed shell or native dialog so the active accent carries through.

## Page colors and depth

| Page | Default accent |
|---|---|
| Home | Sky blue |
| Login | Fuchsia |
| Register | Cyan |
| Dashboard | Indigo |
| Transactions | Blue |
| Categories | Orange |
| Budgets | Violet |
| Goals | Emerald |
| Recurring | Amber |
| Analytics | Rose |
| Workspace | Teal |
| Profile | Slate |
| Settings | Purple |

An accent glow starts at the top left behind the content and fades across the shell. Cards echo the accent on their leading edge, and layered shadows add depth. The glow strength adapts to the surface at every slider position and uses a short opacity transition where contrast permits. Workspace shares the glow without a looping background. **Shadows → Off** removes the standard card, overlay, sidebar, and button hover drop shadows.

## Reusable styles

| Area | Classes and tokens |
|---|---|
| Layout | `page-container`, `page-title`, `page-description`, and `filter-bar` |
| Cards and overlays | `surface-card`, `stat-card`, and `floating-shadow` |
| Buttons and fields | `button-primary`, `button-secondary`, `form-control`, and `form-error` |
| Dropdowns and filter rows | `CustomSelect` shares the default 40 px control height with date fields, search fields, and filter buttons. Use `field-stack` for labels and `filter-bar` to align the field bottoms and wrap on narrow screens. Options can wrap in the menu, while long trigger values are truncated. Workspace folder suggestions use an editable autocomplete and Theme Intensity uses a disclosure. |
| Tables and statuses | `data-table`, `status-badge`, `status-success`, `status-danger`, and `status-pending` |
| Functional colors | `bg-card`, `text-foreground`, `text-muted-foreground`, `text-income`, `text-expense`, and `text-destructive` |
| Shared date controls | `DateField` and `ReportPeriodField`. Typed values use Save and calendar selections use OK. |
| Save actions | `button-primary button-save` adds a lime treatment. Use a bookmark icon alongside the existing action label. |
| Search and uploads | Use native `type="search"` and `type="file"` inputs. Shared styles add rounded search fields and a gradient file-picker button. |
| Loading | `terminal-status` provides terminal-style feedback for session checks and profile loading. |

Use the semantic tokens when adding a component, particularly for foregrounds, surfaces, focus, shadows, and gaps. Check the component in light and dark modes as well as with a global accent and a changed interface size. Keep `auth-*` classes scoped to authentication screens.

## Original style notes

<details>
<summary>Historical design reference from 2026-11-11</summary>

This archive describes the earlier binary theme, wrappers, route map, and decorative effects. The sections above document the current implementation.

**Source of truth:** `frontend/src/index.css`
**Last updated:** 2026-11-11

This file records **which page uses which theme and which CSS classes**. Update it
whenever you add a page, a component, or a new helper class. The CSS file is the
real code; this guide is the map that makes the code easy to reuse.

---

## 1. Page map (start here)

Every page has ONE theme wrapper. The wrapper sets `--p1` … `--p5`, the background,
the primary button color, the charts, and the glow. Add `fx` for the moving
background. Add `aurora` for the soft floating color blobs.

| Page / route | Theme class | Moving background (`fx`) | Auto button color | Wrapper lives in | Status |
|---|---|---|---|---|---|
| Login `/login` | `page-login` | Waves (own elements, no `fx`) | Blue | `pages/LoginPage.tsx` | New flip card |
| Register `/register` | `page-login` | None (add `fx` if wanted) | Blue | `pages/RegisterPage.tsx` | Old Tailwind card |
| Home `/` | `page-analytics` | Moving grid | Blue | `App.tsx` (inline `Home`) | Placeholder |
| Dashboard `/dashboard` | `page-dashboard` | Rising bubbles | Light green | `components/layout/MainLayout.tsx` | Placeholder |
| Transactions `/transactions` | `page-analytics` | Moving grid | Blue | `MainLayout.tsx` | Real page |
| Categories `/categories` | `page-category` | Moving stripes | Orange | `MainLayout.tsx` | Real page |
| Budgets `/budgets` | `page-goals` | Twinkling stars | Purple | `MainLayout.tsx` | Real page |
| Profile `/profile` | `page-profile` | Spinning rainbow glow | Rainbow | `MainLayout.tsx` | Real page |
| Goals `/goals` | `page-goals` | Twinkling stars | Purple | `MainLayout.tsx` | Real page |
| Recurring `/recurring` | `page-goals` | Twinkling stars | Purple | `MainLayout.tsx` | Real page |
| Analytics `/analytics` | `page-analytics` | Moving grid | Blue | `MainLayout.tsx` | Real page |
| Workspace `/workspace` | `page-workspace` | None (no `.fx` rule, stays calm) | Teal | `MainLayout.tsx` | Real page |

The route → theme map is `pageThemes` in `components/layout/MainLayout.tsx`.
The theme class is on the **shell**, not on `<main>`, so the sidebar links and
navbar use the same page colors.

---

## 2. Theme tokens (use these, never hardcode a hex)

| Token | Meaning | Example use |
|---|---|---|
| `--p1` | Main page color | Primary buttons, active nav |
| `--p2` | Second page color | Gradients, focus glow |
| `--p3` | Third page color | Charts, accents |
| `--p4` | Fourth page color | Charts, accents |
| `--p5` | Fifth page color | Charts, accents |
| `--p1-dark` | Darker main color | Text on soft backgrounds |
| `--on-p1` | Text on `--p1` | Button labels |
| `--p-soft` | Soft tint of the page color | Hover backgrounds |
| `--page-bg` | Page background | Shell background |
| `--grad` | Page gradient | Active nav, hero, progress |
| `--glow` | Shadow color | Cards, buttons |
| `--income` | Money in (green) | `amount-income` |
| `--expense` | Money out (red) | `amount-expense` |
| `--warning` | Warning (amber) | Budget warnings |
| `--card` | Card surface | All cards |
| `--muted` | Muted surface | Tracks, skeletons |
| `--muted-foreground` | Secondary text | Labels, hints |
| `--border` / `--input` | Lines and field borders | Forms |
| `--ring` | Focus ring | Inputs |

Tailwind exposes them as `text-p1`, `bg-p2`, `border-p3`, `text-income`,
`bg-expense`, `text-warning`, etc. (see `@theme inline` in `index.css`).

**Rule:** red (`--expense`, `.btn-3d.red`, `text-destructive`) is for money out
and Delete only. Do not use red for normal actions.

---

## 3. Wrappers and backgrounds

```tsx
// Normal page
<div className="page-wrap aurora page-dashboard"> ... </div>

// Normal page + its own moving background
<div className="page-wrap aurora fx page-dashboard"> ... </div>

// Login page (its own gradient + waves; do NOT add aurora or fx)
<main className="page-wrap page-login auth-screen"> ... </main>

// Inside MainLayout, do NOT add another page-wrap. The shell already has it.
```

| Class | What it does |
|---|---|
| `page-wrap` | `min-height: 100vh`, relative, isolated stacking context |
| `aurora` | Soft colored blobs that drift behind the page |
| `fx` | Adds the per-page moving background (grid, bubbles, stripes, stars, glow) |
| `auth-screen` | Login-only deep-blue animated gradient, centered content |
| `auth-waves` | Login-only 3-layer animated wave at the bottom |

---

## 4. Component catalog

### 4.1 Cards
| Class | Use |
|---|---|
| `glass-card` | Frosted card, best on top of `hero-gradient` |
| `card-lift` | Normal card that lifts on hover |
| `stat-card c1` … `c5` | Stat card with a colored animated top bar |
| `glow-border` | Card with a spinning rainbow border (Profile) |
| `skeleton` | Grey shimmer loading block |

### 4.2 Buttons
| Class | Use |
|---|---|
| `btn-3d` | Page-colored 3D push button (recommended default) |
| `btn-3d blue` / `green` / `orange` / `purple` / `pink` / `gray` / `red` | Fixed color |
| `btn-3d sm` / `lg` / `block` | Sizes / full width |
| `btn-brand` | Gradient button with a light sweep |
| `btn-outline` | Outline button that fills with the page gradient |
| `btn-icon` | Round icon button |

```tsx
<button className="btn-3d">Save</button>
<button className="btn-3d orange lg">Add Category</button>
<button className="btn-3d red sm">Delete</button>
```

### 4.3 Progress and charts
| Class | Use |
|---|---|
| `progress-track` + `progress-fill` | Horizontal bar |
| `progress-fill ok` / `warn` / `danger` | Green / amber / red bar |
| `ring-progress` + `style={{ '--target': 72 }}` | Circular goal ring |
| `bar-grow` + `style={{ '--h': '70%' }}` | Vertical chart bar |

### 4.4 Text, chips and money
| Class | Use |
|---|---|
| `text-gradient` | Animated gradient heading |
| `hero-gradient` | Animated gradient banner |
| `chip chip-1` … `chip-5` | Category chip |
| `amount-income` / `amount-expense` | Money text |
| `pulse-dot` | Live dot |
| `avatar-ring` | Avatar with a spinning rainbow ring |

### 4.5 Forms
| Class | Use |
|---|---|
| `field` | Wrapper for a normal input/textarea/select |
| `auth-group` | Login form field wrapper |
| `auth-label` | Login form label |
| `auth-input` | Login form input |
| `auth-input--password` | Extra right padding for the eye button |
| `auth-eye` | Show/hide password button |
| `auth-check` + `auth-icon` | Custom checkbox |
| `auth-error` | Red error text under a field |

### 4.6 Login page only
| Class | Use |
|---|---|
| `auth-screen` | Full-screen blue gradient |
| `auth-waves` + 3 `<span>` | Moving waves |
| `auth-wrap` | Glass card |
| `auth-html` | Inner padded area |
| `auth-radio` + `auth-in` / `auth-up` | Hidden radio state for the tabs |
| `auth-tab` | Clickable tab label |
| `auth-form` | 3D flip container |
| `auth-pane` + `auth-pane-in` / `auth-pane-up` | The two form panes |
| `auth-hr` | Divider |
| `auth-foot` | Footer row |

### 4.7 Loaders
| Class | Use |
|---|---|
| `spinner-loader` + 12 × `spinner-item` | Page-colored 12-bar spinner (80px) |
| `spinner-loader spinner-loader--sm` | 20px spinner for buttons |
| `spinner-loader--on-color` | Makes the button spinner use the button's text color |
| `wave-loader` + 5 × `wave-bar` | Wave loader |

### 4.8 Navigation and extras
| Class | Use |
|---|---|
| `nav-link` | Sidebar link in the page color |
| `nav-link active` | Current page, filled with the page gradient |
| `quick-actions` | Floating Quick Note / Calculator stack; respects safe-area insets |
| `search-box` + `search-input` | Search field |
| `theme-switch` | 3D light/dark switch (CSS only; not wired yet) |
| `float-shape` | Floating colored circle |
| `fade-up` | Fade + rise entrance |
| `stagger` | Children appear one by one |
| `pop-in` | Bounce-in |
| `slide-in` | Slide from the left |

---

## 5. What each page uses right now

### Login — `pages/LoginPage.tsx`
- Wrapper: `page-wrap page-login auth-screen`
- Background: `.auth-waves` (3 spans), no `aurora`/`fx`
- Card: `auth-wrap` → `auth-html` → tabs → `auth-form` → two `auth-pane`s
- Fields: `auth-group`, `auth-label`, `auth-input`, `auth-input--password`, `auth-eye`
- Checkbox: `auth-check` + `auth-icon` (visual only for now)
- Buttons: `btn-3d block` + `spinner-loader spinner-loader--sm spinner-loader--on-color`
- Errors: `auth-error`
- Footer: `auth-hr` + `auth-foot`
- Tabs are CSS-only (hidden radio + `:checked` + sibling selectors)

### Register — `pages/RegisterPage.tsx`
- Wrapper: `page-wrap aurora page-login`
- Card: old Tailwind card (`rounded-2xl border bg-card p-8 shadow-lg`)
- Not yet migrated to the `auth-*` classes. If you want the same look as Login,
  copy the `auth-wrap` structure or link the Sign Up tab to this page.

### Shell — `components/layout/MainLayout.tsx`
- Wrapper: `page-wrap aurora fx ${pageTheme}`
- Sidebar links: `nav-link` + `active`
- Brand badge / avatar: `bg-primary` (follows the page theme)
- Header: `bg-background/80` (follows the page theme)
- Content: plain `<main className="flex-1 p-4 md:p-6">`
- Routes are code-split with `React.lazy`; keep new pages lazy in `App.tsx` so the entry bundle stays small.
- Mobile drawer: closes on link tap or Escape, locks page scroll, caps at `85vw`, and returns focus to the menu button.
- The shell uses `min-h-dvh` and safe-area padding so mobile browser chrome does not clip the page.

### Home — `App.tsx`
- Wrapper: `page-wrap aurora fx page-analytics`
- Placeholder content only.

### Dashboard — `App.tsx`
- Content only. The shell supplies `page-dashboard` and the bubbles.
- Do not add another `page-wrap` here.

### Goals — `pages/GoalsPage.tsx`
- Content only. The shell supplies `page-goals` and the stars.
- Stats: `stat-card c1..c4`; goal cards: `card-lift`
- Progress: `ring-progress` (inline `--target`) + `progress-track` / `progress-fill`
- Chart: `components/charts/GoalProgressChart.tsx` (percent bars, 100% dashed line)
- Main actions: `btn-3d sm`; the form reuses the same input classes as Budgets

### Workspace — `pages/WorkspacePage.tsx`
- Content only. The shell supplies `page-workspace` (teal + indigo).
- No `.page-workspace.fx::after` rule exists, so the shell's `fx` class adds no
  moving background. This is intentional: the writing page stays calm.
- Layout: `features/workspace/components/WorkspaceSidebar` + `NotesGrid` +
  `NoteEditor`. It collapses to one panel on mobile.
- Cards: `NoteCard` uses `card` + `border-border`; the color label uses
  `bg-p1..p5` from the note color map.
- Search/filters: `NoteSearch`, `NoteFilters`.
- Overlays: `QuickNoteDialog` and `CalculatorPanel` (both also mounted globally
  through `components/layout/GlobalQuickActions.tsx`).
- The editor auto-saves 800 ms after typing stops. Calculator history is kept
  in `localStorage`, not the backend.

### Recurring — `pages/RecurringPage.tsx`
- Content only. The shell supplies `page-goals` and the stars.
- Stats: `stat-card c1..c4`; rules: `features/recurring/components/RecurringCard.tsx`
  (`card-lift`), form: `RecurringForm.tsx` (same input classes as Budgets/Goals).
- Amount uses `amount-income` / `amount-expense`; the category badge tints
  itself from the category's own `color` field (not a fixed hex).
- Pause/resume and delete are icon buttons on the card; delete is the only red one.
- `isActive` is sent to the API as `'true'` / `'false'` text, never a boolean.

### Transactions / Categories / Budgets / Profile
- Content only. The shell supplies the theme.
- They currently use Tailwind utilities. The helper classes in section 4 are
  available when you want the extra animation or the page-colored look.

---

## 6. Rules

1. **One theme class per page.** Never mix `page-dashboard` and `page-goals`.
2. **No hardcoded colors in components.** Use tokens or the helper classes.
3. **No `page-wrap` inside MainLayout.** The shell already has it.
4. **No `aurora`/`fx` on the login page.** It has `auth-screen` and waves.
5. **Red = money out or Delete.** Use `btn-3d red` only for destructive actions.
6. **Keep dark mode working.** Use `bg-card`, `text-foreground`,
   `text-muted-foreground`, `border-border`; never `bg-white` or `text-black`.
7. **Add `fx` only when you want the moving background.** It is optional.
8. **Respect reduced motion.** The CSS already disables animations for users who
   ask for it in their OS settings.

---

## 7. How to add a new page

1. Create the page component. Return **content only**, not a `page-wrap`.
2. Add the route in `App.tsx` inside `<Route element={<MainLayout />}>`.
3. Add the route to `pageThemes` in `MainLayout.tsx`:
   ```ts
   '/reports': 'page-analytics',
   ```
4. Pick the theme from the page map. Add `fx` only if you want the moving
   background (it is already on the shell, so every page gets its own).
5. Reuse the helper classes from section 4. If you need a new class, add it to
   `index.css` with a comment and update this guide.
6. Run `npm run build` and `npm run lint`.

---

## 8. Dark mode

- The `.dark` class on a parent switches every token.
- Page themes also have `.dark .page-*` overrides for their backgrounds, cards,
  and primary buttons.
- The `theme-switch` component is styled but **not wired** to a toggle yet.
  To wire it, add/remove `document.documentElement.classList.toggle('dark')`
  and store the choice in `localStorage`.
- Never use a fixed light-only color inside a component.

---

## 9. Known gaps / next steps

- [ ] Register page still uses the old card, not `auth-*`.
- [ ] `theme-switch` is not connected to dark mode.
- [ ] "Keep me signed in" is visual only; the backend always issues the same
      7-day refresh cookie.
- [ ] "Forgot Password?" only shows a placeholder message; there is no reset flow yet.
- [ ] Pages still use Tailwind utilities; migrate them to the helper classes
      gradually (cards, buttons, progress).
- [ ] The login page has both Sign In and Sign Up tabs. The separate `/register`
      route still exists; decide later whether to keep both or redirect one.
- [ ] Visual check in the browser is still pending.

---

## 10. Update checklist

When you change UI code, update this file too:

- [ ] New page? Add a row to the page map (section 1).
- [ ] New class? Add it to the component catalog (section 4).
- [ ] Changed a page's wrapper? Update section 5.
- [ ] New theme token? Add it to section 2.
- [ ] Fixed a known gap? Tick it in section 9.
- [ ] Update the "Last updated" date at the top.

</details>
