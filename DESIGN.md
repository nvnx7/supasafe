---
name: Supasafe Vault System
colors:
  surface: '#ebfef4'
  surface-dim: '#ccded5'
  surface-bright: '#ebfef4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e6f8ee'
  surface-container: '#e0f2e8'
  surface-container-high: '#daece3'
  surface-container-highest: '#d4e7dd'
  on-surface: '#0f1f19'
  on-surface-variant: '#414845'
  inverse-surface: '#24342d'
  inverse-on-surface: '#e3f5eb'
  outline: '#717975'
  outline-variant: '#c1c8c4'
  surface-tint: '#426559'
  primary: '#00150f'
  on-primary: '#ffffff'
  primary-container: '#062c22'
  on-primary-container: '#719587'
  inverse-primary: '#a9cfc0'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#00160b'
  on-tertiary: '#ffffff'
  tertiary-container: '#002d1c'
  on-tertiary-container: '#00a16f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c4ebdb'
  primary-fixed-dim: '#a9cfc0'
  on-primary-fixed: '#002118'
  on-primary-fixed-variant: '#2b4d42'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#ebfef4'
  on-background: '#0f1f19'
  surface-variant: '#d4e7dd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.03em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  data-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
---

## Brand & Style

This design system embodies an institutional-grade financial custody interface engineered for cryptographic governance on Starknet. The brand personality is grounded, authoritative, and tranquil—evoking the prestige of private heritage banking alongside the surgical precision of zero-knowledge cryptography.

### Visual Aesthetic & Philosophy
- **Style Archetype:** Institutional Modernism meets Cryptographic Luxury. It avoids loud crypto tropes (no aggressive neon glow or cyberpunk motifs) in favor of deep British racing/forest greens, precise micro-borders, serene slate canvas backdrops, and surgical typographic data points.
- **Audience:** Institutional treasury managers, decentralized protocol councils, family offices, and high-security Starknet ecosystem stewards demanding zero visual distraction and total clarity on state changes.
- **Emotional Response:** Sovereign security, frictionless authority, and effortless balance management.

## Colors

The palette leverages a deep forest green core paired with dynamic pine and emerald accents, grounded by an alabaster slate foundation.

### Palette Architecture
- **Primary (`#062c22`):** Obsidian Forest. Deployed for primary brand presence, primary interactive buttons, critical state indicators, and top-tier headers.
- **Secondary (`#059669`):** Deep Pine. Used for interactive states, focused rings, positive execution milestones, and verified cryptographic badges.
- **Tertiary (`#10b981`):** Vivid Mint Emerald. Reserved for real-time status pulses, verification checkmarks, active threshold counters, and transaction confirmations.
- **Neutral Surface & Canvas:**
  - Canvas Base: `#f8faf9` (warm alabaster slate with a faint pine undertone).
  - Elevated Surfaces / Cards: `#ffffff` (crisp pure white).
  - Subtle Inset Wells: `#f0f4f2` (used for nested form areas and segment control tracks).
  - Hairline Borders: `#e2e8e5` (soft sage-tinted slate).
- **Text & Foreground Hierarchy:**
  - Primary Text: `#0b1713` (rich green-cast charcoal, softer than pure black).
  - Secondary Text: `#4a5d54` (muted sage gray for labels and structural metadata).
  - Tertiary / Muted: `#7b8f86` (disabled states, inactive placeholders, secondary cryptographic keys).

## Typography

Typography establishes an immediate operational tempo. The system bifurcates human-readable institutional messaging from cryptographic machine truth:

- **Display & Section Titles:** Rendered in **Plus Jakarta Sans** with tight tracking (`-0.02em` to `-0.03em`) for authoritative, polished headers.
- **Operational Copy & Interface Controls:** Set in **Inter** to maximize neutral legibility across dense data tables, modal dialogs, and configuration inputs.
- **Cryptographic & Financial Numerals:** Set in **Inter** with tabular lining figures. Hexadecimal Starknet hashes, contract public keys, threshold fractions (e.g., `1 of 2`), and token balances use clear, consistent weights without switching typefaces.

## Layout & Spacing

The layout is built on a responsive 12-column grid anchored inside a maximum container width of `1200px`, providing an executive cockpit view without horizontal drift on ultra-wide displays.

### Form Factor Adaptations
- **Desktop (>= 1024px):** 12-column grid. Standard dual-card split layout: 6 columns each for side-by-side modules (Signers vs. Balances; Transaction Form vs. Proposal Feed). Vault Header spans full 12 columns.
- **Tablet (768px - 1023px):** 8-column layout. Margin shrinks to `1.5rem`. Secondary balances and proposal queues stack vertically beneath key generation forms.
- **Mobile (< 768px):** 4-column layout. Margin collapses to `1rem`. All panels stack into single-column vertical cards. Segmented control strips become horizontally scrollable pill bars. Address strings truncate dynamically with middle ellipsis (`0x14bc...5fc9`).

### Vertical Rhythm
A base 8pt baseline cadence ensures cards, internal table rows, and button paddings maintain integer multiples. Primary modules preserve internal padding of `1.5rem` (`space-lg`), separating header zones from itemized lists by `1rem` (`space-md`).

## Elevation & Depth

To maintain institutional sobriety, depth is communicated through architectural layering and hairline precision rather than heavy, distracting drop shadows.

- **The Plane (Canvas):** The `#f8faf9` canvas acts as a warm limestone substrate.
- **Surface Elevation (Cards):** Surfaces reside at `#ffffff` bounded by a 1px continuous hairline outline (`#e2e8e5`). A faint, ultra-diffused atmospheric shadow is applied: `0 1px 3px 0 rgba(6, 44, 34, 0.03), 0 4px 16px -2px rgba(6, 44, 34, 0.02)`. The shadow has a deliberate deep forest tint to integrate naturally with the palette.
- **Floating Overlays & Menus:** Connected wallet menus, token dropdown selectors, and action sheets lift with `0 12px 32px -4px rgba(6, 44, 34, 0.08), 0 2px 6px 0 rgba(6, 44, 34, 0.03)` with a hairline ring of `#d6ded9`.
- **Inset Tunnels:** Interactive input fields and segmented toggle tracks sit receded into the card surface using `#f5f8f6` fill and a subtle inner shadow `inset 0 1px 2px rgba(6, 44, 34, 0.04)`.

## Shapes

The interface balances crisp, refined institutional geometry with subtle softening.

- **Primary Cards & Containers:** Standardized at `0.25rem` (4px) to `0.5rem` (8px) corner radius (`roundedness: 1`). This maintains structural precision and clean lines while avoiding raw industrial corners.
- **Form Controls & Action Buttons:** Form inputs and primary CTA buttons share a tight `0.25rem` radius, providing distinct tactile touch targets.
- **Badges, Pills & Status Tokens:** Completely circular/pill-shaped (`9999px`) to create an immediate morphological contrast against rectangular financial data cells.

## Components

### Buttons
- **Primary:** Solid Obsidian Forest (`#062c22`) background, crisp white typography (`#ffffff`), font weight 600. On hover, shifts to `#0b3d32`. On active press, slight compression scale (`99%`).
- **Secondary / Outline:** Background `#ffffff`, border 1px solid `#e2e8e5`, text `#062c22`. On hover, background shifts to `#f0f4f2`.
- **Tertiary / Subdued:** Ghost button with transparent background, `#4a5d54` text, hovering into `#f0f4f2`.

### Segmented Controls & Tabs
- Outer container: Inset well with `#f0f4f2` background, 1px solid `#e2e8e5` border, rounded corners, with `4px` padding.
- Active Segment: Pure white surface `#ffffff`, elevated with a 1px micro-border and soft `0 1px 2px rgba(0,0,0,0.05)` shadow. Text is `#062c22` medium weight.
- Inactive Segment: Transparent, text `#4a5d54`.

### Cryptographic Identity & Badges
- **Status Pills:** Threshold badges (e.g., `1 of 2`) feature `#f0f4f2` fill, `#4a5d54` text, and tabular numbers.
- **Verified Indicators:** 14px emerald circle (`#10b981`) enclosing a white micro-check, indicating cryptographic validation of Starknet public keys.
- **Signer Identity Rows:** Left-aligned human identifier ("Owner 0") set in muted body text; right-aligned Starknet hex address in semibold Inter with associated key string stacked below in subdued font.

### Inputs & Selectors
- Standard text input: Pure white surface or `#fcfdfc` fill, `1px solid #d6ded9` border, `14px` font size. Focused state introduces a dual-ring: `0 0 0 1px #059669` accompanied by `0 0 0 4px rgba(5, 150, 105, 0.12)`.
- Token dropdown triggers: Inset field with integrated chevron icon and token symbol badge.

### Proposals & Approval Feed
- Proposal card: Delineated state indicators showing signatures collected vs. signatures required via a horizontal stepped bar rendered in `#10b981` (signed) vs. `#e2e8e5` (pending). Empty states use muted pine typography and clean dashed container lines.
