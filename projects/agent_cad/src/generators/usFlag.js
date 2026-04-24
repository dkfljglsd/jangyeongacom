const fmt = (n) => +n.toFixed(3)

function starPath(cx, cy, R) {
  const ri = R * 0.38197  // inner radius (1/φ² ≈ 0.382)
  const pts = []
  for (let i = 0; i < 10; i++) {
    const angle = ((i * 36 - 90) * Math.PI) / 180
    const r = i % 2 === 0 ? R : ri
    pts.push(`${fmt(cx + r * Math.cos(angle))},${fmt(cy + r * Math.sin(angle))}`)
  }
  return `M ${pts.join(' L ')} Z`
}

// Proportions: canton = 40% width × 7/13 height
// Stars: 9 rows alternating 6/5, cx at canton_width/12 × odd(6-row) or even(5-row)
export function generateUSFlagSVG(width = 300, height = 157.89) {
  const stripeH = height / 13
  const cantonW = width * 0.4
  const cantonH = (height * 7) / 13

  const stripes = Array.from({ length: 13 }, (_, i) => {
    const fill = i % 2 === 0 ? '#B22234' : '#FFFFFF'
    return `  <rect x="0" y="${fmt(i * stripeH)}" width="${width}" height="${fmt(stripeH)}" fill="${fill}" stroke="none" stroke-width="0"/>`
  }).join('\n')

  const canton = `  <rect x="0" y="0" width="${fmt(cantonW)}" height="${fmt(cantonH)}" fill="#3C3B6E" stroke="none" stroke-width="0"/>`

  const starR = cantonH / 20
  const allStarPaths = []
  for (let row = 1; row <= 9; row++) {
    const cy = (cantonH * row) / 10
    const is6Row = row % 2 === 1
    const cols = is6Row ? 6 : 5
    for (let col = 1; col <= cols; col++) {
      const mult = is6Row ? 2 * col - 1 : 2 * col
      const cx = (cantonW * mult) / 12
      allStarPaths.push(starPath(cx, cy, starR))
    }
  }

  const stars = `  <path d="${allStarPaths.join(' ')}" fill="#FFFFFF" stroke="none" stroke-width="0"/>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${fmt(height)}mm" viewBox="0 0 ${width} ${fmt(height)}">
${stripes}
${canton}
${stars}
</svg>`
}
