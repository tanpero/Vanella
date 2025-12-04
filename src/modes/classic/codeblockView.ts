import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView as PMEditorView } from 'prosemirror-view'
import { EditorState as CMState } from '@codemirror/state'
import { EditorView as CMEditorView, drawSelection, dropCursor, highlightActiveLine } from '@codemirror/view'
import { keymap } from '@codemirror/view'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import type { Extension } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { xml } from '@codemirror/lang-xml'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { sql } from '@codemirror/lang-sql'
import { java } from '@codemirror/lang-java'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { cpp } from '@codemirror/lang-cpp'
import { StreamLanguage } from '@codemirror/stream-parser'
import { sass } from '@codemirror/lang-sass'
import { less } from '@codemirror/lang-less'
import { lezer } from '@codemirror/lang-lezer'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { yaml as yamlMode } from '@codemirror/legacy-modes/mode/yaml'
import { toml as tomlMode } from '@codemirror/legacy-modes/mode/toml'
import { csharp as csharpLang } from '@replit/codemirror-lang-csharp'

function mapLanguage(name: string | null | undefined): Extension | [] {
  const lang = (name || '').trim().toLowerCase()
  switch (lang) {
    case 'js':
    case 'javascript':
    case 'jsx':
      return javascript({ jsx: true })
    case 'ts':
    case 'typescript':
    case 'tsx':
      return javascript({ typescript: true, jsx: true })
    case 'java':
      return java()
    case 'c':
    case 'cpp':
    case 'c++':
      return cpp()
    case 'rs':
    case 'rust':
      return rust()
    case 'go':
      return go()
    case 'html':
      return html()
    case 'xml':
      return xml()
    case 'css':
      return css()
    case 'json':
      return json()
    case 'sql':
      return sql()
    case 'bash':
    case 'sh':
    case 'shell':
      return StreamLanguage.define(shell)
    case 'yaml':
    case 'yml':
      return StreamLanguage.define(yamlMode)
    case 'toml':
      return StreamLanguage.define(tomlMode)
    case 'sass':
      return sass()
    case 'less':
      return less()
    case 'lezer':
      return lezer()
    case 'c#':
    case 'csharp':
      return csharpLang()
    default:
      return []
  }
}

const LANGUAGE_ITEMS = [
  { name: 'javascript', aliases: ['js', 'jsx'] },
  { name: 'typescript', aliases: ['ts', 'tsx'] },
  { name: 'java', aliases: [] },
  { name: 'cpp', aliases: ['c++', 'c'] },
  { name: 'rust', aliases: ['rs'] },
  { name: 'go', aliases: [] },
  { name: 'html', aliases: [] },
  { name: 'xml', aliases: [] },
  { name: 'css', aliases: [] },
  { name: 'json', aliases: [] },
  { name: 'sql', aliases: [] },
  { name: 'shell', aliases: ['bash', 'sh'] },
  { name: 'yaml', aliases: ['yml'] },
  { name: 'toml', aliases: [] },
  { name: 'sass', aliases: [] },
  { name: 'less', aliases: [] },
  { name: 'lezer', aliases: [] },
  { name: 'csharp', aliases: ['c#'] }
]

export class CodeBlockView {
  node: PMNode
  view: PMEditorView
  getPos: () => number
  dom: HTMLElement
  cm: CMEditorView
  dark: boolean
  private updating: boolean = false
  private prevLang: string | null | undefined
  private langBox!: HTMLDivElement
  private langInput!: HTMLInputElement
  private langList!: HTMLDivElement
  private langListInBody: boolean = false

  constructor(node: PMNode, view: PMEditorView, getPos: () => number, dark: boolean) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.dark = dark
    this.prevLang = node.attrs?.language

    const wrapper = document.createElement('div')
    wrapper.className = `pm-codeblock-cm ${dark ? 'dark' : 'light'}`
    wrapper.style.border = dark ? '1px solid #374151' : '1px solid #e5e7eb'
    wrapper.style.borderRadius = '6px'
    wrapper.style.overflow = 'hidden'
    wrapper.style.margin = '8px 0'
    wrapper.style.display = 'block'
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.alignItems = 'stretch'

    const gutter = document.createElement('div')
    gutter.className = 'pm-code-gutter'
    gutter.style.width = '48px'
    gutter.style.flex = '0 0 48px'
    gutter.style.background = dark ? '#111827' : '#f9fafb'
    gutter.style.color = dark ? '#6b7280' : '#9ca3af'
    gutter.style.padding = '8px 8px 8px 12px'
    gutter.style.boxSizing = 'border-box'
    gutter.style.textAlign = 'right'
    gutter.style.fontFamily = 'Consolas, Monaco, monospace'
    gutter.style.fontSize = '13px'
    gutter.style.lineHeight = '1.6'

    const editorHost = document.createElement('div')
    editorHost.style.flex = '1 1 auto'
    editorHost.style.minWidth = '0'

    const initialDoc = node.textContent || ''
    const extensions: Extension[] = [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      drawSelection(),
      dropCursor(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle),
      CMEditorView.theme({
        '&': { fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px' },
        '.cm-content': { padding: '8px' }
      }),
      ...([] as any[]).concat(mapLanguage(node.attrs?.language)),
      dark ? oneDark : []
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
    this.langBox = this.createLangSelector(node.attrs?.language, wrapper)
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
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    // Only reconfigure language when actually changed
    const curLang = node.attrs?.language
    if (curLang !== this.prevLang) {
      this.prevLang = curLang
      const langExt = mapLanguage(curLang)
      const baseExt = [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        drawSelection(),
        dropCursor(),
        highlightActiveLine(),
        syntaxHighlighting(defaultHighlightStyle)
      ]
      const nextExt = ([] as any[]).concat(baseExt, langExt, this.dark ? oneDark : [])
      const state = CMState.create({ doc: this.cm.state.doc.toString(), extensions: nextExt })
      this.cm.setState(state)
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
  stopEvent(e: Event) { return true }
  ignoreMutation() { return true }
  destroy() { this.cm.destroy() }

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

  private createLangSelector(current?: string | null, container?: HTMLElement) {
    const box = document.createElement('div')
    box.style.display = 'none'
    box.style.borderTop = this.dark ? '1px solid #374151' : '1px solid #e5e7eb'
    box.style.background = this.dark ? '#111827' : '#f9fafb'
    box.style.padding = '6px 8px'
    box.style.fontFamily = 'Consolas, Monaco, monospace'
    box.style.fontSize = '13px'
    box.style.position = 'relative'
    box.style.minHeight = '38px'

    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = 'language'
    input.value = (current || '') + ''
    input.style.width = '180px'
    input.style.padding = '4px 6px'
    input.style.border = this.dark ? '1px solid #374151' : '1px solid #d1d5db'
    input.style.background = this.dark ? '#0b1220' : '#ffffff'
    input.style.color = this.dark ? '#d1d5db' : '#111827'
    input.style.position = 'absolute'
    input.style.right = '8px'
    input.style.bottom = '6px'

    const list = document.createElement('div')
    list.style.display = 'block'
    list.style.position = 'fixed'
    list.style.width = '220px'
    list.style.maxHeight = '180px'
    list.style.overflowY = 'auto'
    list.style.border = this.dark ? '1px solid #374151' : '1px solid #d1d5db'
    list.style.background = this.dark ? '#0b1220' : '#ffffff'
    list.style.borderRadius = '8px'
    list.style.boxShadow = '0 6px 16px rgba(0,0,0,.15)'
    list.style.padding = '6px'
    ;(list.style as any).zIndex = '2000'

    const positionList = () => {
      const rect = input.getBoundingClientRect()
      list.style.left = `${Math.max(8, rect.right - 220)}px`
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
        row.style.padding = '6px 8px'
        row.style.borderRadius = '6px'
        row.style.cursor = 'pointer'
        row.style.color = this.dark ? '#d1d5db' : '#111827'
        row.addEventListener('click', (e) => { e.preventDefault(); this.applyLanguage(it.name) })
        row.addEventListener('mouseover', () => { row.style.background = this.dark ? '#1f2937' : '#f3f4f6' })
        row.addEventListener('mouseout', () => { row.style.background = 'transparent' })

        const icon = document.createElement('span')
        icon.textContent = it.name.startsWith('j') ? '🟨' : it.name.startsWith('c') ? '🟦' : it.name.startsWith('p') ? '🟪' : '🟩'
        icon.style.marginRight = '8px'
        icon.style.fontSize = '14px'

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
