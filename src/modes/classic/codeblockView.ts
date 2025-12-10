import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView as PMEditorView } from 'prosemirror-view'
import { TextSelection } from 'prosemirror-state'
import { EditorState as CMState } from '@codemirror/state'
import { EditorView as CMEditorView, drawSelection, dropCursor, highlightActiveLine } from '@codemirror/view'
import { keymap } from '@codemirror/view'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { mapLanguage, LANGUAGE_ITEMS, mapTheme } from '@/modes/shared/codemirrorConfig'
import { useEditorStore } from '@/stores/editorStore'
import type { Extension } from '@codemirror/state'

export class CodeBlockView {
  node: PMNode
  view: PMEditorView
  getPos: () => number
  dom: HTMLElement
  cm: CMEditorView
  dark: boolean
  private updating: boolean = false
  private prevLang: string | null | undefined
  private prevThemeKey?: string
  private langBox!: HTMLDivElement
  private langInput!: HTMLInputElement
  private langList!: HTMLDivElement
  private langListInBody: boolean = false
  private unsub?: () => void

  constructor(node: PMNode, view: PMEditorView, getPos: () => number) {
    this.node = node
    this.view = view
    this.getPos = getPos
    const isDark = useEditorStore.getState().config.theme === 'dark'
    this.dark = isDark
    this.prevLang = node.attrs?.language

    const wrapper = document.createElement('div')
    wrapper.className = `pm-codeblock-cm ${isDark ? 'dark' : 'light'}`
    wrapper.style.border = isDark ? '1px solid #374151' : '1px solid #e5e7eb'
    wrapper.style.borderRadius = '6px'
    wrapper.style.overflow = 'hidden'
    wrapper.style.margin = '8px 0'
    wrapper.style.display = 'block'
    wrapper.style.position = 'relative'
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.alignItems = 'stretch'

    const gutter = document.createElement('div')
    gutter.className = 'pm-code-gutter'
    gutter.style.width = '36px'
    gutter.style.flex = '0 0 36px'
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

    const editorHost = document.createElement('div')
    editorHost.style.flex = '1 1 auto'
    editorHost.style.minWidth = '0'

    const initialDoc = node.textContent || ''
    const { config } = useEditorStore.getState()
    const chosenTheme = isDark ? config.codeblockThemeDark : config.codeblockThemeLight
    const themeExt = mapTheme(chosenTheme, isDark)
    this.prevThemeKey = chosenTheme

    const langExtCandidate = mapLanguage(node.attrs?.language)
    const langExtArr: Extension[] = Array.isArray(langExtCandidate) ? langExtCandidate : [langExtCandidate]
    const extensions: Extension[] = [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      drawSelection(),
      dropCursor(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle),
      CMEditorView.theme({
        '&': { fontSize: '15px', transition: 'background-color .25s, color .25s, border-color .25s' },
        '.cm-scroller, .cm-content, .cm-line': { fontFamily: 'Consolas, Monaco, monospace' },
        '.cm-content': { padding: '8px' }
      }),
      ...langExtArr,
      themeExt
    ]

    const state = CMState.create({ doc: initialDoc, extensions })
    const cm = new CMEditorView({
      state,
      parent: editorHost,
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
          this.renderLineNumbers(gutter, text)
        }
      }
    })

    row.appendChild(gutter)
    row.appendChild(editorHost)
    wrapper.appendChild(row)
    this.langBox = this.createLangSelector(node.attrs?.language)
    wrapper.appendChild(this.langBox)
    this.dom = wrapper
    this.cm = cm
    this.renderLineNumbers(gutter, initialDoc)

    wrapper.addEventListener('focusin', () => {
      this.langBox.style.display = 'block'
    })
    wrapper.addEventListener('focusout', () => {
      setTimeout(() => {
        const ae = document.activeElement as HTMLElement | null
        if (!ae || (!wrapper.contains(ae))) {
          this.langBox.style.display = 'none'
        }
      }, 150)
    })
    wrapper.addEventListener('mousedown', () => { this.cm.focus() })
    editorHost.addEventListener('mousedown', () => { this.cm.focus() })
    // allow default click selection behavior; only focus without preventing default
    // removed pointerdown preventDefault to restore mouse-based cursor placement

    setTimeout(() => { this.cm.focus() }, 0)

    // click near bottom to add new line at tail when code block is last
    wrapper.addEventListener('click', (e) => {
      const rect = wrapper.getBoundingClientRect()
      const y = (e as MouseEvent).clientY
      const nearBottom = y > rect.bottom - 12
      const state = this.view.state
      const pos = this.getPos()
      const end = pos + this.node.nodeSize
      const isTail = end === state.doc.content.size
      if (nearBottom && isTail) {
        const last = state.doc.lastChild
        const needNewLine = !last || last.type.name !== 'paragraph' || (last.textContent || '').length !== 0
        if (needNewLine) {
          const tr = state.tr.insert(end, state.schema.nodes.paragraph.create())
          this.view.dispatch(tr.setSelection(TextSelection.create(tr.doc, end + 1)))
        } else {
          const tr = state.tr.setSelection(TextSelection.create(state.doc, end + 1))
          this.view.dispatch(tr)
        }
      }
    })

    this.unsub = useEditorStore.subscribe((state, prev) => {
      const curDark = state.config.theme === 'dark'
      const themeKey = curDark ? state.config.codeblockThemeDark : state.config.codeblockThemeLight
      const prevDark = prev.config.theme === 'dark'
      const prevKey = prevDark ? prev.config.codeblockThemeDark : prev.config.codeblockThemeLight
      if (curDark !== prevDark || themeKey !== prevKey) {
        this.dark = curDark
        this.prevThemeKey = themeKey
        const langExt = mapLanguage(this.prevLang)
        const baseExt = [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          drawSelection(),
          dropCursor(),
          highlightActiveLine(),
          syntaxHighlighting(defaultHighlightStyle),
          CMEditorView.theme({
            '&': { fontSize: '15px' },
            '.cm-scroller, .cm-content, .cm-line': { fontFamily: 'Consolas, Monaco, monospace' },
            '.cm-content': { padding: '8px' }
          })
        ]
        const themeExt2 = mapTheme(themeKey, this.dark)
        const nextExt = [...baseExt, ...(Array.isArray(langExt) ? langExt : [langExt]), themeExt2]
        const state2 = CMState.create({ doc: this.cm.state.doc.toString(), extensions: nextExt })
        this.cm.setState(state2)
        const w = this.dom
        if (w) {
          w.className = `pm-codeblock-cm ${this.dark ? 'dark' : 'light'}`
          w.style.border = this.dark ? '1px solid #374151' : '1px solid #e5e7eb'
        }
        const g = this.dom.querySelector('.pm-code-gutter') as HTMLDivElement
        if (g) {
          g.style.background = this.dark ? '#0b1220' : '#f3f4f6'
          g.style.color = this.dark ? '#9ca3af' : '#9ca3af'
        }
        if (this.langInput) {
          this.langInput.style.border = this.dark ? '1px solid #374151' : '1px solid #d1d5db'
          this.langInput.style.background = this.dark ? '#0b1220' : '#ffffff'
          this.langInput.style.color = this.dark ? '#e5e7eb' : '#111827'
        }
        if (this.langList) {
          this.langList.style.border = this.dark ? '1px solid #374151' : '1px solid #d1d5db'
          this.langList.style.background = this.dark ? '#0b1220' : '#ffffff'
          this.langList.style.boxShadow = this.dark ? '0 6px 16px rgba(0,0,0,.35)' : '0 6px 16px rgba(0,0,0,.15)'
        }
      }
    })
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    // Only reconfigure language when actually changed
    const curLang = node.attrs?.language
    const { config } = useEditorStore.getState()
    const curDark = config.theme === 'dark'
    const themeKey = curDark ? config.codeblockThemeDark : config.codeblockThemeLight
    const needTheme = (this.dark !== curDark) || (this.prevThemeKey !== themeKey)
    if (curLang !== this.prevLang || needTheme) {
      this.prevLang = curLang
      const langExt = mapLanguage(curLang)
      const baseExt = [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        drawSelection(),
        dropCursor(),
        highlightActiveLine(),
        syntaxHighlighting(defaultHighlightStyle),
        CMEditorView.theme({
          '&': { fontSize: '15px' },
          '.cm-scroller, .cm-content, .cm-line': { fontFamily: 'Consolas, Monaco, monospace' },
          '.cm-content': { padding: '8px' }
        })
      ]
      this.dark = curDark
      const themeExt = mapTheme(themeKey, this.dark)
      this.prevThemeKey = themeKey
      const nextExt = [...baseExt, ...(Array.isArray(langExt) ? langExt : [langExt]), themeExt]
      const state = CMState.create({ doc: this.cm.state.doc.toString(), extensions: nextExt })
      this.cm.setState(state)
      // update outer styles
      const wrapper = this.dom
      if (wrapper) {
        wrapper.className = `pm-codeblock-cm ${this.dark ? 'dark' : 'light'}`
        wrapper.style.border = this.dark ? '1px solid #374151' : '1px solid #e5e7eb'
      }
      const gutter = this.dom.querySelector('.pm-code-gutter') as HTMLDivElement
      if (gutter) {
        gutter.style.background = this.dark ? '#0b1220' : '#f3f4f6'
        gutter.style.color = this.dark ? '#9ca3af' : '#9ca3af'
      }
      if (this.langInput) {
        this.langInput.style.border = this.dark ? '1px solid #374151' : '1px solid #d1d5db'
        this.langInput.style.background = this.dark ? '#0b1220' : '#ffffff'
        this.langInput.style.color = this.dark ? '#e5e7eb' : '#111827'
      }
      if (this.langList) {
        this.langList.style.border = this.dark ? '1px solid #374151' : '1px solid #d1d5db'
        this.langList.style.background = this.dark ? '#0b1220' : '#ffffff'
        this.langList.style.boxShadow = this.dark ? '0 6px 16px rgba(0,0,0,.35)' : '0 6px 16px rgba(0,0,0,.15)'
      }
    }
    const text = node.textContent || ''
    const cur = this.cm.state.doc.toString()
    if (!this.updating && text !== cur) {
      this.cm.dispatch({
        changes: { from: 0, to: this.cm.state.doc.length, insert: text }
      })
      const gutter = this.dom.querySelector('.pm-code-gutter') as HTMLDivElement
      if (gutter) this.renderLineNumbers(gutter, text)
    }
    return true
  }

  selectNode() {}
  stopEvent() { return true }
  ignoreMutation() { return true }
  destroy() { if (this.unsub) this.unsub(); this.cm.destroy() }

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

  private createLangSelector(current?: string | null) {
    const box = document.createElement('div')
    box.style.display = 'none'
    box.style.borderTop = 'none'
    box.style.background = 'transparent'
    box.style.padding = '0'
    box.style.fontFamily = 'Consolas, Monaco, monospace'
    box.style.fontSize = '13px'
    box.style.position = 'absolute'
    box.style.minHeight = '0'
    box.style.right = '8px'
    box.style.bottom = '6px'

    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = 'language'
    input.value = (current || '') + ''
    input.style.width = '140px'
    input.style.padding = '3px 6px'
    input.style.border = this.dark ? '1px solid #374151' : '1px solid #d1d5db'
    input.style.background = this.dark ? '#0b1220' : '#ffffff'
    input.style.color = this.dark ? '#d1d5db' : '#111827'
    input.style.position = 'relative'

    const list = document.createElement('div')
    list.style.display = 'block'
    list.style.position = 'fixed'
    list.style.width = '180px'
    list.style.maxHeight = '160px'
    list.style.overflowY = 'auto'
    list.style.border = this.dark ? '1px solid #374151' : '1px solid #d1d5db'
    list.style.background = this.dark ? '#0b1220' : '#ffffff'
    list.style.borderRadius = '6px'
    list.style.boxShadow = this.dark ? '0 6px 16px rgba(0,0,0,.35)' : '0 6px 16px rgba(0,0,0,.15)'
    list.style.padding = '4px'
    list.style.zIndex = '2000'

    const positionList = () => {
      const rect = input.getBoundingClientRect()
      list.style.left = `${Math.max(8, rect.right - 180)}px`
      list.style.top = `${rect.bottom + 6}px`
    }

    const render = (q: string) => {
      list.innerHTML = ''
      const qq = q.trim().toLowerCase()
      const items = LANGUAGE_ITEMS.filter(it => !qq || it.name.startsWith(qq) || it.aliases.some(a => a.startsWith(qq)))
      items.slice(0, 10).forEach(it => {
        const row = document.createElement('div')
        row.style.display = 'flex'
        row.style.alignItems = 'center'
        row.style.padding = '4px 6px'
        row.style.borderRadius = '4px'
        row.style.cursor = 'pointer'
        row.style.color = this.dark ? '#e5e7eb' : '#111827'
        row.addEventListener('click', (e) => { e.preventDefault(); this.applyLanguage(it.name) })
        row.addEventListener('mouseover', () => { row.style.background = this.dark ? '#1f2937' : '#f3f4f6' })
        row.addEventListener('mouseout', () => { row.style.background = 'transparent' })

        const icon = document.createElement('span')
        icon.textContent = it.name.startsWith('j') ? '🟨' : it.name.startsWith('c') ? '🟦' : it.name.startsWith('p') ? '🟪' : '🟩'
        icon.style.marginRight = '8px'
        icon.style.fontSize = '12px'

        const label = document.createElement('span')
        label.textContent = it.name

        row.appendChild(icon)
        row.appendChild(label)
        list.appendChild(row)
      })
    }

    input.addEventListener('input', () => {
      list.style.display = 'block'
      positionList()
      render(input.value)
    })
    input.addEventListener('focus', () => {
      list.style.display = 'block'
      positionList()
      if (!this.langListInBody) {
        document.body.appendChild(list)
        this.langListInBody = true
      }
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const v = input.value.trim().toLowerCase()
        const hit = LANGUAGE_ITEMS.find(it => it.name === v || it.aliases.includes(v))
        this.applyLanguage(hit ? hit.name : v)
      }
    })
    input.addEventListener('blur', () => {
      setTimeout(() => {
        const ae = document.activeElement as HTMLElement | null
        if (!ae || (!box.contains(ae))) {
          list.style.display = 'none'
          box.style.display = 'none'
          if (this.langListInBody && list.parentElement === document.body) {
            document.body.removeChild(list)
            this.langListInBody = false
          }
        }
      }, 150)
    })

    render(input.value)
    box.appendChild(input)
    this.langInput = input
    this.langList = list
    return box
  }

  private applyLanguage(lang: string) {
    const pos = this.getPos()
    const attrs = { ...this.node.attrs, language: lang }
    const tr = this.view.state.tr.setNodeMarkup(pos, null, attrs)
    this.view.dispatch(tr)
    this.langBox.style.display = 'none'
    if (this.langInput) this.langInput.blur()
  }
}
