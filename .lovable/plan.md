

The WebP conversion corrupted the logo file. The fix is simple: revert all logo imports back to the original `frico-logo.png` across all files that were changed.

### Files to edit (import change only):
1. **src/pages/Auth.tsx** — change import from `frico-logo.webp` back to `frico-logo.png`
2. **src/components/AppSidebar.tsx** — same revert
3. **src/components/dashboard/CargaPrintDialog.tsx** — same revert
4. **src/components/dashboard/ConsolidadoPrintDialog.tsx** — same revert
5. **src/components/dashboard/RupturasPrintDialog.tsx** — same revert

All other attributes (`width`, `height`, `fetchPriority`) will be preserved — only the image source reverts to the original PNG.

