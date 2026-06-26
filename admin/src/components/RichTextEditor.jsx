import React, { useEffect } from 'react'
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

export default function RichTextEditor(props) {
  const { value, onChange, minHeight = 300 } = props

  useEffect(() => {
    ensureQuillStylesheet()
  }, [])

  return (
    <div className="admin-rich-text-editor" style={{ minHeight }}>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        style={{ height: minHeight }}
        modules={QUILL_MODULES}
      />
    </div>
  )
}
