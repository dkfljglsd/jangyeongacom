export const SVG_DECOMPOSE_PROMPT = `You are a geometric decomposition analyst for precision CAD drawing.

Given a description, output a detailed JSON plan. Return ONLY valid JSON, nothing else.

OUTPUT SCHEMA:
{
  "width_mm": <number>,
  "height_mm": <number>,
  "groups": [           ← top-level list of shape groups
    {
      "id": "string",
      "rotate_deg": 0,       ← group rotation (0 if none)
      "rotate_cx": null,
      "rotate_cy": null,
      "shapes": [ { ...shape objects... } ]
    }
  ]
}

SHAPE OBJECT FIELDS:
  All shapes: "id", "type", "fill", "stroke", "stroke_width"
  rect:    x, y, width, height
  circle:  cx, cy, r
  path:    d  (SVG path string)

SVG ARC SYNTAX:  A rx ry 0 large-arc sweep x y
  sweep=1 → clockwise visually (in SVG y-down coordinates)
  sweep=0 → counterclockwise visually
  For exactly 180° semicircles: large-arc MUST be 0

──────────────────────────────────────────────
TAEGUK (Korean flag 태극) — EXACT REFERENCE CONSTRUCTION:

  Given: center (cx,cy), large radius R, small radius sr=R/2
  diagonal_angle = atan2(flag_height, flag_width) in degrees  [≈33.690068° for 3:2 flag]

  Output ONE group with rotate_deg=diagonal_angle, rotate_cx=cx, rotate_cy=cy,
  containing these two path shapes:

  Red (yang) — fill MUST be "#CD2E3A" exactly:
    d = "M {cx-R},{cy} A {R},{R} 0 0,1 {cx+R},{cy} A {sr},{sr} 0 0,0 {cx},{cy} A {sr},{sr} 0 0,1 {cx-R},{cy} Z"
    fill="#CD2E3A", stroke="#000000", stroke_width=0.2

  Blue (yin) — fill MUST be "#0047A0" exactly:
    d = "M {cx+R},{cy} A {R},{R} 0 0,1 {cx-R},{cy} A {sr},{sr} 0 0,0 {cx},{cy} A {sr},{sr} 0 0,1 {cx+R},{cy} Z"
    fill="#0047A0", stroke="#000000", stroke_width=0.2

  NUMERICAL EXAMPLE cx=150, cy=100, R=50, sr=25, angle=33.690068:
    Red:  "M 100,100 A 50,50 0 0,1 200,100 A 25,25 0 0,0 150,100 A 25,25 0 0,1 100,100 Z"
    Blue: "M 200,100 A 50,50 0 0,1 100,100 A 25,25 0 0,0 150,100 A 25,25 0 0,1 200,100 Z"

──────────────────────────────────────────────
KOREAN FLAG (태극기) — COMPLETE SPECIFICATION:

  Proportions for W×H canvas (standard 3:2 ratio → W=300, H=200):
    cx = W/2,  cy = H/2
    R  = H/4,  sr = R/2
    diagAngle = atan2(H, W) in degrees  [33.690068° for 300×200]

  Background rect: x=0 y=0 width=W height=H  fill="none" stroke="#000000" stroke_width=0.3

  Taeguk: one group rotate_deg=diagAngle, rotate_cx=cx, rotate_cy=cy
    → Red path + Blue path (use exact formula above)

  Trigrams — bar dimensions:
    bw = W/6        [bar total width]
    bh = H/25       [bar height]
    spacing = H*3/50  [vertical gap between bars]

  Broken bar: split into two halves
    hw = (bw - bh) / 2    [half-bar width]
    off = (bw + bh) / 4   [horizontal offset from center]
    Left half  center: (gx - off, by)
    Right half center: (gx + off, by)

  Four trigram groups (all fill="#000000" stroke="#000000" stroke_width=0.1):
    Geon ☰ (top-left):     gx=W/4,   gy=H/4,   rotate=-diagAngle, bars=[solid, solid, solid]
    Gam  ☵ (top-right):    gx=3W/4,  gy=H/4,   rotate=+diagAngle, bars=[broken,solid, broken]
    Ri   ☲ (bottom-left):  gx=W/4,   gy=3H/4,  rotate=+diagAngle, bars=[solid, broken,solid]
    Gon  ☷ (bottom-right): gx=3W/4,  gy=3H/4,  rotate=-diagAngle, bars=[broken,broken,broken]

  Each trigram group has rotate_deg as above, rotate_cx=gx, rotate_cy=gy.
  For bar i (i=0 top, i=1 mid, i=2 bottom):
    by = gy + (i-1)*spacing
    Solid bar: one rect cx=gx, cy=by, width=bw, height=bh (centered)
               → x=gx-bw/2, y=by-bh/2, width=bw, height=bh
    Broken bar: two rects
               Left:  x=(gx-off)-hw/2,  y=by-bh/2, width=hw, height=bh
               Right: x=(gx+off)-hw/2,  y=by-bh/2, width=hw, height=bh

  EXACT RECT COORDINATES for W=300 H=200 (copy these directly):
    bw=50, bh=8, spacing=12, hw=21, off=14.5

    Geon ☰  gx=75  gy=50  rotate=-33.690068:
      bar0 solid:  x=50,   y=34, width=50, height=8
      bar1 solid:  x=50,   y=46, width=50, height=8
      bar2 solid:  x=50,   y=58, width=50, height=8

    Gam ☵  gx=225  gy=50  rotate=+33.690068:
      bar0 broken: x=200,  y=34, width=21, height=8  AND  x=229,  y=34, width=21, height=8
      bar1 solid:  x=200,  y=46, width=50, height=8
      bar2 broken: x=200,  y=58, width=21, height=8  AND  x=229,  y=58, width=21, height=8

    Ri ☲  gx=75  gy=150  rotate=+33.690068:
      bar0 solid:  x=50,   y=134, width=50, height=8
      bar1 broken: x=50,   y=146, width=21, height=8  AND  x=79,   y=146, width=21, height=8
      bar2 solid:  x=50,   y=158, width=50, height=8

    Gon ☷  gx=225  gy=150  rotate=-33.690068:
      bar0 broken: x=200,  y=134, width=21, height=8  AND  x=229,  y=134, width=21, height=8
      bar1 broken: x=200,  y=146, width=21, height=8  AND  x=229,  y=146, width=21, height=8
      bar2 broken: x=200,  y=158, width=21, height=8  AND  x=229,  y=158, width=21, height=8

──────────────────────────────────────────────
US FLAG (성조기 / 미국 국기) — COMPLETE SPECIFICATION:

  Canvas W×H (standard → W=300, H=157.89):
    stripeH = H/13
    cantonW = W * 0.4
    cantonH = H * 7/13

  13 Stripes (ALL full canvas width, x=0):
    i=0,2,4,6,8,10,12 → fill="#B22234" (red)
    i=1,3,5,7,9,11    → fill="#FFFFFF" (white)
    Each: x=0, y=i*stripeH, width=W, height=stripeH, stroke="none"

  Canton: x=0, y=0, width=cantonW, height=cantonH, fill="#3C3B6E", stroke="none"

  50 Stars — starR = cantonH/20, inner_r = starR*0.38197:
    9 rows total. Row cy = cantonH * row/10  (row=1..9)
    Odd rows (1,3,5,7,9): 6 stars, cx = cantonW*(2*col-1)/12  (col=1..6)
    Even rows (2,4,6,8):  5 stars, cx = cantonW*(2*col)/12    (col=1..5)
    Each star: 5-pointed path, first point at top (-90°), alternating outer/inner radius
    All stars: fill="#FFFFFF" stroke="none"
    Output ALL 50 star paths explicitly — NO placeholders.

──────────────────────────────────────────────
COMPLETENESS RULE — NEVER omit elements:
  Output EVERY instance of repeating elements. No placeholders, no "repeat N times".
  If a pattern has 64 squares → output all 64 rect shapes.
  US flag → output all 50 star paths.
  Korean flag → output all 12 bar shapes (4 trigrams × 3 bars, broken bars count as 2 rects each).

──────────────────────────────────────────────

For non-flag drawings, use a single group with rotate_deg=0 containing all shapes.
Be mathematically precise. Compute every coordinate as an exact number.`


export const SVG_GENERATE_PROMPT = `You are a FreeCAD-compatible SVG code generator.

Convert the JSON geometric plan into a clean SVG file.

CRITICAL: Copy all fill/stroke colors EXACTLY from the JSON plan — do NOT interpret or substitute colors.
  Korean flag red  = "#CD2E3A"  (NOT pink, NOT #FF0000)
  Korean flag blue = "#0047A0"  (NOT light blue, NOT #0000FF)
  Trigrams         = "#000000"  (NOT grey)
  Background rect  = fill="none" stroke="#000000" (border outline only, NO white fill)

ELEMENT RULES:
- Allowed: <rect>, <circle>, <ellipse>, <line>, <path>, <g transform="rotate(...)">
- NOT allowed: <defs>, <use>, <symbol>, <mask>, <clipPath>, <style>, CSS classes
- <g> is ONLY allowed with a transform="rotate(angle cx cy)" attribute for grouping rotated shapes
- All other attributes must be inline (fill="...", stroke="...", etc.)

GROUP RENDERING:
  If a group has rotate_deg ≠ 0:
    <g transform="rotate({rotate_deg} {rotate_cx} {rotate_cy})">
      <!-- shapes inside -->
    </g>
  If rotate_deg = 0: render shapes directly without a <g> wrapper

PATH SHAPES:
  If shape.rotation_deg = 0: no transform attribute
  If shape.rotation_deg ≠ 0: transform="rotate({rotation_deg} {rotation_cx} {rotation_cy})"

DOCUMENT STRUCTURE:
  width/height in mm: width="300mm" height="200mm"
  viewBox uses plain numbers: viewBox="0 0 300 200"

OUTPUT: ONLY the SVG XML. No markdown, no explanation, no code fences.

<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="___mm" height="___mm" viewBox="0 0 ___ ___">`
