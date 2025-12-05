import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView as PMEditorView } from 'prosemirror-view'
import { TextSelection } from 'prosemirror-state'
import { renderBlock } from '@/latex/mathjax'
import { EditorState as CMState } from '@codemirror/state'
import { EditorView as CMView, keymap, drawSelection, dropCursor, highlightActiveLine } from '@codemirror/view'
import { history, defaultKeymap } from '@codemirror/commands'
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle, StreamLanguage } from '@codemirror/language'
import { closeBrackets } from '@codemirror/autocomplete'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { useEditorStore } from '@/stores/editorStore'
import { mapTheme } from '@/modes/shared/codemirrorConfig'

export class MathBlockView {
  node: PMNode
  view: PMEditorView
  getPos: () => number
  dom: HTMLElement
  cm: CMView | null = null
  preview: HTMLDivElement
  box: HTMLDivElement
  input: HTMLInputElement
  updating = false
  radiosEl: HTMLDivElement | null = null
  rowEl: HTMLDivElement | null = null

  constructor(node: PMNode, view: PMEditorView, getPos: () => number) {
    this.node = node
    this.view = view
    this.getPos = getPos

    const wrapper = document.createElement('div')
    wrapper.className = 'pm-math-block'
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
    ;(gutter as any).contentEditable = 'false'

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
        closeBrackets(),
        syntaxHighlighting(defaultHighlightStyle),
        StreamLanguage.define(stex),
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
          this.renderPreview(text, this.node.attrs?.env)
          this.renderLineNumbers(gutter, text)
        }
      }
    })

    row.appendChild(gutter)
    row.appendChild(host)
    wrapper.appendChild(row)
    const preview = document.createElement('div')
    preview.className = 'pm-math-block-preview'
    preview.style.padding = '8px'
    preview.style.minHeight = '32px'
    preview.style.borderTop = '1px solid #e5e7eb'
    preview.style.overflow = 'auto'

    const box = document.createElement('div')
    box.style.display = 'none'
    box.style.borderTop = '1px solid #e5e7eb'
    box.style.padding = '6px 8px'

    // remove env input field; use radio group only

    const envs = ['regular','equation','align','align*','gather','gather*','multline','split','cases']
    const radios = document.createElement('div')
    radios.className = 'pm-math-envs'
    envs.forEach(name => {
      const label = document.createElement('label')
      label.style.marginRight = '8px'
      const radio = document.createElement('input')
      radio.type = 'radio'
      radio.name = `pm-math-env-${this.getPos()}`
      radio.value = name
      radio.checked = (name === (node.attrs?.env || 'regular'))
      radio.addEventListener('change', () => {
        const pos = this.getPos()
        const env = name === 'regular' ? '' : name
        const attrs = { ...this.node.attrs, env }
        const tr = this.view.state.tr.setNodeMarkup(pos, null, attrs)
        this.view.dispatch(tr)
        const text = this.cm?.state.doc.toString() || ''
        const det = this.detectOuterEnv(text)
        let body = text
        if (det) body = det.body
        if (env) {
          // maintain body-only model; env stored in attrs
          if (det && det.env !== env) body = det.body
        }
        if (this.cm) {
          this.cm.dispatch({ changes: { from: 0, to: this.cm.state.doc.length, insert: body } })
        }
        this.renderPreview(body, env)
      })
      label.appendChild(radio)
      const span = document.createElement('span')
      span.textContent = name
      label.appendChild(span)
      radios.appendChild(label)
    })
    box.appendChild(radios)
    this.radiosEl = radios

    host.addEventListener('focusin', () => { box.style.display = 'block' })
    host.addEventListener('focusout', () => {
      setTimeout(() => { box.style.display = 'none'; this.hideEditorIfBlur() }, 150)
    })

    // host appended to row above
    wrapper.appendChild(preview)
    wrapper.appendChild(box)
    this.dom = wrapper
    this.cm = cm
    this.preview = preview
    this.box = box
    this.rowEl = row
    // initial display based on selection inside
    const inside = this.isSelectionInside()
    if (!inside) {
      row.style.display = 'none'
      preview.style.display = 'block'
    }
    // focus editor on create when inside
    if (inside) setTimeout(() => { this.cm?.focus() }, 0)
    this.renderLineNumbers(gutter, node.textContent || '')
    // detect env from pasted/raw content on init
    const initialText = cm.state.doc.toString()
    const det = this.detectOuterEnv(initialText)
    if (det) {
      if (this.cm) {
        this.cm.dispatch({ changes: { from: 0, to: this.cm.state.doc.length, insert: det.body } })
      }
      const pos = this.getPos()
      const attrs = { ...this.node.attrs, env: det.env }
      const tr = this.view.state.tr.setNodeMarkup(pos, null, attrs)
      this.view.dispatch(tr)
      this.setRadio(det.env || '')
      this.renderPreview(det.body, det.env)
    } else {
      this.renderPreview(initialText, node.attrs?.env)
    }

    // clicking below should create a new empty line at tail
    preview.addEventListener('click', () => {
      const pos = this.getPos()
      const end = pos + this.node.nodeSize
      const state = this.view.state
      const doc = state.doc
      const isTail = end === doc.content.size
      let tr = state.tr
      if (isTail) {
        const last = doc.lastChild
        const needNewLine = !last || last.type.name !== 'paragraph' || (last.textContent || '').length !== 0
        if (needNewLine) {
          tr = tr.insert(end, this.view.state.schema.nodes.paragraph.create())
        }
      }
      const nextDoc = tr.doc || this.view.state.doc
      const selPos = Math.min((tr.doc ? tr.doc.content.size : nextDoc.content.size), end + 1)
      tr = tr.setSelection(TextSelection.create(tr.doc || this.view.state.doc, end + 1))
      this.view.dispatch(tr)
      // show editor when selection moves into this node
      if (this.rowEl) this.rowEl.style.display = 'flex'
      this.cm?.focus()
    })
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    const text = node.textContent || ''
    if (!this.updating && this.cm && text !== this.cm.state.doc.toString()) {
      this.cm.dispatch({ changes: { from: 0, to: this.cm.state.doc.length, insert: text } })
      // update preview; also update radio when env attr changes
      this.setRadio(node.attrs?.env || '')
      this.renderPreview(text, node.attrs?.env)
      const gutter = this.dom.querySelector('.pm-code-gutter') as HTMLDivElement
      if (gutter) this.renderLineNumbers(gutter, text)
    }
    // toggle editor visibility based on whether selection is inside
    const inside = this.isSelectionInside()
    const row = this.rowEl
    if (row) row.style.display = inside ? 'flex' : 'none'
    this.preview.style.display = 'block'
    return true
  }

  selectNode() {}
  stopEvent() { return true }
  ignoreMutation() { return true }
  destroy() { this.cm?.destroy() }

  private renderPreview(text: string, env?: string) {
    const raw = env ? `\\begin{${env}} ${text} \\end{${env}}` : text
    this.preview.innerHTML = ''
    const el = renderBlock(raw)
    this.preview.appendChild(el)
    // center for regular env
    if (!env) {
      this.preview.style.textAlign = 'center'
    } else {
      this.preview.style.textAlign = ''
    }
  }

  private detectOuterEnv(text: string): { env: string, body: string } | null {
    const m = /^\s*\\begin\{([A-Za-z]+\*?)\}([\s\S]*?)\\end\{\1\}\s*$/.exec(text)
    if (!m) return null
    return { env: m[1], body: m[2] }
  }

  private setRadio(env?: string) {
    const radios = this.radiosEl
    if (!radios) return
    const target = env && env.length ? env : 'regular'
    const inputs = Array.from(radios.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]
    inputs.forEach(i => { i.checked = (i.value === target) })
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

  private hideEditorIfBlur() {
    const cm = this.cm
    if (!cm) return
    const hasFocus = cm.hasFocus
    if (!hasFocus) {
      if (this.rowEl) this.rowEl.style.display = 'none'
      if (this.preview) this.preview.style.display = 'block'
      this.dom.addEventListener('click', () => {
        if (this.rowEl) this.rowEl.style.display = 'flex'
        if (this.preview) this.preview.style.display = 'block'
        this.cm?.focus()
      }, { once: true })
    }
  }

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
}
