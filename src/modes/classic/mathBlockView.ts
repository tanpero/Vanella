import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView as PMEditorView } from 'prosemirror-view'
import { TextSelection } from 'prosemirror-state'
import { EditorState as CMState, EditorSelection } from '@codemirror/state'
import { EditorView as CMView, keymap, drawSelection, dropCursor, highlightActiveLine } from '@codemirror/view'
import { history, defaultKeymap } from '@codemirror/commands'
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle, StreamLanguage } from '@codemirror/language'
import { closeBrackets, autocompletion, acceptCompletion } from '@codemirror/autocomplete'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { useEditorStore } from '@/stores/editorStore'
import { mapTheme } from '@/modes/shared/codemirrorConfig'
import { latexCompletionSource } from '@/modes/shared/latexCompletion'

const deleteEmptyBraces = (view: CMView) => {
  const sel = view.state.selection
  const range = sel.main
  if (!range.empty) return false
  const pos = range.from
  if (pos <= 0 || pos >= view.state.doc.length) return false
  const left = view.state.doc.sliceString(pos - 1, pos)
  const right = view.state.doc.sliceString(pos, pos + 1)
  if (left === '{' && right === '}') {
    view.dispatch({ changes: { from: pos - 1, to: pos + 1, insert: '' }, selection: EditorSelection.single(pos - 1) })
    return true
  }
  return false
}

/*
  MathBlockView：LaTeX 数学块编辑与预览
  - 使用 CodeMirror（stex）编辑纯文本公式；支持自动补全与括号匹配
  - 公式环境 env 通过单选按钮选择，保存在节点 attrs 中，编辑区始终仅存 body
  - 预览采用 MathJax 渲染，支持浅/深主题居中显示
  - 根据焦点状态淡入/淡出编辑区与预览，改善 Typora 式编辑体验
*/

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
  previewTick = 0
  previewTimer: number | undefined
  previewLastRaw: string | undefined
  dark: boolean = false
  prevThemeKey?: string
  unsub?: () => void

  constructor(node: PMNode, view: PMEditorView, getPos: () => number) {
    this.node = node
    this.view = view
    this.getPos = getPos

    // 外层包裹元素与编辑行（gutter+CM）
    const wrapper = document.createElement('div')
    wrapper.className = 'pm-math-block'
    wrapper.style.display = 'block'

    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.alignItems = 'stretch'
    row.className = 'pm-block-editor-row'
    const gutter = document.createElement('div')
    gutter.className = 'pm-code-gutter'
    gutter.style.width = '36px'
    gutter.style.flex = '0 0 36px'
    const isDark = useEditorStore.getState().config.theme === 'dark'
    this.dark = isDark
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
    this.prevThemeKey = chosenTheme

    const cmState = CMState.create({
      doc: node.textContent || '',
      extensions: [
        history(),
        keymap.of([{ key: 'Tab', run: acceptCompletion }]),
        keymap.of([{ key: 'Backspace', run: deleteEmptyBraces }, { key: 'Delete', run: deleteEmptyBraces }]),
        keymap.of([...defaultKeymap]),
        drawSelection(),
        dropCursor(),
        highlightActiveLine(),
        bracketMatching(),
        closeBrackets(),
        autocompletion({ override: [latexCompletionSource], activateOnTyping: true }),
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
          let trPM = text.length > 0
            ? this.view.state.tr.replaceWith(from, to, this.view.state.schema.text(text))
            : this.view.state.tr.deleteRange(from, to)
          try {
            const sel = TextSelection.create(trPM.doc || this.view.state.doc, Math.max(1, pos + 1))
            trPM = trPM.setSelection(sel)
          } catch { void 0 }
          this.updating = true
          this.view.dispatch(trPM)
          this.updating = false
          if (this.rowEl) this.fadeInRow()
          this.cm?.focus()
          this.schedulePreview(text, this.node.attrs?.env, 120)
          this.renderLineNumbers(gutter, text)
        }
      }
    })

    row.appendChild(gutter)
    row.appendChild(host)
    wrapper.appendChild(row)
    const preview = document.createElement('div')
    preview.className = 'pm-math-block-preview pm-block-preview'
    preview.style.padding = '8px'
    preview.style.minHeight = '32px'
    preview.style.overflow = 'auto'
    preview.style.display = 'block'

    const box = document.createElement('div')
    box.style.display = 'none'
    box.style.padding = '6px 8px'

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
        this.schedulePreview(body, env, 30)
        if (this.rowEl) this.fadeInRow()
        this.cm?.focus()
      })
      label.appendChild(radio)
      const span = document.createElement('span')
      span.textContent = name
      label.appendChild(span)
      radios.appendChild(label)
    })
    box.appendChild(radios)
    this.radiosEl = radios

    // 焦点进入显示环境选择栏，焦点移出尝试隐藏
    host.addEventListener('focusin', () => { box.style.display = 'block' })
    host.addEventListener('focusout', () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null
        const keep = !!(active && this.dom.contains(active))
        if (keep) { box.style.display = 'block'; return }
        box.style.display = 'none'
        this.hideEditorIfBlur()
      }, 150)
    })

    // host appended to row above
    wrapper.appendChild(preview)
    wrapper.appendChild(box)
    this.dom = wrapper
    this.cm = cm
    this.preview = preview
    this.box = box
    this.rowEl = row
    const inside = this.isSelectionInside()
    if (!inside) {
      row.style.display = 'none'
      row.classList.add('pm-block-editor-row-hidden')
      preview.style.display = 'block'
      preview.classList.remove('pm-block-preview-hidden')
    } else {
      row.style.display = 'flex'
      row.classList.remove('pm-block-editor-row-hidden')
      preview.style.display = 'block'
      preview.classList.remove('pm-block-preview-hidden')
    }
    this.ensureAutofocus()
    setTimeout(() => {
      const nowInside = this.isSelectionInside()
      if (this.rowEl) {
        if (nowInside) this.fadeInRow(); else this.fadeOutRow()
      }
      if (this.preview) {
        this.fadeInPreview()
      }
      this.ensureAutofocus()
    }, 0)
    this.renderLineNumbers(gutter, node.textContent || '')
    // 初始化时探测是否包裹了 \begin{env}...\end{env}，若存在则拆出 body 并写回 attrs
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
      this.schedulePreview(det.body, det.env, 1)
    } else {
      this.schedulePreview(initialText, node.attrs?.env, 1)
    }

    // 点击预览区域底部：在文档尾部插入一个空段，便于继续输入
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
      tr = tr.setSelection(TextSelection.create(tr.doc || this.view.state.doc, end + 1))
      this.view.dispatch(tr)
      if (this.rowEl) this.fadeInRow()
      this.cm?.focus()
    })

    // 响应主题/代码主题切换：重建 CM 状态与样式，并重新渲染预览
    this.unsub = useEditorStore.subscribe((state, prev) => {
      const curDark = state.config.theme === 'dark'
      const prevDark = prev.config.theme === 'dark'
      const themeKey = curDark ? state.config.codeblockThemeDark : state.config.codeblockThemeLight
      const prevKey = prevDark ? prev.config.codeblockThemeDark : prev.config.codeblockThemeLight
      if (curDark !== prevDark || themeKey !== prevKey) {
        this.dark = curDark
        this.prevThemeKey = themeKey
        const nextTheme = mapTheme(themeKey, curDark)
        const baseExt = [
          history(),
          keymap.of([{ key: 'Tab', run: acceptCompletion }]),
          keymap.of([{ key: 'Backspace', run: deleteEmptyBraces }, { key: 'Delete', run: deleteEmptyBraces }]),
          keymap.of([...defaultKeymap]),
          drawSelection(),
          dropCursor(),
          highlightActiveLine(),
          bracketMatching(),
          closeBrackets(),
          autocompletion({ override: [latexCompletionSource], activateOnTyping: true }),
          syntaxHighlighting(defaultHighlightStyle),
          StreamLanguage.define(stex),
          CMView.theme({
            '&': { fontFamily: 'Consolas, Monaco, monospace', fontSize: '15px', transition: 'background-color .25s, color .25s, border-color .25s' },
            '.cm-content': { padding: '8px' }
          })
        ]
        const state2 = CMState.create({ doc: this.cm?.state.doc.toString() || '', extensions: [...baseExt, nextTheme] })
        if (this.cm) this.cm.setState(state2)
        const g = this.dom.querySelector('.pm-code-gutter') as HTMLDivElement
        if (g) {
          g.style.background = this.dark ? '#0b1220' : '#f3f4f6'
          g.style.color = this.dark ? '#9ca3af' : '#9ca3af'
        }
        const curText = this.cm?.state.doc.toString() || ''
        this.schedulePreview(curText, this.node.attrs?.env, 30)
      }
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
      this.schedulePreview(text, node.attrs?.env, 60)
      const gutter = this.dom.querySelector('.pm-code-gutter') as HTMLDivElement
      if (gutter) this.renderLineNumbers(gutter, text)
    }
    // 根据 store 的 autofocusMathPos 在创建后自动将光标定位到公式体
    this.ensureAutofocus()
    const active = document.activeElement as HTMLElement | null
    const inside = (!!this.cm?.hasFocus) || !!(active && this.dom.contains(active))
    const row = this.rowEl
    if (row) { if (inside) this.fadeInRow(); else this.fadeOutRow() }
    this.fadeInPreview()
    return true
  }
  stopEvent() { return true }
  ignoreMutation() { return true }
  destroy() { if (this.unsub) this.unsub(); this.cm?.destroy() }

  private schedulePreview(text: string, env?: string, delay = 0) {
    // 预览调度：合成 raw（若有 env），在空闲或定时器中调用 MathJax 渲染
    const trimmed = (text || '').trim()
    const raw = env ? `\\begin{${env}} ${text} \\end{${env}}` : text
    if (!trimmed) {
      this.previewLastRaw = ''
      this.preview.innerHTML = ''
      const placeholder = document.createElement('div')
      placeholder.textContent = '<Empty Math Block>'
      placeholder.style.opacity = '0.6'
      this.preview.appendChild(placeholder)
      this.preview.style.textAlign = 'center'
      if (this.previewTimer) { clearTimeout(this.previewTimer) }
      return
    }
    if (raw === this.previewLastRaw) return
    this.previewLastRaw = raw
    const token = ++this.previewTick
    if (this.previewTimer) { clearTimeout(this.previewTimer) }
    const run = async () => {
      if (token !== this.previewTick) return
      try {
        const mod = await import('@/latex/mathjax')
        const el = mod.renderBlock(raw)
        if (token !== this.previewTick) return
        const container = document.createElement('div')
        container.appendChild(el)
        const scrollTop = this.preview.scrollTop
        this.preview.innerHTML = ''
        this.preview.appendChild(container)
        this.preview.scrollTop = scrollTop
        if (!env) {
          this.preview.style.textAlign = 'center'
          const svg = el.querySelector('svg') as SVGElement | null
          if (svg) {
            svg.style.display = 'inline-block'
            svg.style.margin = '0 auto'
          } else {
            el.style.display = 'inline-block'
            el.style.margin = '0 auto'
          }
        } else {
          this.preview.style.textAlign = ''
        }
      } catch (e) {
        const div = document.createElement('div')
        div.className = 'pm-math-error'
        const msg = (e as { message?: string }).message || 'render error'
        div.textContent = `MathJax: ${msg}`
        this.preview.innerHTML = ''
        this.preview.appendChild(div)
      }
    }
    if (this.previewTimer) { clearTimeout(this.previewTimer) }
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number }
    if (w.requestIdleCallback && delay >= 100) {
      this.previewTimer = w.requestIdleCallback(() => { run() })
    } else {
      this.previewTimer = window.setTimeout(() => { run() }, Math.max(0, delay))
    }
  }

  private detectOuterEnv(text: string): { env: string, body: string } | null {
    // 匹配完整的 \begin{env} ... \end{env} 包裹，并返回 env+内体
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
      const currentText = cm.state.doc.toString()
      this.schedulePreview(currentText, this.node.attrs?.env, 60)
      if (this.rowEl) this.fadeOutRow()
      if (this.preview) this.fadeInPreview()
      this.dom.addEventListener('click', () => {
        if (this.rowEl) this.fadeInRow()
        if (this.preview) this.fadeInPreview()
        this.cm?.focus()
      }, { once: true })
    }
  }

  private fadeInRow() {
    const el = this.rowEl
    if (!el) return
    el.style.display = 'flex'
    el.classList.remove('pm-block-editor-row-hidden')
  }

  private fadeOutRow() {
    const el = this.rowEl
    if (!el) return
    el.classList.add('pm-block-editor-row-hidden')
    setTimeout(() => { if (this.rowEl) this.rowEl.style.display = 'none' }, 180)
  }

  private fadeInPreview() {
    const el = this.preview
    if (!el) return
    el.style.display = 'block'
    el.classList.remove('pm-block-preview-hidden')
  }

  private fadeOutPreview() {
    const el = this.preview
    if (!el) return
    el.classList.add('pm-block-preview-hidden')
    setTimeout(() => { if (this.preview) this.preview.style.display = 'none' }, 180)
  }

  private ensureAutofocus() {
    // 若 store 指定了自动聚焦位置，则将选区移动到块内部并聚焦 CM
    const { autofocusMathPos, setAutofocusMathPos } = useEditorStore.getState() as unknown as { autofocusMathPos: number | null; setAutofocusMathPos: (pos: number | null) => void }
    try {
      const pos = this.getPos()
      if (autofocusMathPos === pos) {
        if (this.rowEl) this.rowEl.style.display = 'flex'
        const sel = TextSelection.create(this.view.state.doc, Math.max(1, pos + 1))
        const tr = this.view.state.tr.setSelection(sel)
        this.view.dispatch(tr)
        setTimeout(() => { this.cm?.focus() }, 0)
        setAutofocusMathPos(null)
      }
    } catch { void 0 }
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
