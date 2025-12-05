import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView as PMEditorView } from 'prosemirror-view'
import { TextSelection } from 'prosemirror-state'
import { EditorState as CMState } from '@codemirror/state'
import { EditorView as CMView, keymap, drawSelection, dropCursor, highlightActiveLine } from '@codemirror/view'
import { history, defaultKeymap } from '@codemirror/commands'
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { useEditorStore } from '@/stores/editorStore'
import { mapTheme } from '@/modes/shared/codemirrorConfig'
import ABCJS from 'abcjs'

export class AbcBlockView {
  node: PMNode
  view: PMEditorView
  getPos: () => number
  dom: HTMLElement
  cm: CMView | null = null
  preview: HTMLDivElement
  rowEl: HTMLDivElement | null = null
  updating = false

  constructor(node: PMNode, view: PMEditorView, getPos: () => number) {
    this.node = node
    this.view = view
    this.getPos = getPos

    const wrapper = document.createElement('div')
    wrapper.className = 'pm-abc-block'
    wrapper.style.display = 'block'

    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.alignItems = 'stretch'

    const gutter = document.createElement('div')
    gutter.className = 'pm-code-gutter'
    gutter.style.width = '36px'
    gutter.style.flex = '0 0 36px'
    const isDark = useEditorStore.getState().config.theme === 'dark'
    gutter.style.background = isDark ? '#0b1220' : '#f3f4f6'
    gutter.style.color = isDark ? '#9ca3af' : '#9ca3af'
    gutter.style.padding = '6px 6px 6px 8px'
    gutter.style.boxSizing = 'border-box'
    gutter.style.textAlign = 'right'
    gutter.style.fontFamily = 'Consolas, Monaco, monospace'
    gutter.style.fontSize = '12px'
    gutter.style.lineHeight = '1.6'
    gutter.style.userSelect = 'none'
    gutter.style.pointerEvents = 'none'
    gutter.setAttribute('aria-hidden', 'true')
    gutter.setAttribute('contentEditable', 'false')

    const host = document.createElement('div')
    host.style.flex = '1 1 auto'
    host.style.minWidth = '0'
    host.style.width = '100%'

    const { config } = useEditorStore.getState()
    const chosenTheme = isDark ? config.codeblockThemeDark : config.codeblockThemeLight
    const themeExt = mapTheme(chosenTheme, isDark)

    const cmState = CMState.create({
      doc: node.textContent || '',
      extensions: [
        history(),
        keymap.of([...defaultKeymap]),
        drawSelection(),
        dropCursor(),
        highlightActiveLine(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle),
        CMView.theme({
          '&': { fontFamily: 'Consolas, Monaco, monospace', fontSize: '15px', transition: 'background-color .25s, color .25s, border-color .25s' },
          '.cm-content': { padding: '8px' }
        }),
        themeExt
      ]
    })
    const cm = new CMView({
      state: cmState,
      parent: host,
      dispatch: tr => {
        cm.update([tr])
        if (tr.docChanged) {
          const pos = this.getPos()
          const from = pos + 1
          const to = pos + this.node.nodeSize - 1
          const text = cm.state.doc.toString()
          const trPM = this.view.state.tr.replaceWith(from, to, this.view.state.schema.text(text))
          this.updating = true
          this.view.dispatch(trPM)
          this.updating = false
          this.renderScore(text)
          this.renderLineNumbers(gutter, text)
        }
      }
    })

    row.appendChild(gutter)
    row.appendChild(host)
    wrapper.appendChild(row)

    const preview = document.createElement('div')
    preview.className = 'pm-abc-block-preview'
    preview.style.padding = '8px'
    preview.style.minHeight = '32px'
    preview.style.overflow = 'auto'
    preview.style.textAlign = 'center'

    wrapper.appendChild(preview)

    this.dom = wrapper
    this.cm = cm
    this.preview = preview
    this.rowEl = row

    row.style.display = 'flex'
    const initialSrc = cm.state.doc.toString().trim()
    preview.style.display = initialSrc.length ? 'block' : 'none'
    if (this.isSelectionInside()) setTimeout(() => { this.cm?.focus() }, 0)

    this.renderScore(cm.state.doc.toString())
    this.renderLineNumbers(gutter, node.textContent || '')

    host.addEventListener('focusin', () => {
      if (this.rowEl) this.rowEl.style.display = 'flex'
      const cur = this.cm?.state.doc.toString().trim() || ''
      this.preview.style.display = cur.length ? 'block' : 'none'
    })
    host.addEventListener('focusout', () => {
      setTimeout(() => {
        const focused = !!this.cm?.hasFocus
        if (!focused) {
          const cur = this.cm?.state.doc.toString().trim() || ''
          if (this.rowEl) this.rowEl.style.display = cur.length ? 'none' : 'flex'
          this.preview.style.display = cur.length ? 'block' : 'none'
        }
      }, 120)
    })
    preview.addEventListener('click', () => {
      const pos = this.getPos()
      const end = pos + this.node.nodeSize
      const tr = this.view.state.tr.setSelection(TextSelection.create(this.view.state.doc, end - 1))
      this.view.dispatch(tr)
      if (this.rowEl) this.rowEl.style.display = 'flex'
      const cur = this.cm?.state.doc.toString().trim() || ''
      this.preview.style.display = cur.length ? 'block' : 'none'
      this.cm?.focus()
    })
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    const text = node.textContent || ''
    if (!this.updating && this.cm && text !== this.cm.state.doc.toString()) {
      this.cm.dispatch({ changes: { from: 0, to: this.cm.state.doc.length, insert: text } })
      this.renderScore(text)
      const gutter = this.dom.querySelector('.pm-code-gutter') as HTMLDivElement
      if (gutter) this.renderLineNumbers(gutter, text)
    }
    const hasSrc = (text.trim().length > 0)
    const inside = this.isSelectionInside()
    const row = this.rowEl
    if (row) row.style.display = (!hasSrc || inside) ? 'flex' : 'none'
    this.preview.style.display = hasSrc ? 'block' : 'none'
    return true
  }

  selectNode() {}
  stopEvent() { return true }
  ignoreMutation() { return true }
  destroy() { this.cm?.destroy() }

  private isSelectionInside(): boolean {
    try {
      const pos = this.getPos()
      const from = pos + 1
      const to = pos + this.node.nodeSize - 1
      const sel = this.view.state.selection
      const a = sel.from
      const b = sel.to
      return (a >= from && a <= to) || (b >= from && b <= to)
    } catch { return false }
  }

  private renderScore(code: string) {
    try {
      this.preview.innerHTML = ''
      const paper = document.createElement('div')
      paper.style.display = 'inline-block'
      paper.style.margin = '0 auto'
      paper.style.scale = '0.8'
      this.preview.appendChild(paper)
      ABCJS.renderAbc(paper, code, { responsive: 'resize' })
      const isDark = useEditorStore.getState().config.theme === 'dark'
      const svg = this.preview.querySelector('svg') as SVGElement | null
      if (svg && isDark) {
        const paths = Array.from(svg.querySelectorAll('path')) as SVGPathElement[]
        paths.forEach(p => { p.setAttribute('stroke', '#e5e7eb') })
        const texts = Array.from(svg.querySelectorAll('text')) as SVGTextElement[]
        texts.forEach(t => { t.setAttribute('fill', '#e5e7eb') })
      }
    } catch (e) {
      const isDark = useEditorStore.getState().config.theme === 'dark'
      const box = document.createElement('div')
      box.style.border = isDark ? '1px solid #374151' : '1px solid #f59e0b'
      box.style.background = isDark ? '#1f2937' : '#fff7ed'
      box.style.color = isDark ? '#e5e7eb' : '#7c2d12'
      box.style.borderRadius = '8px'
      box.style.padding = '10px 12px'
      box.style.fontFamily = 'Consolas, Monaco, monospace'
      box.style.fontSize = '13px'
      box.style.lineHeight = '1.6'
      const title = document.createElement('div')
      title.textContent = '⚠️ ABC 解析错误'
      title.style.fontWeight = '600'
      title.style.marginBottom = '6px'
      const detail = document.createElement('pre')
      detail.textContent = String((e as { message?: string })?.message || e || 'ABC render error')
      detail.style.margin = '0'
      detail.style.whiteSpace = 'pre-wrap'
      detail.style.background = isDark ? '#111827' : '#fff'
      detail.style.border = isDark ? '1px solid #374151' : '1px solid #f59e0b'
      detail.style.borderRadius = '6px'
      detail.style.padding = '8px'
      const hint = document.createElement('div')
      hint.textContent = '点击以编辑修复'
      hint.style.marginTop = '6px'
      hint.style.opacity = '0.8'
      box.appendChild(title)
      box.appendChild(detail)
      box.appendChild(hint)
      this.preview.innerHTML = ''
      this.preview.appendChild(box)
    }
  }

  private renderLineNumbers(gutter: HTMLDivElement, text: string) {
    const lines = text.split('\n').length
    const frag = document.createDocumentFragment()
    gutter.innerHTML = ''
    for (let i = 1; i <= lines; i++) {
      const span = document.createElement('div')
      span.textContent = String(i)
      frag.appendChild(span)
    }
    gutter.appendChild(frag)
  }
}
