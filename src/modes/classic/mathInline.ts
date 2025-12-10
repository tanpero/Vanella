import { EditorState } from 'prosemirror-state'
import { Decoration } from 'prosemirror-view'
import { renderInline } from '@/latex/mathjax'

/*
  行内数学预览（$...$ 与 \(...\)）
  - 解析行内数学范围，避免与 $$ 块级围栏冲突
  - 非选中状态下隐藏原始标记并以 SVG 预览替代
  - 选中状态下在中点插入小型预览盒，便于编辑时参考
*/

// 扫描文本，查找 $...$ 或 \(...\) 的成对范围
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

// 将行内数学转换为预览装饰；选中时改为锚点预览
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
          const svg = node.querySelector('svg') as SVGElement | null
          if (svg && svg.style.verticalAlign) {
            el.style.verticalAlign = svg.style.verticalAlign
          }
          el.appendChild(node)
          return el
        })
        decos.push(widget)
      } else {
        const mid = from + Math.floor((to - from) / 2)
        const preview = Decoration.widget(mid, () => {
          const anchor = document.createElement('span')
          anchor.className = 'pm-math-inline-anchor'
          const box = document.createElement('div')
          box.className = 'pm-math-inline-preview'
          const node = renderInline(r.raw)
          box.appendChild(node)
          anchor.appendChild(box)
          return anchor
        }, { side: 0 })
        decos.push(preview)
      }
    }
  })
  return decos
}
