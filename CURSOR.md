# Elevator Pitch Coach - Repository Guide

## Project Purpose & UX Promise

This app provides fast, warm, surgical coaching for elevator pitches. Users record 30-second pitches and receive instant AI feedback with concrete improvements.

**UX Commitment**: Minimal UI, confident typography, subtle motion, premium feel without complexity. Every interaction should feel intentional and valuable.

## Non-Negotiable Guardrails

### API Integrity
- **Never edit `/api/*` endpoints** - All coaching logic, schema validation, scoring algorithms, CTA generation, and self-heal behavior are off-limits
- **Never change JSON shapes** - Client must work with server data exactly as returned
- **Never mutate server text** - Only present, highlight, and copy server-generated content; never modify

### Accessibility Baseline
- **Keyboard operable** - All interactive elements must work with Tab, Enter, Space
- **Visible focus states** - 2px primary ring with offset on all focusable elements
- **Color contrast ≥ 4.5:1** - Test both light and dark themes
- **Respects reduced motion** - Wrap animations in `@media (prefers-reduced-motion: no-preference)`

## Design System

### Fonts (Free Premium Pairing)
- **Headings**: Plus Jakarta Sans (500, 600, 700, 800) - `font-heading`
- **Body/UI**: Inter (400, 500, 600, 700) - `font-sans` 
- **Mono**: JetBrains Mono - `font-mono`

### Color Tokens
- **Accent**: #2563EB (blue) - Used for primary actions, focus rings, highlights
- **Backgrounds**: 
  - Light: #FAFAFA background, #FFFFFF cards
  - Dark: #0B0C0E background, #111216 cards
- **Text**:
  - Light: #0B0C0E foreground, #9AA0A6 muted
  - Dark: #EDEEF0 foreground, #9AA0A6 muted
- **All tokens defined in CSS custom properties using oklch() color space**

### Typography Scale
- **Headings**: Confident sizing with `tracking-tight`, use Plus Jakarta Sans
- **Body**: Relaxed leading for readability, 14-16px base
- **Micro**: 12px for metadata, labels, secondary info

### Components (shadcn/ui)
- **Cards**: `rounded-2xl`, generous padding, soft shadows, `premium-card` class
- **Segmented toggle**: Brief|Deep mode with inline tooltips
- **Accordion**: For Deep-only sections (About Rewrite, Next Steps)
- **Tooltips**: ≤10 words, show precise numbers for rubric chips
- **Toast**: Success feedback via Sonner
- **Skeleton**: Loading placeholders to prevent layout shift

### Motion Rules
- **Container entrance**: 0.35s fade+rise with easeOut
- **Stagger children**: 60-80ms delays between sections
- **Accordion transitions**: 0.2s height+opacity
- **Respect reduced motion**: Wrap all animations in media query

## Layout Rules

### Desktop (lg+)
- **Two-column grid**: `grid-cols-3` with main content `col-span-2`, sidebar `col-span-1`
- **Sticky sidebar**: Scorecard stays in viewport with `sticky top-24`
- **Container**: `max-w-7xl mx-auto px-4` for content width constraint

### Mobile
- **Single column**: Stacked layout, full width cards
- **Consistent spacing**: `space-y-6` between major sections

### Spacing & Rhythm
- **Horizontal padding**: `px-4` on mobile, `px-6` on desktop
- **Vertical gaps**: `space-y-6` for sections, `space-y-4` within cards
- **Card padding**: `p-6` for headers, `pt-6` for content

## Interaction Details

### Script Handling
- **Text selection**: Must be drag-selectable with `selectable` class
- **Copy button**: Shows success toast, temporary "Copied!" state
- **CTA highlighting**: Light accent background with `cta-highlight` class
- **Never mutate text**: Only highlight final sentence if it contains question marks or discussion words

### Tooltips & Feedback
- **Rubric chips**: Show exact numeric values (pace: "142 wpm", fillers: "3 instances")
- **Mode toggle**: Brief="Fast, surgical feedback", Deep="Full coaching with edits & next steps"
- **Success states**: Copy actions show green checkmark + toast

### Loading States
- **Progress bar**: Thin bar at top during API calls using `Progress` component
- **Skeletons**: For Scorecard (scores, chips), Script (text block), Edits (list items)
- **Button states**: Spinner + disabled during generation
- **No layout jumps**: Skeletons match final content dimensions

## Performance & Reliability SLOs

### Client Performance
- **Perceived TTFB**: Render skeletons immediately, show progress within 100ms
- **Single API calls**: One transcribe + one coach call per recording session
- **No extra requests**: Avoid unnecessary re-renders and duplicate fetches
- **Memoization**: Use `useMemo`/`useCallback` for expensive computations

### Error Boundaries
- **Graceful degradation**: Show friendly error messages, not technical details
- **Retry mechanisms**: Let users retry failed operations without losing context
- **Offline awareness**: Handle network failures with clear feedback

## QA Checklists

### UI Polish Checklist
- [ ] Desktop shows clean two-column layout, mobile stacks properly
- [ ] Cards have generous padding, consistent rounded corners
- [ ] Spacing feels airy, typography hierarchy is clear
- [ ] Motion is subtle, respects reduced-motion preference
- [ ] Skeletons prevent layout shifts during loading
- [ ] CTA highlighting works without text mutation
- [ ] Copy functionality works with success feedback

### Accessibility Checklist
- [ ] All interactive elements keyboard accessible
- [ ] Focus rings visible on all focusable elements
- [ ] Color contrast ≥4.5:1 in both themes
- [ ] Screen reader friendly (proper headings, labels)
- [ ] Reduced motion preference respected
- [ ] Tooltips dismissible and not blocking interaction

### No-Regression Checklist
- [ ] Brief mode shows ≤2 quotes, ≤2 edits, 2-3 tips
- [ ] Deep mode shows ≥3 quotes, ≥3 edits, 3-5 tips, About section, Next steps
- [ ] Server quote counts match UI display exactly
- [ ] CTA appears at end of polished script in both modes
- [ ] All API responses validate against expected schemas
- [ ] No broken coaching logic or scoring algorithms

## Branching, Commits, PRs

### Branch Naming
- `ui/polish` - UI improvements, design system updates
- `perf/optimize` - Performance improvements
- `feat/component-name` - New features
- `fix/issue-description` - Bug fixes

### Commit Messages
Use imperative mood with scope:
- `feat(ui): add premium card components with shadcn/ui`
- `fix(ui): correct focus ring visibility in dark theme`
- `perf(layout): optimize skeleton loading states`
- `docs: update CURSOR.md with new component guidelines`

### PR Template
**Goal**: [What problem does this solve?]
**What changed**: [UI only, no API changes]
**Screenshots**: [Before/After, Light/Dark themes]
**Acceptance checklist**: [UI polish ✓, Accessibility ✓, No regression ✓]
**Out of scope**: [What was intentionally not changed]

## Future-Safe Notes

### Adding Imagery
- Use single subtle empty-state visual only
- Keep the rest purely typographic
- SVG icons from Lucide React only
- No decorative images or complex illustrations

### New Components
- Follow same spacing rules (`space-y-4`, `p-6`)
- Use consistent border radius (`rounded-2xl`)
- Apply same motion timing (0.35s easeOut)
- Add entries to this CURSOR.md file
- Use shadcn/ui as foundation when possible

### Design System Evolution
- Any color changes must maintain WCAG AA contrast
- Font changes require updating both CSS variables and Tailwind config
- Motion changes must include reduced-motion fallbacks
- Document all changes in this file to maintain consistency

---

**Last updated**: When making changes to the design system, update this guide to reflect the current state and ensure future consistency.
