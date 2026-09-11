# Relay — Brand Guidelines

## Logo
Grayscale pixel/checkerboard grid mark — represents connected nodes & automation flow.

- **Primary (dark mode):** gray mark as-is, transparent bg
- **Light mode:** use `#1A1A1A` (black) variant for contrast
- Min clear space: 1x mark height on all sides
- Don't recolor the mark to the accent blue — keep it neutral, let the accent live in UI only

## Colors

Light theme is default. Dark theme is an option (toggle), not primary.

| Token | Hex | Use |
|---|---|---|
| `--relay-black` | `#1A1A1A` | Primary text (light mode), dark logo variant |
| `--relay-gray` | `#545454` | Logo, secondary text/icons |
| `--relay-light` | `#E8E8E8` | Borders, dividers (light mode) |
| `--relay-white` | `#FFFFFF` | Base background (light mode) |
| `--relay-accent` | `#F97316` | CTAs, links, active states — primary brand color |
| `--relay-success` | `#22C55E` | Completed automation runs |
| `--relay-error` | `#EF4444` | Failed runs / alerts |

### Dark theme overrides

| Token | Hex | Use |
|---|---|---|
| `--relay-bg-dark` | `#121212` | Base background |
| `--relay-surface-dark` | `#1E1E1E` | Cards/panels |
| `--relay-border-dark` | `#2E2E2E` | Borders, dividers |
| `--relay-text-dark` | `#F2F2F2` | Primary text |
| `--relay-accent` | `#F97316` | Same accent — orange holds up on dark bg, no change needed |

## Typography
- **Font family:** Inter (all headings, body, UI)
  - Google Fonts: `Inter:wght@400;600;700`
  - Fallback: `system-ui, sans-serif`
- **Headings:** Inter, semi-bold–bold (600–700)
- **Body:** Inter, regular (400)
- **Code/logs:** JetBrains Mono / monospace

## Voice
- Direct, technical, no fluff — talking to devs
- "Automate. Relay. Repeat." (optional tagline, use sparingly)

## Do / Don't
- ✅ Light theme is default everywhere (marketing, app first-load)
- ✅ Dark theme available as user toggle, same accent orange throughout
- ✅ Use accent orange for interactive elements only
- ✅ Keep logo grayscale, let color live around it
- ❌ Don't add gradients to the mark
- ❌ Don't use accent orange as a large background fill (too loud at scale)
