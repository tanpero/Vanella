import { EditorState } from 'prosemirror-state'
import { Decoration } from 'prosemirror-view'
import { renderInline } from '@/latex/mathjax'

function findInlineRanges(text: string) {
  const ranges: Array<{ from: number; to: number; raw: string }> = []
  let i = 0
  while (i < text.length) {
    if (text[i] === '$') {
      if (text[i + 1] === '$') { i += 2; continue } // skip block fence
      let j = i + 1
      while (j < text.length && text[j] !== '$') j++
      if (j >= text.length) { i = j; continue }
      if (j + 1 < text.length && text[j + 1] === '$') { i = j + 2; continue }
      if (j < text.length) {
        const raw = text.slice(i + 1, j)
        ranges.push({ from: i, to: j + 1, raw })
        i = j + 1
        continue
      }
    }
    if (text[i] === '\\' && text[i + 1] === '(') {
      let j = i + 2
      while (j + 1 < text.length && !(text[j] === '\\' && text[j + 1] === ')')) j++
      if (j + 1 >= text.length) { i = j; continue }
      if (j < text.length) {
        const raw = text.slice(i + 2, j)
        ranges.push({ from: i, to: j + 2, raw })
        i = j + 2
        continue
      }
    }
    i++
  }
  return ranges
}

export function buildMathInlineDecorations(state: EditorState): Decoration[] {
  const decos: Decoration[] = []
  const sel = state.selection
  state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return
    const text = node.textContent || ''
    if (text.indexOf('$$') !== -1) return
    const ranges = findInlineRanges(text)
    for (const r of ranges) {
      const from = pos + 1 + r.from
      const to = pos + 1 + r.to
      const inSel = sel.from >= from && sel.from <= to
      if (!inSel) {
        decos.push(Decoration.inline(from, to, { class: 'pm-marker-hidden' }))
        const widget = Decoration.widget(from, () => {
          const el = document.createElement('span')
          el.className = 'pm-math-inline'
          const node = renderInline(r.raw)
          el.appendChild(node)
          return el
        })
        decos.push(widget)
      } else {
        const preview = Decoration.widget(to, () => {
          const box = document.createElement('div')
          box.className = 'pm-math-inline-preview'
          const node = renderInline(r.raw)
          box.appendChild(node)
          return box
        }, { side: 1 })
        decos.push(preview)
      }
    }
  })
  return decos
}
