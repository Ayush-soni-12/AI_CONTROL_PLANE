# DESIGN.md — NeuralControl

Source of truth for all UI work. If a default, a skill, or a habit conflicts with this file, this file wins.

## 1. Feel

A calm, precise developer tool. Think Linear or Vercel dashboards: flat dark surfaces, thin borders, plain text, almost no decoration. The information is the decoration. If an element does not help the reader understand or act, remove it.

## 2. Color

Use only these tokens. No raw hex values in components.

```css
:root {
  --bg: #09090b;          /* page */
  --surface: #111113;     /* cards */
  --surface-2: #18181b;   /* hover, nested areas */
  --border: #27272a;
  --border-strong: #3f3f46;
  --text: #fafafa;
  --muted: #a1a1aa;
  --subtle: #71717a;
  --accent: #22c55e;      /* the ONLY accent: healthy / active / one highlight */
  --accent-hover: #4ade80;

  /* Status colors: architecture diagram and status badges only, always with a legend or label */
  --queue: #f59e0b;
  --ai: #a78bfa;
  --danger: #ef4444;
}
```

Rules:
- Text is white or gray. Never colored text inside a paragraph.
- Green is for: active/healthy status, focus rings, and at most one highlighted item per section (for example the "Most popular" pricing card border). Never decoration.
- Queue, AI and danger colors appear only in the architecture diagram and status badges. Never on marketing cards, stats or pricing.
- Solid fills only. No gradients anywhere.

## 3. Typography

- Sans font (the current one) for headings and body. Mono only for code, commands, metric labels and tags.
- Headings: solid white, semibold, tight tracking. Never gradient or multi-color text. No highlighted word.
- Minimum text size is 12px. Body is 14–16px. Secondary text uses `--muted`, not reduced opacity.
- At most 3 text sizes per section.

## 4. Layout

- 4px spacing grid. Section padding: 96px vertical on desktop, 64px on mobile. Content max-width 1152px, centered.
- Radius: 8px for cards, 6px for buttons, inputs and badges. Full pill only for badges and tags.
- Depth comes from 1px borders, not shadows. No box-shadow except popovers and modals (one neutral shadow).
- Cards: `--surface` background, 1px `--border`. No tinted backgrounds, no corner brackets.

## 5. Components

**Buttons**
- Primary: solid white background (`--text`), black text. Secondary: transparent, 1px `--border-strong`, white text.
- One primary button per view. Same style everywhere: hero, pricing, final CTA.
- Hover: primary becomes `#e4e4e7`; secondary gets `--surface-2` background. 150ms.

**Badges and pills**: 1px border, transparent background, mono 12px, `--muted` text. A status dot may use `--accent`.

**Stat cards**: number in white, label in `--muted`. All four styled identically. Green only on a number that means "healthy" (for example uptime), and that is optional.

**Pricing**: three equal cards with the same border. The recommended plan gets a 1px `--accent` border and a small "Most popular" badge. Recommended plan button is primary; the others are secondary.

**Architecture diagram**: nodes use `--surface` and `--border`. Node colors come only from the status legend. It must fit its container with no clipping; on small screens it scrolls horizontally instead of cutting off. Labels are at least 12px.

**Icons**: Lucide, 1.5 stroke, `--muted` by default. No emoji as icons.

**Commands and inline code**: `--surface-2` background, mono, with a visible copy button. Wrap or scroll; never silently truncate.

## 6. Motion and hover

- Hover changes only border color, background shade or text color. Never move, scale, lift or glow.
- Entrance: fade plus at most 8px translate, once, 200–300ms. No looping, floating or shimmer animations. One pulsing status dot is allowed.
- Respect `prefers-reduced-motion`.
- Framer Motion and GSAP are for entrance effects and diagram data flow only.

## 7. Banned

- Any gradient: background, text, border, button or glow (`bg-gradient-*`, `from-` / `via-` / `to-`, `bg-clip-text`, `linear-gradient`, `radial-gradient`)
- Glow or colored shadows, `blur-3xl` blobs, glassmorphism (`backdrop-blur` cards)
- Sparkles, stars, light streaks. A background grid is allowed only at 4% opacity or lower.
- Corner brackets, neon borders, animated borders
- A different accent color per card
- Colored words in headings or paragraphs
- Hover lift or scale, infinite animations
- Emoji icons
- Adding sections, features or copy that were not requested

## 8. How to work (for the agent)

1. Read this file before touching any UI. Use the frontend-design skill for layout and typography quality, but this file overrides its aesthetic choices.
2. Work on one section or component at a time. After each, list what changed and why (before → after), then stop for review.
3. Use only the tokens above. If a token is missing, ask. Do not invent a color.
4. Restyle only. Do not add features, sections or new copy.
5. Before finishing each section, run this and fix every hit that is not explicitly allowed here:
   ```
   grep -rnE "gradient|bg-clip-text|backdrop-blur|blur-(2xl|3xl)|drop-shadow|hover:(scale|-translate)" --include=*.tsx --include=*.css --exclude-dir=node_modules --exclude-dir=.next .
   ```
6. If a browser or Playwright MCP is available, screenshot at 1440px and 390px wide and check: nothing clipped, no text under 12px, only one accent color visible, the same primary button everywhere.

## 9. Restyle order (NeuralControl)

1. Tokens and page background (remove sparkles and streaks)
2. Nav and hero (solid white headline, plain gray paragraph, one primary button)
3. Stat cards
4. Architecture section (fix the clipped diagram, the cut-off "Active Protections" row, and the missing space in "Mode: In-Process / Read Full Architecture Guide")
5. Features section
6. Pricing
7. Final CTA and footer