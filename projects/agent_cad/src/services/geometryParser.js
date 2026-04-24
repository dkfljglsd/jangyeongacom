/**
 * geometryParser.js
 * AI 응답 JSON을 파싱하여 CAD 객체 배열로 변환.
 *
 * - operation 필드가 있으면 → solid mode (replicad Worker에서 처리)
 * - operation 필드가 없으면 → primitive mode (기존 Three.js 직접 렌더)
 */

const VALID_TYPES = [
  'box', 'rounded_box', 'sphere', 'cylinder', 'cone',
  'torus', 'torus_knot', 'plane', 'capsule',
  'ring', 'dodecahedron', 'icosahedron', 'octahedron', 'tetrahedron',
  // solid mode type (operation tree 기반)
  'solid',
]

const DEFAULT_GEOMETRY = {
  box:          { width: 1, height: 1, depth: 1 },
  rounded_box:  { width: 1, height: 1, depth: 1, radius: 0.05, segments: 4 },
  sphere:       { radius: 0.5 },
  cylinder:     { radiusTop: 0.3, radiusBottom: 0.3, height: 1 },
  cone:         { radius: 0.5, height: 1 },
  torus:        { radius: 0.5, tube: 0.2 },
  torus_knot:   { radius: 0.5, tube: 0.15, p: 2, q: 3 },
  plane:        { width: 2, height: 2 },
  capsule:      { radius: 0.3, length: 1 },
  ring:         { innerRadius: 0.3, outerRadius: 0.5 },
  dodecahedron: { radius: 0.5 },
  icosahedron:  { radius: 0.5, detail: 0 },
  octahedron:   { radius: 0.5 },
  tetrahedron:  { radius: 0.5 },
  solid:        {},
}

function normalizeObject(obj) {
  // solid mode: "operation" 필드가 있거나 type이 solid인 경우
  const hasSolidOperation = obj.operation != null

  let type
  if (hasSolidOperation) {
    type = 'solid'
  } else {
    type = VALID_TYPES.includes(obj.type) ? obj.type : 'box'
  }

  const base = {
    id: obj.id || crypto.randomUUID(),
    name: obj.name || 'Object',
    type,
    visible: true,
    geometry: { ...(DEFAULT_GEOMETRY[type] || {}), ...(obj.geometry || {}) },
    material: {
      color: '#4a90d9',
      metalness: 0.1,
      roughness: 0.6,
      opacity: 1.0,
      wireframe: false,
      ...(obj.material || {}),
    },
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      ...(obj.transform || {}),
    },
  }

  // solid mode에만 operation 필드 추가
  if (hasSolidOperation) {
    base.operation = obj.operation
  }

  return base
}

export function parseAIResponse(rawText) {
  // Extract JSON from the response (handle potential markdown fences)
  let jsonStr = rawText.trim()

  // Remove markdown code fences if present
  jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')

  // Find JSON object
  const start = jsonStr.indexOf('{')
  const end = jsonStr.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error('No valid JSON found in AI response')
  }
  jsonStr = jsonStr.slice(start, end + 1)

  let parsed
  try {
    parsed = JSON.parse(jsonStr)
  } catch (e) {
    throw new Error('Failed to parse AI response as JSON: ' + e.message)
  }

  const objects = parsed?.scene?.objects
  if (!Array.isArray(objects) || objects.length === 0) {
    throw new Error('AI response did not contain any 3D objects')
  }

  return {
    objects: objects.map(normalizeObject),
    camera: parsed?.scene?.camera || null,
  }
}
