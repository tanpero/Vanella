import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView as PMEditorView } from 'prosemirror-view'
import { TextSelection } from 'prosemirror-state'
import { EditorState as CMState } from '@codemirror/state'
import { EditorView as CMView, keymap, drawSelection, dropCursor, highlightActiveLine } from '@codemirror/view'
import { history, defaultKeymap } from '@codemirror/commands'
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { useEditorStore } from '@/stores/editorStore'
import { mapTheme } from '@/modes/shared/codemirrorConfig'
import mermaid from 'mermaid'

/*
  MermaidBlockView：Mermaid 图表源码编辑与预览
  - 使用 CodeMirror 编辑图表源码，下方预览采用 mermaid.render
  - 根据主题（浅/深）动态初始化 mermaid 主题
  - 预览/编辑区随焦点与内容淡入/淡出，空内容时隐藏预览
  - 异常时显示错误盒，提示行号等信息以便定位
*/

export class MermaidBlockView {
  node: PMNode
  view: PMEditorView
  getPos: () => number
  dom: HTMLElement
  cm: CMView | null = null
  preview: HTMLDivElement
  rowEl: HTMLDivElement | null = null
  containerEl: HTMLDivElement | null = null
  updating = false
  dark: boolean = false
  prevThemeKey?: string
  unsub?: () => void

  constructor(node: PMNode, view: PMEditorView, getPos: () => number) {
    this.node = node
    this.view = view
    this.getPos = getPos

    const wrapper = document.createElement('div')
    wrapper.className = 'pm-mermaid-block'
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
          this.renderDiagram(text)
          this.renderLineNumbers(gutter, text)
        }
      }
    })

    row.appendChild(gutter)
    row.appendChild(host)
    wrapper.appendChild(row)

    const preview = document.createElement('div')
    preview.className = 'pm-mermaid-block-preview pm-block-preview'
    preview.style.padding = '8px'
    preview.style.minHeight = '32px'
    preview.style.overflow = 'auto'
    preview.style.textAlign = 'center'

    wrapper.appendChild(preview)

    this.dom = wrapper
    this.cm = cm
    this.preview = preview
    this.rowEl = row

    // 若已有源码则显示预览，否则仅显示编辑
    row.style.display = 'flex'
    const initialSrc = cm.state.doc.toString().trim()
    if (initialSrc.length) {
      preview.style.display = 'block'
      preview.classList.remove('pm-block-preview-hidden')
    } else {
      preview.style.display = 'none'
      preview.classList.add('pm-block-preview-hidden')
    }
    setTimeout(() => { this.cm?.focus() }, 0)

    // 初始化 mermaid 主题与预览容器
    mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' })
    const container = document.createElement('div')
    container.style.display = 'inline-block'
    container.style.margin = '0 auto'
    preview.appendChild(container)
    this.containerEl = container

    this.renderDiagram(cm.state.doc.toString())
    this.renderLineNumbers(gutter, node.textContent || '')

    // cleanup stray containers left by previous renders
    Array.from(document.querySelectorAll('div[id^="dmermaid-"]'))
      .forEach(el => { if (el.parentElement === document.body) el.remove() })

    host.addEventListener('focusin', () => {
      if (this.rowEl) this.fadeInRow()
      const cur = this.cm?.state.doc.toString().trim() || ''
      if (cur.length) this.fadeInPreview(); else this.fadeOutPreview()
    })
    host.addEventListener('focusout', () => {
      setTimeout(() => {
        const focused = !!this.cm?.hasFocus
        if (!focused) {
          const cur = this.cm?.state.doc.toString().trim() || ''
          if (this.rowEl) { if (cur.length) this.fadeOutRow(); else this.fadeInRow() }
          if (cur.length) this.fadeInPreview(); else this.fadeOutPreview()
        }
      }, 120)
    })
    preview.addEventListener('click', () => {
      const pos = this.getPos()
      const end = pos + this.node.nodeSize
      const tr = this.view.state.tr.setSelection(TextSelection.create(this.view.state.doc, end - 1))
      this.view.dispatch(tr)
      if (this.rowEl) this.fadeInRow()
      const cur = this.cm?.state.doc.toString().trim() || ''
      if (cur.length) this.fadeInPreview(); else this.fadeOutPreview()
      this.cm?.focus()
    })

    // 响应主题/代码主题变化：更新 CM 与 mermaid 渲染
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
          keymap.of([...defaultKeymap]),
          drawSelection(),
          dropCursor(),
          highlightActiveLine(),
          bracketMatching(),
          syntaxHighlighting(defaultHighlightStyle),
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
        mermaid.initialize({ startOnLoad: false, theme: this.dark ? 'dark' : 'default' })
        const cur = this.cm?.state.doc.toString() || ''
        this.renderDiagram(cur)
      }
    })
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    const text = node.textContent || ''
    if (!this.updating && this.cm && text !== this.cm.state.doc.toString()) {
      this.cm.dispatch({ changes: { from: 0, to: this.cm.state.doc.length, insert: text } })
      this.renderDiagram(text)
      const gutter = this.dom.querySelector('.pm-code-gutter') as HTMLDivElement
      if (gutter) this.renderLineNumbers(gutter, text)
    }
    // 根据选区与内容切换编辑区/预览的可见性；空内容时保留编辑区
    const hasSrc = (text.trim().length > 0)
    const inside = this.isSelectionInside()
    const row = this.rowEl
    if (row) { if (!hasSrc || inside) this.fadeInRow(); else this.fadeOutRow() }
    if (hasSrc) this.fadeInPreview(); else this.fadeOutPreview()
    // update mermaid theme on dark change
    const isDark = useEditorStore.getState().config.theme === 'dark'
    mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' })
    return true
  }

  selectNode() {}
  stopEvent() { return true }
  ignoreMutation() { return true }
  destroy() { if (this.unsub) this.unsub(); this.cm?.destroy() }

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

  private async renderDiagram(code: string) {
    // 渲染 Mermaid：解析源码，生成 SVG 放入容器；错误时提供提示
    try {
      const id = 'mermaid-' + Math.random().toString(36).slice(2)
      const isDark = useEditorStore.getState().config.theme === 'dark'
      mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' })
      const src = (code || '').trim()
      if (!src.length) {
        if (this.containerEl) this.containerEl.innerHTML = ''
        this.fadeOutPreview()
        return
      }
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      await mermaid.parse(src)
      if (!this.containerEl || !this.containerEl.isConnected) {
        const c = document.createElement('div')
        c.style.display = 'inline-block'
        c.style.margin = '0 auto'
        this.preview.appendChild(c)
        this.containerEl = c
      }
      this.containerEl.innerHTML = ''
      const { svg } = await mermaid.render(id, src)
      this.containerEl.innerHTML = svg
      this.fadeInPreview()
      const temp = document.getElementById('d' + id)
      if (temp && temp.parentElement === document.body) temp.remove()
    } catch (e) {
      try {
        const id = 'mermaid-' + Math.random().toString(36).slice(2)
        const isDark = useEditorStore.getState().config.theme === 'dark'
        mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' })
        const src = (code || '').trim()
        await mermaid.parse(src)
        const { svg } = await mermaid.render(id, src)
        if (!this.containerEl || !this.containerEl.isConnected) {
          const c = document.createElement('div')
          c.style.display = 'inline-block'
          c.style.margin = '0 auto'
          this.preview.appendChild(c)
          this.containerEl = c
        }
        this.containerEl.innerHTML = svg
        this.fadeInPreview()
        const temp = document.getElementById('d' + id)
        if (temp && temp.parentElement === document.body) temp.remove()
        return
      } catch (err) { console.warn(err) }
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
      title.textContent = '⚠️ Mermaid 解析错误'
      title.style.fontWeight = '600'
      title.style.marginBottom = '6px'
      const msg = String((e as { message?: string })?.message || e || 'Mermaid render error')
      const lineMatch = /line\s+(\d+)/i.exec(msg)
      const detail = document.createElement('pre')
      detail.textContent = msg
      detail.style.margin = '0'
      detail.style.whiteSpace = 'pre-wrap'
      detail.style.background = isDark ? '#111827' : '#fff'
      detail.style.border = isDark ? '1px solid #374151' : '1px solid #f59e0b'
      detail.style.borderRadius = '6px'
      detail.style.padding = '8px'
      const hint = document.createElement('div')
      hint.textContent = lineMatch ? `位置：第 ${lineMatch[1]} 行` : '点击以编辑修复'
      hint.style.marginTop = '6px'
      hint.style.opacity = '0.8'
      if (!this.containerEl || !this.containerEl.isConnected) {
        const c = document.createElement('div')
        c.style.display = 'inline-block'
        c.style.margin = '0 auto'
        this.preview.appendChild(c)
        this.containerEl = c
      }
      this.containerEl.innerHTML = ''
      box.appendChild(title)
      box.appendChild(detail)
      box.appendChild(hint)
      this.containerEl.appendChild(box)
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
}
