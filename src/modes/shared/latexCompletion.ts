import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

const applyInsert = (view: EditorView, from: number, to: number, insert: string, cursorOffset?: number) => {
  const anchor = (cursorOffset !== undefined ? from + cursorOffset : from + insert.length)
  view.dispatch({ changes: { from, to, insert }, selection: EditorSelection.single(anchor) })
}

const applyInsertKillRight = (view: EditorView, from: number, to: number, insert: string, killChar: string, cursorOffset?: number) => {
  const next = view.state.doc.sliceString(to, to + 1)
  const changes: Array<{ from: number; to: number; insert: string }> = [{ from, to, insert }]
  if (next === killChar) changes.push({ from: to, to: to + 1, insert: '' })
  const anchor = (cursorOffset !== undefined ? from + cursorOffset : from + insert.length)
  view.dispatch({ changes, selection: EditorSelection.single(anchor) })
}

const USAGE: Record<string, number> = {}
const incUsage = (label: string) => { USAGE[label] = (USAGE[label] || 0) + 1 }
const defaultApply = (view: EditorView, item: Completion, from: number, to: number) => {
  const text = (typeof item.apply === 'string') ? item.apply : item.label
  applyInsert(view, from, to, text)
}
const wrapApply = (base: Completion['apply'] | undefined): Completion['apply'] => {
  return (view, item, from, to) => {
    incUsage(item.label)
    if (typeof base === 'string') { applyInsert(view, from, to, base); return }
    if (typeof base === 'function') { base(view, item, from, to); return }
    defaultApply(view as EditorView, item, from, to)
  }
}

const latexCompletions: Completion[] = [
  { label: '\\frac', type: 'function', detail: '{}{}', apply: (view, _item, from, to) => { const s = '\\frac{}{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\sqrt', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\sqrt{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\text', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\text{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\mathbb', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\mathbb{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\mathbf', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\mathbf{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\mathrm', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\mathrm{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\mathcal', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\mathcal{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\mathsf', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\mathsf{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\mathtt', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\mathtt{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\sum', type: 'function', detail: '_{}', apply: (view, _item, from, to) => { const s = '\\sum_{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\int', type: 'function', detail: '_{}^{}', apply: (view, _item, from, to) => { const s = '\\int_{}^{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\lim', type: 'function', detail: '_{}', apply: (view, _item, from, to) => { const s = '\\lim_{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\overline', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\overline{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\underline', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\underline{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\hat', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\hat{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\bar', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\bar{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\vec', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\vec{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\operatorname', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\operatorname{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\overbrace', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\overbrace{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\underbrace', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\underbrace{}'; const o = s.indexOf('{') + 1; applyInsert(view, from, to, s, o) } },
  { label: '\\p', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\frac{\\partial{}}{\\partial{}}'; const o = s.indexOf('\\partial{') + 9; applyInsert(view, from, to, s, o) } },
  { label: '\\pp', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\frac{\\partial{}}{\\partial{}}'; const o = s.indexOf('\\partial{') + 9; applyInsert(view, from, to, s, o) } },
  { label: '\\d', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\mathrm{d}'; const o = s.indexOf('\\mathrm{d}') + 10; applyInsert(view, from, to, s, o) } },
  { label: '\\dd', type: 'function', detail: '{}', apply: (view, _item, from, to) => { const s = '\\frac{\\mathrm{d}}{\\mathrm{d}}'; const o = s.indexOf('\\mathrm{d}') + 10; applyInsert(view, from, to, s, o) } },
  { label: '\\alpha', type: 'keyword' },
  { label: '\\beta', type: 'keyword' },
  { label: '\\gamma', type: 'keyword' },
  { label: '\\delta', type: 'keyword' },
  { label: '\\epsilon', type: 'keyword' },
  { label: '\\theta', type: 'keyword' },
  { label: '\\lambda', type: 'keyword' },
  { label: '\\mu', type: 'keyword' },
  { label: '\\pi', type: 'keyword' },
  { label: '\\rho', type: 'keyword' },
  { label: '\\sigma', type: 'keyword' },
  { label: '\\tau', type: 'keyword' },
  { label: '\\phi', type: 'keyword' },
  { label: '\\psi', type: 'keyword' },
  { label: '\\omega', type: 'keyword' },
  { label: '\\Gamma', type: 'keyword' },
  { label: '\\Delta', type: 'keyword' },
  { label: '\\Theta', type: 'keyword' },
  { label: '\\Lambda', type: 'keyword' },
  { label: '\\Xi', type: 'keyword' },
  { label: '\\Pi', type: 'keyword' },
  { label: '\\Sigma', type: 'keyword' },
  { label: '\\Upsilon', type: 'keyword' },
  { label: '\\Phi', type: 'keyword' },
  { label: '\\Psi', type: 'keyword' },
  { label: '\\Omega', type: 'keyword' },
  { label: '\\sin', type: 'function' },
  { label: '\\cos', type: 'function' },
  { label: '\\tan', type: 'function' },
  { label: '\\log', type: 'function' },
  { label: '\\ln', type: 'function' },
  { label: '\\cdot', type: 'keyword' },
  { label: '\\times', type: 'keyword' },
  { label: '\\leq', type: 'keyword' },
  { label: '\\geq', type: 'keyword' },
  { label: '\\neq', type: 'keyword' },
  { label: '\\approx', type: 'keyword' },
  { label: '\\equiv', type: 'keyword' },
  { label: '\\pm', type: 'keyword' },
  { label: '\\mp', type: 'keyword' },
  { label: '\\in', type: 'keyword' },
  { label: '\\notin', type: 'keyword' },
  { label: '\\subset', type: 'keyword' },
  { label: '\\subseteq', type: 'keyword' },
  { label: '\\supset', type: 'keyword' },
  { label: '\\supseteq', type: 'keyword' },
  { label: '\\forall', type: 'keyword' },
  { label: '\\exists', type: 'keyword' },
  { label: '\\nabla', type: 'keyword' },
  { label: '\\partial', type: 'keyword' },
  { label: '\\infty', type: 'keyword' },
  { label: '\\circ', type: 'keyword' },
  { label: '\\propto', type: 'keyword' },
  { label: '\\mapsto', type: 'keyword' },
  { label: '\\to', type: 'keyword' },
  { label: '\\rightarrow', type: 'keyword' },
  { label: '\\Leftarrow', type: 'keyword' },
  { label: '\\Rightarrow', type: 'keyword' },
  { label: '\\Leftrightarrow', type: 'keyword' },
  { label: '\\dots', type: 'keyword' },
  { label: '\\ldots', type: 'keyword' },
  { label: '\\cdots', type: 'keyword' }
]

const computeBoost = (label: string, q: string, usage: Record<string, number>) => {
  const lu = (usage[label] || 0)
  const base = 2 * Math.min(label.length, q.length)
  let score = base
  if (label.startsWith(q)) score += 50
  else if (label.toLowerCase().startsWith(q.toLowerCase())) score += 40
  else if (label.toLowerCase().includes(q.replace(/^\\/, '').toLowerCase())) score += 10
  score -= Math.abs(label.length - q.length)
  score += lu * 6
  return score
}

export const latexCompletionSource = (context: CompletionContext): CompletionResult | null => {
  // 禁止在换行符 "\\" 之后触发任何联想
  const justDoubleSlash = context.matchBefore(/\\\\$/)
  if (justDoubleSlash) return null

  const paren = context.matchBefore(/\\\($/)
  if (paren) {
    const two = paren.from > 1 ? context.state.doc.sliceString(paren.from - 2, paren.from) : ''
    if (two === '\\\\') return null
    const opt: Completion = {
      label: '\\left(  \\right)',
      type: 'keyword',
      apply: (view, item, from, to) => {
        incUsage(item.label)
        const s = '\\left(  \\right)'
        const o = s.indexOf('(') + 2
        applyInsertKillRight(view as EditorView, from, to, s, ')', o)
      }
    }
    return { from: paren.from, options: [opt], validFor: /\\\($/ }
  }
  const brace = context.matchBefore(/\\\{$/)
  if (brace) {
    const two = brace.from > 1 ? context.state.doc.sliceString(brace.from - 2, brace.from) : ''
    if (two === '\\\\') return null
    const opt: Completion = {
      label: '\\left\\{  \\right.',
      type: 'keyword',
      apply: (view, item, from, to) => {
        incUsage(item.label)
        const s = '\\left\\{  \\right.'
        const o = s.indexOf('{') + 2
        applyInsertKillRight(view as EditorView, from, to, s, '}', o)
      }
    }
    return { from: brace.from, options: [opt], validFor: /\\\{$/ }
  }
  const before = context.matchBefore(/\\[A-Za-z]*\*?$/)
  if (!before) return null
  // 以 "\\" 开头的命令不参与联想（换行用法），如 "\\a" 等
  const prev = before.from > 0 ? context.state.doc.sliceString(before.from - 1, before.from) : ''
  if (prev === '\\') return null
  const q = before.text
  const usage = USAGE
  const envs = [
    'align','align*','aligned','aligned*','alignedat','alignedat*','flalign','flalign*',
    'equation','equation*','gather','gather*','multline','multline*','split','cases',
    'matrix','pmatrix','bmatrix','Bmatrix','vmatrix','Vmatrix','smallmatrix'
  ]
  const envCompletions: Completion[] = envs.map(env => ({
    label: `\\${env}`,
    type: 'keyword',
    detail: 'env',
    apply: (view, _item, from, to) => { const s = `\\begin{${env}}\n\n\\end{${env}}`; const o = s.indexOf('\n') + 1; applyInsert(view as EditorView, from, to, s, o) }
  }))
  const base = latexCompletions.concat(envCompletions)
  const options = base.map(it => ({ ...it, boost: computeBoost(it.label, q, usage), apply: wrapApply(it.apply) }))
  return { from: before.from, options, validFor: /\\[A-Za-z]*\*?$/ }
}
