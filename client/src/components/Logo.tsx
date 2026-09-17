// Toroto brand mark, approximated as SVG from the reference logo images
// (a geometric lowercase "t": a vertical stroke with a mid-height crossbar
// nub and a stepped foot at the bottom). Swap the <path> below for an exact
// asset if/when the real logo file is provided.
export function Logo({ className, color = 'currentColor' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M35 15 H50 V32 H68 V47 H50 V68 H68 V83 H35 Z"
        fill={color}
      />
    </svg>
  )
}
