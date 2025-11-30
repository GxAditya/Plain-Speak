# Frontend Revamp Prompt for PlainSpeak

You are tasked with completely redesigning the frontend of PlainSpeak - an AI-powered text simplification application. The current design is generic and lacks intentionality. Your goal is to create a **purposeful, tool-focused interface** that feels like professional software, not a startup landing page.

## Core Design Philosophy

Design this as a **serious productivity tool** - think of software that professionals use daily like IDEs, design tools, or data analysis platforms. Every element must serve a clear functional purpose. This should feel utilitarian, efficient, and built for repeated use.

**Anti-patterns to avoid:**
- Purple/pink AI gradient backgrounds
- Floating blobs and abstract shapes
- "Magical sparkle" effects
- Glassmorphism for its own sake
- Generic hero sections with buzzwords
- Over-the-top animations that distract
- Marketing-speak UI patterns

## Layout Architecture

**Application Shell:**
```
┌─────────────────────────────────────────────────┐
│ [Logo] PlainSpeak        [Settings] [Theme] [•] │ ← Fixed header
├──────────────────┬──────────────────────────────┤
│                  │                              │
│   INPUT ZONE     │     OUTPUT ZONE              │
│   (35% width)    │     (65% width)              │
│                  │                              │
│  [Textarea]      │  [Simplified Result]         │
│                  │                              │
│  [Options ▼]     │  [Actions: Copy | Export]    │
│                  │                              │
├──────────────────┴──────────────────────────────┤
│ [Simplify Button]  Status: Ready  [Clear]       │ ← Action bar
└─────────────────────────────────────────────────┘
```

**Layout should:**
- Use a clean split-panel design (resizable splitter optional)
- Have a persistent header with minimal chrome
- Keep action buttons contextually placed
- Feel like a code editor or design tool, not a website

## Design System Specifications

### Color Palette (Clean & Professional)

**Option A - Monochrome Professional:**
- Primary: Navy blue (#0F172A) - headers, important UI
- Interactive: Bright blue (#3B82F6) - buttons, links
- Background: Off-white (#FAFBFC)
- Surface: Pure white (#FFFFFF)
- Text Primary: Near-black (#18181B)
- Text Secondary: Cool gray (#64748B)
- Border: Light gray (#E2E8F0)
- Success: Forest green (#059669)
- Warning: Amber (#D97706)
- Error: Red (#DC2626)

**Option B - Warm Neutral:**
- Primary: Slate (#1E293B)
- Interactive: Teal (#14B8A6)
- Background: Warm gray (#F5F5F4)
- Surface: White (#FFFFFF)
- Text Primary: Charcoal (#0A0A0A)
- Text Secondary: Stone (#78716C)
- Border: Neutral gray (#D6D3D1)
- Success: Sage (#16A34A)
- Warning: Orange (#EA580C)

**NO gradients. NO purple AI vibes. Solid colors only.**

### Typography

**Font Stack:**
- UI: `system-ui, -apple-system, 'Segoe UI', sans-serif` (native feel)
- Monospace: `'SF Mono', 'Roboto Mono', monospace` (for technical text)

**Type Scale:**
- Display: 28px, 600 weight (page titles only)
- Heading: 20px, 600 weight (section headers)
- Body: 15px, 400 weight, 1.5 line-height
- Small: 13px, 500 weight (labels, metadata)
- Tiny: 11px, 500 weight (captions, helpers)

### Spacing & Layout

**8px grid system:**
- 4px: Tight spacing (icon to label)
- 8px: Component padding
- 16px: Section spacing
- 24px: Panel padding
- 32px: Major section gaps
- 48px: Page-level spacing

**Borders & Radius:**
- Border width: 1px (crisp, not blurry)
- Input radius: 6px (subtle)
- Card radius: 8px (gentle)
- Button radius: 6px (functional)

## Component Specifications

### Input Panel (Left Side)

**Textarea:**
- Min-height: 300px
- Border: 1px solid border color
- Focus: 2px solid interactive color, no glow
- Padding: 16px
- Font: 15px body text
- Resize: Vertical only
- Placeholder: "Paste or type complex text here..."

**Metadata Bar (below textarea):**
- Character count: "1,247 characters"
- Word count: "189 words"
- Estimated complexity: "Grade 12" (subtle badge)
- Style: Small gray text, right-aligned

**Options Dropdown:**
- Trigger: Simple button "Options ▼"
- Contents: Radio buttons for simplification level
  - Keep it simple (Grade 6-8)
  - Make it clear (Grade 9-10)
  - Preserve detail (Grade 11-12)
- Style: Clean dropdown, no fancy animations

### Output Panel (Right Side)

**Result Display:**
- White background card with subtle border
- Same typography as input for comparison
- Line-by-line diff highlighting (optional toggle):
  - Changed text: Yellow background (#FEF3C7)
  - Removed: Red strikethrough
  - Added: Green underline
- Padding: 24px

**Action Bar (top of output):**
- Copy button (icon + text)
- Export dropdown (TXT, PDF, Markdown)
- Compare toggle (show side-by-side view)
- Style: Minimal icon buttons, 32px tall, gray until hover

**Empty State:**
- Centered text: "Your simplified text will appear here"
- Small icon (document or arrow)
- NO illustrations, NO cute characters

### Action Bar (Bottom)

**Primary Button (Simplify):**
- Full height bar button, left-aligned
- Interactive color background
- White text, 15px semibold
- Shortcut hint: "⌘ Enter"
- Loading state: Same button with "Processing..." text
- No spinners, no loading bars

**Status Indicator (Center):**
- "Ready" | "Processing" | "Complete" | "Error: [message]"
- Small dot icon matching state color
- 13px text

**Clear Button (Right):**
- Ghost button style
- "Clear" text only
- Hover: light gray background

## Micro-Interactions & Animations

**Keep animations functional, not decorative:**

1. **Button Press:** Scale down to 0.98, 100ms
2. **Focus States:** Instant 2px border, no glow effects
3. **Panel Transitions:** 200ms ease-out slide when switching views
4. **Copy Feedback:** Button text changes to "Copied!" for 2s, returns to "Copy"
5. **Loading State:** Button text fades between "Simplify" and "Processing" (1s)
6. **Result Appearance:** Fade in over 150ms, no slide/bounce
7. **Error Shake:** 2 small horizontal movements (200ms total)

**NO:**
- Floating animations
- Particle effects
- Gradient animations
- Elastic bounces
- 3D transforms
- Fancy page transitions

## Keyboard Shortcuts

- `Cmd/Ctrl + Enter`: Process text
- `Cmd/Ctrl + K`: Focus input
- `Cmd/Ctrl + Shift + C`: Copy output
- `Escape`: Clear input/dismiss modals

Show shortcuts in tooltips (200ms delay, simple fade-in)

## Settings Panel (Slide-out Drawer)

**Trigger:** Gear icon in header

**Contents:**
- Theme toggle: Light / Dark (simple switch)
- Default simplification level
- Show word complexity highlighting (toggle)
- Keyboard shortcuts list
- About section (version, links)

**Appearance:**
- Slides in from right, 300ms ease-out
- 320px wide
- Overlay backdrop: rgba(0,0,0,0.3)
- Close on backdrop click or Escape

## Dark Mode

**Simply invert the brightness, maintain contrast:**
- Background: #0A0A0A
- Surface: #1A1A1A
- Text Primary: #FAFAFA
- Text Secondary: #A1A1AA
- Borders: #27272A
- Keep interactive colors vivid but not neon

## Responsive Behavior

**Desktop (1024px+):** Split panel layout as designed

**Tablet (768px-1023px):** 
- Stack panels vertically
- Input on top (40vh), output below (60vh)
- Action bar becomes floating at bottom

**Mobile (<768px):**
- Single column, full width
- Bottom sheet for options
- Sticky action button at bottom

## Technical Implementation

**Required Stack:**
- React with TypeScript
- Tailwind CSS (no custom CSS if possible)
- Radix UI or Headless UI for accessible components
- Framer Motion only if truly necessary (prefer CSS)

**Performance:**
- Lazy load the output panel
- Debounce textarea input for character count
- Use React.memo for output display
- Virtual scrolling if handling very long text

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators on all focusable elements
- [ ] ARIA labels on icon-only buttons
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Screen reader announcements for state changes
- [ ] Respect prefers-reduced-motion
- [ ] Skip to content link
- [ ] Proper heading hierarchy

## Reference Examples (Aesthetic Only)

Study these for their purposeful, tool-like design:
- **GitHub's code interface** - Clean, functional, no-nonsense
- **VS Code** - Dark theme, clear hierarchy, minimal chrome
- **Linear app** - Fast, intentional animations, clean typography
- **Stripe Dashboard** - Professional, data-focused, clear CTAs
- **Vercel Dashboard** - Monochrome aesthetic, sharp contrast

## Final Deliverable

Build a complete React component that implements this design. The interface should feel:
- **Fast**: Instant feedback, no unnecessary delays
- **Professional**: Like software engineers or writers would use daily
- **Focused**: Every element serves the core function
- **Respectful**: Of the user's time and attention

This is a tool, not a toy. Design accordingly.