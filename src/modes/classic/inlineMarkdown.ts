import { EditorState } from 'prosemirror-state'
import { Decoration } from 'prosemirror-view'

type Range = { from: number; to: number; type: 'strong' | 'em' | 'code' }

function parseInline(text: string): Range[] {
  const ranges: Range[] = []
  const stack: Array<{ type: Range['type']; pos: number }> = []
  let i = 0
  while (i < text.length) {
    if (text.slice(i, i + 3) === '```') { i += 3; continue }
    if (text.slice(i, i + 2) === '**') {
      const idx = stack.findIndex(s => s.type === 'strong')
      if (idx === -1) stack.push({ type: 'strong', pos: i })
      else {
        const start = stack.splice(idx, 1)[0].pos
        ranges.push({ from: start, to: i + 2, type: 'strong' })
      }
      i += 2
      continue
    }
    if (text[i] === '*') {
      const idx = stack.findIndex(s => s.type === 'em')
      if (idx === -1) stack.push({ type: 'em', pos: i })
      else {
        const start = stack.splice(idx, 1)[0].pos
        ranges.push({ from: start, to: i + 1, type: 'em' })
      }
      i += 1
      continue
    }
    if (text[i] === '`') {
      const idx = stack.findIndex(s => s.type === 'code')
      if (idx === -1) stack.push({ type: 'code', pos: i })
      else {
        const start = stack.splice(idx, 1)[0].pos
        ranges.push({ from: start, to: i + 1, type: 'code' })
      }
      i += 1
      continue
    }
    i += 1
  }
  return ranges
}

export function buildInlineDecorations(state: EditorState): Decoration[] {
  const decos: Decoration[] = []
  const anchor = state.selection.anchor
  state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    const baseStart = pos + 1
    const text = node.textContent || ''
    const ranges = parseInline(text)
    for (const r of ranges) {
      const markerLen = r.type === 'strong' ? 2 : 1
      const absFrom = baseStart + r.from
      const absTo = baseStart + r.to
      const innerStart = absFrom + markerLen
      const innerEnd = absTo - markerLen
      const styleCls = r.type === 'strong' ? 'pm-inline-strong' : r.type === 'em' ? 'pm-inline-em' : 'pm-inline-code'
      if (innerStart < innerEnd) {
        decos.push(Decoration.inline(innerStart, innerEnd, { class: styleCls }))
      }
      const showMarkers = (
        anchor >= innerStart && anchor <= innerEnd
        || anchor === innerStart
        || anchor === innerEnd
        || anchor === absFrom
        || anchor === absTo
      )
      if (!showMarkers) {
        // Hide start marker
        decos.push(Decoration.inline(absFrom, absFrom + markerLen, { class: 'pm-marker-hidden' }))
        // Hide end marker
        decos.push(Decoration.inline(absTo - markerLen, absTo, { class: 'pm-marker-hidden' }))
      }
    }
    return true
  })
  return decos
}
