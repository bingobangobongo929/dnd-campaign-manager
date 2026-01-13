# CLAUDE.md - Project Design System & Instructions

## READ THIS BEFORE ANY UI/STYLING WORK

This project has an established design system using CSS variables defined in `globals.css`. 
**USE THE CSS VARIABLES AND EXISTING CLASSES - do not hardcode hex values.**

---

## CSS VARIABLES (defined in globals.css)

### Backgrounds - USE THESE:
```css
--bg-void: #050507      /* Darkest - rarely used */
--bg-base: #0a0a0f      /* Page background */
--bg-surface: #12121a   /* Card/panel background */
--bg-elevated: #1a1a24  /* Elevated panels */
--bg-hover: #222230     /* Hover states */
```

Usage in Tailwind:
```tsx
bg-[--bg-base]      /* NOT bg-[#0a0a0f] */
bg-[--bg-surface]   /* NOT bg-[#0d0d14] */
bg-[--bg-elevated]  /* NOT bg-[#1a1a24] */
```

### Accent Colors:
```css
--arcane-purple: #8B5CF6
--arcane-gold: #d4a843
```

Usage:
```tsx
bg-[--arcane-purple]        /* Solid purple */
border-[--arcane-purple]    /* Purple border */
border-[--arcane-purple]/50 /* 50% opacity purple border */
```

### Borders:
```css
--border: #2a2a3a
```

Usage:
```tsx
border-[--border]    /* Standard border - 80+ uses in codebase */
```

### Text:
```css
--text-primary: #ffffff
--text-secondary: #a0a0b0  
--text-tertiary: #6b6b7b
```

---

## EXISTING CSS CLASSES (use these instead of inline Tailwind)

The project has semantic CSS classes in globals.css. Use them:

### Page structure:
```tsx
<div className="page-header">
  <h1 className="page-title">Title</h1>
  <p className="page-subtitle">Subtitle</p>
</div>
```

### Buttons:
```tsx
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="fab"><Icon className="fab-icon" /></button>
```

### Forms:
```tsx
<div className="form-group">
  <label className="form-label">Label</label>
  <input className="form-input" />
</div>
<textarea className="form-textarea" />
```

### Empty states:
```tsx
<div className="empty-state">
  <Icon className="empty-state-icon" />
  <h3 className="empty-state-title">No items yet</h3>
  <p className="empty-state-description">Description text</p>
</div>
```

### Grids:
```tsx
<div className="campaign-grid">...</div>
```

---

## SPACING PATTERNS (based on actual codebase usage)

### Most common patterns:
| Pattern | Count | Usage |
|---------|-------|-------|
| mb-4 | 63 | Standard gap between elements |
| mb-6 | 37 | Larger gap between related groups |
| mb-3 | 37 | Smaller gap |
| space-y-4 | 17 | Vertical spacing in lists |
| space-y-2 | 14 | Tight list spacing |
| mb-16 | 16 | Large section gaps |
| p-3 | 97 | Standard padding |
| p-4 | 62 | Slightly larger padding |
| p-6 | 32 | Panel padding |
| p-8 | 21 | Large panel padding |

### Recommended spacing:
- Between form fields in same section: `mb-6` or `space-y-4`
- Between sections: `mb-12` or `mb-16`
- Between major page sections: `mb-16` or `mb-32`
- Inside cards/panels: `p-4` to `p-6`
- Large panels: `p-6` to `p-8`
- Input padding: `py-3 px-4` or `py-4 px-4`

---

## COMPONENT PATTERNS (matching existing codebase)

### Input field:
```tsx
<div className="form-group">
  <label className="form-label">Label</label>
  <input className="form-input" placeholder="..." />
</div>
```

Or with Tailwind (matching existing patterns):
```tsx
<div className="mb-6">
  <label className="block text-sm font-medium text-[--text-secondary] mb-2">Label</label>
  <input className="w-full py-3 px-4 bg-white/[0.03] border border-[--border] rounded-xl focus:border-[--arcane-purple]/50 focus:outline-none" />
</div>
```

### Card/Panel:
```tsx
<div className="bg-[--bg-surface] border border-[--border] rounded-xl p-6">
  {/* content */}
</div>
```

### Section header:
```tsx
<div className="flex items-center gap-4 mb-8">
  <div className="p-3 bg-purple-500/20 rounded-xl">
    <Icon className="w-6 h-6 text-purple-400" />
  </div>
  <h2 className="text-2xl font-bold text-white">SECTION NAME</h2>
  <div className="flex-1 h-px bg-gradient-to-r from-[--arcane-purple]/50 to-transparent" />
</div>
```

### Empty state:
```tsx
<div className="empty-state">
  <Icon className="empty-state-icon" />
  <h3 className="empty-state-title">No items yet</h3>
  <p className="empty-state-description">Add your first item</p>
</div>
```

Or with Tailwind:
```tsx
<div className="flex flex-col items-center justify-center py-16 px-8 bg-white/[0.02] border-2 border-dashed border-[--border] rounded-xl">
  <Icon className="w-12 h-12 text-gray-600 mb-4" />
  <p className="text-gray-400">No items yet</p>
</div>
```

---

## TAILWIND V4 NOTES

This project uses Tailwind v4. The `globals.css` includes:
```css
@config "../../tailwind.config.ts";
@source "../**/*.{js,ts,jsx,tsx}";
```

Both `space-y-*` and explicit `mb-*` margins work. Use whichever is cleaner for the situation.

---

## THEME RULES - CRITICAL

1. **ALWAYS use dark theme** - Never white/light backgrounds
2. **Use CSS variables** - `bg-[--bg-surface]` NOT `bg-[#0d0d14]`
3. **Use existing CSS classes** when they exist (btn, form-input, empty-state, etc.)
4. **Consistent borders** - `border-[--border]` is the standard
5. **Purple accents** - `--arcane-purple` (#8B5CF6) for highlights

---

## BEFORE CREATING ANY NEW PAGE OR COMPONENT

1. Check `globals.css` for existing CSS classes that might fit
2. Use CSS variables for colors, not hardcoded hex values
3. Check similar existing components for patterns
4. Use dark purple theme - NEVER white/light backgrounds
5. Test visually before committing

---

## KNOWN ISSUES

### CharacterEditor.tsx
This component uses hardcoded hex values instead of CSS variables and doesn't use the semantic CSS classes from globals.css. When editing it:
- Replace `bg-[#0a0a0f]` with `bg-[--bg-base]`
- Replace `bg-[#0d0d14]` with `bg-[--bg-surface]`
- Replace `border-white/10` with `border-[--border]` where appropriate
- Consider using `form-group`, `form-label`, `form-input` classes

---

## QUICK REFERENCE

| What | Use This |
|------|----------|
| Page background | `bg-[--bg-base]` |
| Panel background | `bg-[--bg-surface]` or `bg-white/[0.03]` |
| Borders | `border-[--border]` |
| Purple accent | `bg-[--arcane-purple]` or `bg-purple-500/20` |
| Button | `className="btn btn-primary"` |
| Form input | `className="form-input"` |
| Standard gap | `mb-4` or `mb-6` |
| Section gap | `mb-12` or `mb-16` |
| Panel padding | `p-4` to `p-6` |
| Input padding | `py-3 px-4` |
