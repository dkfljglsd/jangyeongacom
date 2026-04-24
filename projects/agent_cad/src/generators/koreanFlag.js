const fmt = (n) => +n.toFixed(3)

function rotatePoint(px, py, cx, cy, deg) {
  const rad = (deg * Math.PI) / 180
  const dx = px - cx
  const dy = py - cy
  return [
    cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  ]
}

function barPath(bx, by, bw, bh, gx, gy, deg) {
  const corners = [
    [bx - bw / 2, by - bh / 2],
    [bx + bw / 2, by - bh / 2],
    [bx + bw / 2, by + bh / 2],
    [bx - bw / 2, by + bh / 2],
  ].map(([px, py]) => rotatePoint(px, py, gx, gy, deg).map(fmt).join(','))
  return `M ${corners[0]} L ${corners[1]} L ${corners[2]} L ${corners[3]} Z`
}

function buildBars(gx, gy, bw, bh, spacing, deg, pattern) {
  // gap between broken bar halves = bh (verified from reference SVG)
  const hw = (bw - bh) / 2
  const off = (bw + bh) / 4
  const paths = []
  for (let i = 0; i < 3; i++) {
    const by = gy + (i - 1) * spacing  // i=0 → top, i=1 → mid, i=2 → bottom
    if (pattern[i] === 0) {
      paths.push(barPath(gx, by, bw, bh, gx, gy, deg))
    } else {
      paths.push(barPath(gx - off, by, hw, bh, gx, gy, deg))
      paths.push(barPath(gx + off, by, hw, bh, gx, gy, deg))
    }
  }
  return paths
}

// Proportions derived from the verified reference SVG (300×200):
//   bw = w/6, bh = h/25, spacing = h*3/50
//   gx at w/4 or 3w/4, gy at h/4 or 3h/4
export function generateKoreanFlagSVG(width = 300, height = 200) {
  const cx = width / 2
  const cy = height / 2
  const R = height / 4
  const sr = R / 2
  const diagAngle = (Math.atan2(height, width) * 180) / Math.PI

  const bw = width / 6
  const bh = height / 25
  const spacing = (height * 3) / 50

  const taegukRed =
    `M ${fmt(cx - R)},${cy} A ${R},${R} 0 0,1 ${fmt(cx + R)},${cy}` +
    ` A ${sr},${sr} 0 0,0 ${cx},${cy} A ${sr},${sr} 0 0,1 ${fmt(cx - R)},${cy} Z`
  const taegukBlue =
    `M ${fmt(cx + R)},${cy} A ${R},${R} 0 0,1 ${fmt(cx - R)},${cy}` +
    ` A ${sr},${sr} 0 0,0 ${cx},${cy} A ${sr},${sr} 0 0,1 ${fmt(cx + R)},${cy} Z`

  // Geon ☰ TL, Gam ☵ TR, Ri ☲ BL, Gon ☷ BR
  // pattern[i]: 0 = solid bar, 1 = broken bar (top→bottom)
  const trigrams = [
    { gx: width / 4,       gy: height / 4,       deg: -diagAngle, pattern: [0, 0, 0] },
    { gx: (width * 3) / 4, gy: height / 4,       deg: +diagAngle, pattern: [1, 0, 1] },
    { gx: width / 4,       gy: (height * 3) / 4, deg: +diagAngle, pattern: [0, 1, 0] },
    { gx: (width * 3) / 4, gy: (height * 3) / 4, deg: -diagAngle, pattern: [1, 1, 1] },
  ]

  const pathEls = trigrams
    .flatMap(({ gx, gy, deg, pattern }) =>
      buildBars(gx, gy, bw, bh, spacing, deg, pattern)
    )
    .map((d) => `  <path d="${d}" fill="#000000" stroke="#000000" stroke-width="0.1"/>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#000000" stroke-width="0.3"/>
  <g transform="rotate(${fmt(diagAngle)} ${cx} ${cy})">
    <path d="${taegukRed}" fill="#CD2E3A" stroke="#000000" stroke-width="0.2"/>
    <path d="${taegukBlue}" fill="#0047A0" stroke="#000000" stroke-width="0.2"/>
  </g>
${pathEls}
</svg>`
}
