---
name: Responsiveness Standard
description: Project-wide rules for mobile (320-767px) and tablet (768-1023px) responsiveness
type: design
---
# Responsiveness Standard

## Breakpoints
- Mobile: <768px / Tablet: 768–1023px / Desktop: ≥1024px

## Global foundations (applied in Layout/UI components)
- body: `overflow-x: hidden`, `-webkit-tap-highlight-color: transparent`
- Inputs forced to 16px on <768px (prevents iOS zoom on focus)
- Layout uses `h-dvh` (not `h-screen`)
- Safe-area insets: top in header, bottom in main, sidebar pt/pb
- Sidebar mobile drawer: `w-[90vw] max-w-sm`

## Component defaults (already set globally)
- Dialog: `w-[95vw] max-w-lg max-h-[90dvh]` + scroll, padding `p-4 sm:p-6`
- Sheet: `w-[90vw] max-w-sm sm:max-w-md`
- Tabs (TabsList): horizontal scroll on overflow, `scrollbar-thin`
- Calendar: auto-clamped to 1 month on mobile via useIsMobile
- MultiSelectFilter: `w-full md:w-auto` trigger, popover `w-[min(92vw,280px)] max-h-[50dvh]`

## Page patterns
- Container: `p-4 sm:p-6`
- KPI grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`
- Toolbars: `grid grid-cols-2 sm:flex sm:flex-wrap gap-2 [&>*]:min-w-0`
- Selects: `h-10 sm:h-9 w-full sm:w-[Xpx]`
- Date popover: `PopoverContent w-auto max-w-[95vw] p-0`
- Title: `text-base sm:text-lg md:text-2xl` + truncate
- Tables: prefer cards on mobile or horizontal-scroll container

## Utilities
- `.safe-top`, `.safe-bottom`, `.scrollbar-thin`, `.scrollbar-none`
