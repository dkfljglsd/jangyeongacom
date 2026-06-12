'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { useEffect, useRef } from 'react'

const TEXT_COLORS = [
  { label: '기본', value: '' },
  { label: '빨강', value: '#ef4444' },
  { label: '주황', value: '#f97316' },
  { label: '노랑', value: '#eab308' },
  { label: '초록', value: '#22c55e' },
  { label: '파랑', value: '#3b82f6' },
  { label: '보라', value: '#a855f7' },
  { label: '회색', value: '#6b7280' },
]

const HIGHLIGHT_COLORS = [
  { label: '없음', value: '' },
  { label: '노랑', value: '#fef08a' },
  { label: '초록', value: '#bbf7d0' },
  { label: '파랑', value: '#bfdbfe' },
  { label: '분홍', value: '#fbcfe8' },
  { label: '주황', value: '#fed7aa' },
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: htmlOrText(initialValue.current),
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        class: `outline-none min-h-[2em] ${className ?? ''}`,
        'data-placeholder': placeholder ?? '',
      },
    },
    immediatelyRender: false,
  })

  // 외부에서 value가 바뀌면 동기화 (다른 노트로 전환 시)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== value && value !== initialValue.current) {
      editor.commands.setContent(htmlOrText(value))
      initialValue.current = value
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div className="group">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-0.5 mb-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
        <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게">
          <b>B</b>
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울기">
          <i>I</i>
        </ToolBtn>
        <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="밑줄">
          <u>U</u>
        </ToolBtn>
        <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="취소선">
          <s>S</s>
        </ToolBtn>

        <div className="w-px h-4 bg-gray-200 mx-0.5" />

        {/* 글자 색 */}
        <div className="relative">
          <select
            className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white cursor-pointer focus:outline-none"
            title="글자 색"
            onChange={e => {
              if (e.target.value === '') {
                editor.chain().focus().unsetColor().run()
              } else {
                editor.chain().focus().setColor(e.target.value).run()
              }
            }}
            defaultValue=""
          >
            {TEXT_COLORS.map(c => (
              <option key={c.value} value={c.value} style={{ color: c.value || 'inherit' }}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* 하이라이트 */}
        <div className="relative">
          <select
            className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white cursor-pointer focus:outline-none"
            title="하이라이트"
            onChange={e => {
              if (e.target.value === '') {
                editor.chain().focus().unsetHighlight().run()
              } else {
                editor.chain().focus().setHighlight({ color: e.target.value }).run()
              }
            }}
            defaultValue=""
          >
            {HIGHLIGHT_COLORS.map(c => (
              <option key={c.value} value={c.value} style={{ backgroundColor: c.value || 'transparent' }}>
                🖊 {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-4 bg-gray-200 mx-0.5" />

        <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="목록">
          ≡
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="번호 목록">
          1.
        </ToolBtn>
        <ToolBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="코드">
          {'<>'}
        </ToolBtn>
      </div>

      {/* 에디터 본문 */}
      <EditorContent editor={editor} />

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #d1d5db;
          pointer-events: none;
          float: left;
          height: 0;
        }
        .ProseMirror { white-space: pre-wrap; }
        .ProseMirror ul { list-style: disc; padding-left: 1.2em; }
        .ProseMirror ol { list-style: decimal; padding-left: 1.2em; }
        .ProseMirror code { background: #f3f4f6; border-radius: 3px; padding: 0.1em 0.3em; font-size: 0.875em; }
      `}</style>
    </div>
  )
}

function ToolBtn({ active, onClick, title, children }: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={`w-6 h-6 text-xs rounded flex items-center justify-center transition-colors ${
        active ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function htmlOrText(value: string): string {
  if (!value) return ''
  // 기존 plain text를 HTML로 변환 (줄바꿈 → <p>)
  if (!value.startsWith('<')) {
    return value
      .split('\n')
      .map(line => `<p>${line || '<br>'}</p>`)
      .join('')
  }
  return value
}
