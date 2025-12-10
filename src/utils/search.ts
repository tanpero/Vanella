import type { EditorView } from 'prosemirror-view'

export function escapeReg(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

export function buildRegex(query: string, regexEnabled: boolean, caseSensitive: boolean, wholeWord: boolean): RegExp | null {
  if (!query) return null
  try {
    let source = regexEnabled ? query : escapeReg(query)
    if (wholeWord) source = `\\b${source}\\b`
    const flags = 'g' + (caseSensitive ? '' : 'i')
    return new RegExp(source, flags)
  } catch { return null }
}

export function computeSourceMatches(text: string, query: string, regexEnabled: boolean, caseSensitive: boolean, wholeWord: boolean): Array<{ from: number; to: number }> {
  const re = buildRegex(query, regexEnabled, caseSensitive, wholeWord)
  if (!re) return []
  const out: Array<{ from: number; to: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) { out.push({ from: m.index, to: m.index + m[0].length }); if (m[0].length === 0) re.lastIndex++ }
  return out
}

export function computePmMatches(view: EditorView, query: string, regexEnabled: boolean, caseSensitive: boolean, wholeWord: boolean): Array<{ from: number; to: number }> {
  if (!view || !query) return []
  const re = buildRegex(query, regexEnabled, caseSensitive, wholeWord)
  if (!re) return []
  const out: Array<{ from: number; to: number }> = []
  const doc = view.state.doc
  doc.descendants((node, from) => {
    if (node.isText && typeof node.text === 'string') {
      const text = node.text
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) { const s = from + m.index; const e = s + m[0].length; out.push({ from: s, to: e }); if (m[0].length === 0) re.lastIndex++ }
    }
  })
  return out
}

export function replaceWith(query: string, replaceQuery: string, segment: string, regexEnabled: boolean, caseSensitive: boolean): string {
  const re = buildRegex(query, regexEnabled, caseSensitive, false)
  if (!re) return segment
  return segment.replace(re, replaceQuery)
}

export function replaceAllText(text: string, query: string, replaceQuery: string, regexEnabled: boolean, caseSensitive: boolean, wholeWord: boolean): string {
  const re = buildRegex(query, regexEnabled, caseSensitive, wholeWord)
  if (!re) return text
  return text.replace(re, replaceQuery)
}

