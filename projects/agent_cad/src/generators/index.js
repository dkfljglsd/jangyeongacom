import { generateKoreanFlagSVG } from './koreanFlag'
import { generateUSFlagSVG } from './usFlag'

const TEMPLATES = [
  {
    id: 'korean_flag',
    keywords: ['태극기', '한국 국기', '대한민국 국기', 'korean flag', '한국기'],
    generator: generateKoreanFlagSVG,
    defaultSize: [300, 200],
  },
  {
    id: 'us_flag',
    keywords: ['미국 국기', '성조기', 'us flag', 'american flag', '미국기'],
    generator: generateUSFlagSVG,
    defaultSize: [300, 157.89],
  },
]

function parseSizeMM(text) {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*mm\s*[×x×]\s*(\d+(?:\.\d+)?)\s*mm/i,
    /가로\s*(\d+(?:\.\d+)?)\s*mm.*?세로\s*(\d+(?:\.\d+)?)\s*mm/i,
    /(\d+(?:\.\d+)?)\s*[×x×]\s*(\d+(?:\.\d+)?)/,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) return [parseFloat(m[1]), parseFloat(m[2])]
  }
  return null
}

export function detectTemplate(text) {
  const lower = text.toLowerCase()
  return TEMPLATES.find((tmpl) =>
    tmpl.keywords.some((kw) => lower.includes(kw.toLowerCase()))
  ) ?? null
}

export function generateFromTemplate(text) {
  const tmpl = detectTemplate(text)
  if (!tmpl) return null
  const [w, h] = parseSizeMM(text) ?? tmpl.defaultSize
  return tmpl.generator(w, h)
}
