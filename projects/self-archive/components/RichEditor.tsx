'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const TEXT_COLORS = [
  { label: '기본',  value: '' },
  { label: '빨강',  value: '#ef4444' },
  { label: '주황',  value: '#f97316' },
  { label: '노랑',  value: '#eab308' },
  { label: '초록',  value: '#22c55e' },
  { label: '파랑',  value: '#3b82f6' },
  { label: '보라',  value: '#a855f7' },
  { label: '회색',  value: '#9ca3af' },
]

const HIGHLIGHT_COLORS = [
  { label: '없음',  value: '' },
  { label: '노랑',  value: '#fef08a' },
  { label: '연두',  value: '#bbf7d0' },
  { label: '하늘',  value: '#bfdbfe' },
  { label: '분홍',  value: '#fbcfe8' },
  { label: '주황',  value: '#fed7aa' },
  { label: '보라',  value: '#e9d5ff' },
]

interface Props {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
}

export default function RichEditor({ value, onChange, onBlur, placeholder, className }: Props) {
  const initialValue = useRef(value)
  const [bubbleRect, setBubbleRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const updateMenus = useCallback((ed: ReturnType<typeof useEditor>) => {
    if (!ed) return
    const { from, to } = ed.state.selection

    if (from !== to) {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        setBubbleRect(sel.getRangeAt(0).getBoundingClientRect())
      }
    } else {
      setBubbleRect(null)
    }
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        dropcursor: { color: '#3b82f6', width: 2 },
      }),
      BulletList.extend({ addInputRules: () => [] }),
      OrderedList.extend({ addInputRules: () => [] }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: htmlOrText(initialValue.current),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
      updateMenus(editor)
    },
    onSelectionUpdate: ({ editor }) => updateMenus(editor),
    onBlur: () => {
      onBlur?.()
      setTimeout(() => { setBubbleRect(null) }, 150)
    },
    editorProps: {
      attributes: {
        class: `notion-body outline-none ${className ?? ''}`,
        'data-placeholder': placeholder ?? '',
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor) return
    if (value === initialValue.current) return
    const current = editor.getHTML()
    if (current !== value) {
      editor.commands.setContent(htmlOrText(value))
      initialValue.current = value
    }
  }, [value, editor])

  const currentBlockType = () => {
    if (!editor) return 'p'
    if (editor.isActive('heading', { level: 1 })) return 'h1'
    if (editor.isActive('heading', { level: 2 })) return 'h2'
    if (editor.isActive('heading', { level: 3 })) return 'h3'
    if (editor.isActive('bulletList')) return 'ul'
    if (editor.isActive('orderedList')) return 'ol'
    if (editor.isActive('blockquote')) return 'quote'
    return 'p'
  }

  const setBlockType = (type: string) => {
    if (!editor) return
    switch (type) {
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break
      case 'ul': editor.chain().focus().toggleBulletList().run(); break
      case 'ol': editor.chain().focus().toggleOrderedList().run(); break
      case 'quote': editor.chain().focus().toggleBlockquote().run(); break
      default: editor.chain().focus().setParagraph().run()
    }
  }

  if (!editor) return null

  const bubbleStyle = bubbleRect ? {
    position: 'fixed' as const,
    top: Math.max(8, bubbleRect.top - 48),
    left: Math.max(8, bubbleRect.left + bubbleRect.width / 2),
    transform: 'translateX(-50%)',
    zIndex: 9999,
  } : null

  return (
    <div>
      {/* 항상 보이는 목록 툴바 */}
      <div className="flex items-center gap-0.5 mb-1.5" onMouseDown={e => e.preventDefault()}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="불릿 목록"
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-gray-900 text-white'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="text-sm leading-none">•</span>
          <span>목록</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="번호 목록"
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-gray-900 text-white'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="text-sm leading-none">1.</span>
          <span>번호</span>
        </button>
      </div>

      <EditorContent editor={editor} />

      {/* 버블 메뉴 (텍스트 선택 시) */}
      {mounted && bubbleStyle && bubbleRect && createPortal(
        <div style={bubbleStyle}
          className="flex items-center bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden select-none"
          onMouseDown={e => e.preventDefault()}
        >
          <select
            value={currentBlockType()}
            onChange={e => setBlockType(e.target.value)}
            className="text-xs text-gray-600 px-2 py-1.5 border-r border-gray-100 bg-white focus:outline-none cursor-pointer"
          >
            <option value="p">텍스트</option>
            <option value="h1">제목 1</option>
            <option value="h2">제목 2</option>
            <option value="h3">제목 3</option>
            <option value="ul">• 목록</option>
            <option value="ol">1. 번호</option>
            <option value="quote">인용</option>
          </select>

          <div className="flex items-center px-1 gap-0.5 border-r border-gray-100">
            <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게"><b>B</b></Btn>
            <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울기"><i>I</i></Btn>
            <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="밑줄"><u>U</u></Btn>
            <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="취소선"><s>S</s></Btn>
            <Btn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="코드">
              <span className="font-mono text-[10px]">{`</>`}</span>
            </Btn>
          </div>

          <div className="flex items-center px-1.5 gap-1 border-r border-gray-100 py-1.5">
            <span className="text-[10px] text-gray-300 mr-0.5">A</span>
            {TEXT_COLORS.map(c => (
              <button key={c.value} title={`글자: ${c.label}`}
                onClick={() => c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run()}
                className="w-4 h-4 rounded-full border border-gray-200 hover:scale-125 transition-transform flex-shrink-0"
                style={{ background: c.value || '#1f2937' }}
              />
            ))}
          </div>

          <div className="flex items-center px-1.5 gap-1 py-1.5">
            <span className="text-[10px] text-gray-300 mr-0.5">▌</span>
            {HIGHLIGHT_COLORS.map(c => (
              <button key={c.value} title={`형광: ${c.label}`}
                onClick={() => c.value ? editor.chain().focus().setHighlight({ color: c.value }).run() : editor.chain().focus().unsetHighlight().run()}
                className="w-4 h-4 rounded border border-gray-200 hover:scale-125 transition-transform flex-shrink-0 flex items-center justify-center"
                style={{ background: c.value || 'white' }}
              >
                {!c.value && <span className="text-gray-300 text-[9px] leading-none">✕</span>}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .notion-body { min-height: 2em; }

        .notion-body > p:first-child:only-child.is-empty::before {
          content: attr(data-placeholder);
          color: #d1d5db;
          pointer-events: none;
          float: left;
          height: 0;
        }

        /* Enter: 단락 간 여백 있음 / Shift+Enter: 같은 단락 내 줄바꿈 → 여백 없음 */
        .notion-body p { margin: 0 0 1em; line-height: 1.65; min-height: 1.65em; }
        .notion-body p:last-child { margin-bottom: 0; }

        .notion-body h1 { font-size: 1.875em; font-weight: 700; margin: 0.6em 0 0.45em; line-height: 1.25; }
        .notion-body h2 { font-size: 1.4em; font-weight: 600; margin: 0.5em 0 0.35em; line-height: 1.3; }
        .notion-body h3 { font-size: 1.15em; font-weight: 600; margin: 0.4em 0 0.25em; line-height: 1.4; color: #374151; }

        .notion-body ul { list-style: disc; padding-left: 1.4em; margin: 0.1em 0; }
        .notion-body ol { list-style: decimal; padding-left: 1.4em; margin: 0.1em 0; }
        .notion-body li { line-height: 1.75; }
        .notion-body li p { margin: 0; min-height: auto; }

        .notion-body blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 0.8em;
          margin: 0.3em 0;
          color: #6b7280;
        }

        .notion-body code {
          background: #f3f4f6;
          border-radius: 4px;
          padding: 0.1em 0.35em;
          font-family: ui-monospace, monospace;
          font-size: 0.85em;
          color: #be185d;
        }

        .notion-body strong { font-weight: 600; }
        .notion-body em { font-style: italic; }

      `}</style>
    </div>
  )
}

function Btn({ active, onClick, title, children }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button type="button" onMouseDown={e => { e.preventDefault(); onClick() }} title={title}
      className={`w-7 h-7 text-sm rounded flex items-center justify-center transition-colors ${
        active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`}
    >{children}</button>
  )
}

function htmlOrText(value: string): string {
  if (!value) return ''
  if (!value.startsWith('<')) {
    return value.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')
  }
  return value
}
