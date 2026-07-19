import React, { useEffect, useState } from 'react'
import ReactQuill from 'react-quill'

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ['clean'],
  ],
}

export function ensureQuillStylesheet() {
  if (typeof document === 'undefined') return
  const id = 'quill-snow-css'
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = 'https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css'
  document.head.appendChild(link)
}

/**
 * @param {{
 *   value?: string
 *   onChange?: (html: string) => void
 *   minHeight?: number
 *   modeToggle?: boolean
 * }} props
 */
export default function RichTextEditor(props) {
  const { value, onChange, minHeight = 300, modeToggle = false } = props
  const [mode, setMode] = useState('visual')

  useEffect(() => {
    ensureQuillStylesheet()
  }, [])

  return (
    <div className="admin-rich-text-editor" style={{ minHeight }}>
      {modeToggle ? (
        <div className="admin-rich-text-editor__modes" role="tablist" aria-label="Editor mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'visual'}
            className={`admin-rich-text-editor__mode${mode === 'visual' ? ' is-active' : ''}`}
            onClick={() => setMode('visual')}
          >
            Visual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'html'}
            className={`admin-rich-text-editor__mode${mode === 'html' ? ' is-active' : ''}`}
            onClick={() => setMode('html')}
          >
            HTML
          </button>
        </div>
      ) : null}

      {mode === 'html' ? (
        <textarea
          className="admin-rich-text-editor__html"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          style={{ minHeight }}
          spellCheck={false}
          placeholder="<p>Page content…</p>"
        />
      ) : (
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={onChange}
          style={{ height: minHeight }}
          modules={QUILL_MODULES}
        />
      )}
    </div>
  )
}
