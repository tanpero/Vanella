import { useEffect, useRef } from 'react'
import { EditorState, Plugin, TextSelection } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'
import { schema } from './schema'
import { useEditorStore } from '@/stores/editorStore'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { history, undo, redo } from 'prosemirror-history'
import { inputRules, textblockTypeInputRule, wrappingInputRule, InputRule } from 'prosemirror-inputrules'
import { toggleMark } from 'prosemirror-commands'
import { splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list'
import { dropCursor } from 'prosemirror-dropcursor'
import { gapCursor } from 'prosemirror-gapcursor'
import { markdownToPmDoc, pmDocToMarkdown } from '@/markdown/convert'
import { buildInlineDecorations } from '@/modes/classic/inlineMarkdown'
import '@/styles/editor.css'
import { CodeBlockView } from './codeblockView'
import { MathBlockView } from './mathBlockView'
import { TaskItemView } from './taskItemView'
import { MermaidBlockView } from './mermaidBlockView'
import { ImageView } from './imageView'
import { buildMathInlineDecorations } from '@/modes/classic/mathInline'

function markerDecorations(state: EditorState): DecorationSet {
  const decos: Decoration[] = []
  const sel = state.selection
  const $pos = sel.$from

  const depth = $pos.depth
  if (depth > 0) {
    const nodeStart = $pos.before(depth)
    const nodeEnd = $pos.after(depth)
    const block = $pos.parent
    if (block.type.name === 'heading') {
      const level = block.attrs.level || 1
      decos.push(Decoration.node(nodeStart, nodeEnd, { class: `pm-heading-l${level}` }))
    } else if (block.type.name === 'blockquote') {
      decos.push(Decoration.node(nodeStart, nodeEnd, { class: 'pm-blockquote-marker' }))
    } else if (block.type.name === 'code_block') {
      decos.push(Decoration.node(nodeStart, nodeEnd, { class: 'pm-codeblock-marker' }))
    }
  }

  const parent = $pos.parent
  if (parent && parent.isTextblock) {
    let accum = 0
    for (let i = 0; i < parent.childCount; i++) {
      const child = parent.child(i)
      const fromAbs = $pos.start() + accum
      const toAbs = fromAbs + child.nodeSize
      if (child.isText) {
        const hasStrong = child.marks.some(m => m.type === state.schema.marks.strong)
        const hasEm = child.marks.some(m => m.type === state.schema.marks.em)
        const hasCode = child.marks.some(m => m.type === state.schema.marks.code)
        const linkMark = child.marks.find(m => m.type === state.schema.marks.link)
        if (hasStrong) {
          decos.push(Decoration.widget(fromAbs, () => {
            const el = document.createElement('span')
            el.textContent = '**'
            el.setAttribute('data-marker', 'strong-start')
            el.contentEditable = 'true'
            el.style.opacity = '0.6'
            return el
          }))
          decos.push(Decoration.widget(toAbs, () => {
            const el = document.createElement('span')
            el.textContent = '**'
            el.setAttribute('data-marker', 'strong-end')
            el.contentEditable = 'true'
            el.style.opacity = '0.6'
            return el
          }))
        }
        if (hasEm) {
          decos.push(Decoration.widget(fromAbs, () => {
            const el = document.createElement('span')
            el.textContent = '*'
            el.setAttribute('data-marker', 'em-start')
            el.contentEditable = 'true'
            el.style.opacity = '0.6'
            return el
          }))
          decos.push(Decoration.widget(toAbs, () => {
            const el = document.createElement('span')
            el.textContent = '*'
            el.setAttribute('data-marker', 'em-end')
            el.contentEditable = 'true'
            el.style.opacity = '0.6'
            return el
          }))
        }
        if (hasCode) {
          decos.push(Decoration.widget(fromAbs, () => {
            const el = document.createElement('span')
            el.textContent = '`'
            el.setAttribute('data-marker', 'code-start')
            el.contentEditable = 'true'
            el.style.opacity = '0.6'
            return el
          }))
          decos.push(Decoration.widget(toAbs, () => {
            const el = document.createElement('span')
            el.textContent = '`'
            el.setAttribute('data-marker', 'code-end')
            el.contentEditable = 'true'
            el.style.opacity = '0.6'
            return el
          }))
        }
        if (linkMark) {
          const show = sel.anchor >= fromAbs && sel.anchor <= toAbs || sel.anchor === fromAbs || sel.anchor === toAbs
          if (show) {
            decos.push(Decoration.widget(fromAbs, () => {
              const el = document.createElement('span')
              el.textContent = '['
              el.setAttribute('data-marker', 'link-start')
              el.contentEditable = 'true'
              el.style.opacity = '0.6'
              return el
            }))
            decos.push(Decoration.widget(toAbs, () => {
              const el = document.createElement('span')
              el.textContent = ']'
              el.setAttribute('data-marker', 'link-end')
              el.contentEditable = 'true'
              el.style.opacity = '0.6'
              return el
            }))
            const href = linkMark.attrs.href || ''
            decos.push(Decoration.widget(toAbs, () => {
              const el = document.createElement('span')
              el.textContent = `(${href})`
              el.setAttribute('data-marker', 'link-href')
              el.setAttribute('data-link-from', String(fromAbs))
              el.setAttribute('data-link-to', String(toAbs))
              el.contentEditable = 'true'
              el.style.opacity = '0.6'
              return el
            }))
          }
        }
      }
      accum += child.nodeSize
    }
  }

  const inlineDecos = buildInlineDecorations(state)
  return DecorationSet.create(state.doc, decos.concat(inlineDecos))
}

export default function ClassicEditor() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { activeFile, updateFileContent, config, markdownSource, setPmView, showContextMenu } = useEditorStore()
  const isDark = config.theme === 'dark'
  const captionCentered = !!config.imageCaptionBelowCentered

  useEffect(() => {
    let disposed = false
    const run = async () => {
      if (!mountRef.current) return
      const initialText = markdownSource || activeFile?.content || ''
      let initialDoc
      try {
        initialDoc = await markdownToPmDoc(schema, initialText)
      } catch {
        initialDoc = schema.node('doc', null, [schema.node('paragraph')])
      }
      const state = EditorState.create({
        doc: initialDoc as any,
        schema,
        plugins: [
          dropCursor(),
          gapCursor(),
          history(),
          new Plugin({
            appendTransaction: (trs, oldState, newState) => {
              if (!trs.some(t => t.docChanged)) return null
              const sel = newState.selection
              const $pos = sel.$from
              const parent = $pos.parent
              if (!parent || !parent.isTextblock) return null
              const baseStart = $pos.start()
              const text = parent.textContent || ''
              const mImg = /!\[([^\]]*?)\]\(([^)]+?)\)/.exec(text)
              if (mImg) {
                const idx = mImg.index
                const full = mImg[0]
                const alt = mImg[1] || ''
                const src = mImg[2] || ''
                const fromAbs = baseStart + idx
                const toAbs = fromAbs + full.length
                const img = (schema.nodes as any).image.create({ src, alt })
                const tr = newState.tr.replaceRangeWith(fromAbs, toAbs, img)
                return tr
              }
              const mLink = /\[([^\]]+?)\]\(([^)]+?)\)/.exec(text)
              if (mLink) {
                const idx = mLink.index
                const full = mLink[0]
                const inner = mLink[1]
                const href = mLink[2]
                const fromAbs = baseStart + idx
                const toAbs = fromAbs + full.length
                const mark = schema.marks.link.create({ href })
                const node = schema.text(inner, [mark])
                const tr = newState.tr.replaceRangeWith(fromAbs, toAbs, node)
                return tr
              }
              const mStrong = /\*\*([^\n*]+?)\*\*/.exec(text)
              if (mStrong) {
                const idx = mStrong.index
                const full = mStrong[0]
                const inner = mStrong[1]
                const fromAbs = baseStart + idx
                const toAbs = fromAbs + full.length
                const node = schema.text(inner, [schema.marks.strong.create()])
                const tr = newState.tr.replaceRangeWith(fromAbs, toAbs, node)
                return tr
              }
              const mEm = /\*([^\n*]+?)\*/.exec(text)
              if (mEm) {
                const idx = mEm.index
                const full = mEm[0]
                const inner = mEm[1]
                const fromAbs = baseStart + idx
                const toAbs = fromAbs + full.length
                const node = schema.text(inner, [schema.marks.em.create()])
                const tr = newState.tr.replaceRangeWith(fromAbs, toAbs, node)
                return tr
              }
              const mCode = /`([^`]+?)`/.exec(text)
              if (mCode) {
                const idx = mCode.index
                const full = mCode[0]
                const inner = mCode[1]
                const fromAbs = baseStart + idx
                const toAbs = fromAbs + full.length
                const node = schema.text(inner, [schema.marks.code.create()])
                const tr = newState.tr.replaceRangeWith(fromAbs, toAbs, node)
                return tr
              }
              return null
            }
          }),
          keymap({
            Enter: (state, dispatch) => {
              const txt = state.selection.$from.parent.textContent || ''
              const m = /^```([A-Za-z0-9+\-]*)$/.exec(txt)
              if (m) {
                const start = state.selection.$from.start()
                const end = state.selection.$from.end()
                const lang = (m[1] || '').trim()
                if (lang.toLowerCase() === 'mermaid' && (schema.nodes as any).mermaid_block) {
                  let tr = state.tr.replaceRangeWith(start, end, (schema.nodes as any).mermaid_block.create())
                  tr = tr.setSelection(TextSelection.create(tr.doc, start + 1))
                  if (dispatch) dispatch(tr)
                } else {
                  const tr = state.tr.setBlockType(start, end, schema.nodes.code_block, { language: lang })
                  tr.deleteRange(start, end)
                  if (dispatch) dispatch(tr)
                }
                return true
              }
              const mMath = /^\$\$\s*$/.exec(txt)
              if (mMath) {
                const start = state.selection.$from.start()
                const end = state.selection.$from.end()
                let tr = state.tr.replaceRangeWith(start, end, schema.nodes.math_block.create())
                tr = tr.setSelection(TextSelection.create(tr.doc, start + 1))
                if (dispatch) dispatch(tr)
                return true
              }
              const liType = schema.nodes.list_item
              if (liType && splitListItem(liType)(state, dispatch)) return true
              return false
            },
            'Mod-z': undo,
            'Mod-y': redo,
            'Mod-b': (state, dispatch) => toggleMark(schema.marks.strong)(state, dispatch),
            'Mod-i': (state, dispatch) => toggleMark(schema.marks.em)(state, dispatch),
            'Mod-]': sinkListItem(schema.nodes.list_item),
            'Mod-[': liftListItem(schema.nodes.list_item),
            Backspace: (state, dispatch) => {
              const $from = state.selection.$from
              if ($from.parent.type === schema.nodes.list_item && $from.parentOffset === 0) {
                return liftListItem(schema.nodes.list_item)(state, dispatch)
              }
              if ($from.parent.type === schema.nodes.heading && $from.parentOffset === 0) {
                const start = $from.start()
                const end = $from.end()
                const tr = state.tr.setBlockType(start, end, schema.nodes.paragraph)
                if (dispatch) dispatch(tr)
                return true
              }
              if ($from.parent.type === schema.nodes.code_block && $from.parent.textContent.length === 0) {
                const start = $from.start()
                const end = $from.end()
                const tr = state.tr.setBlockType(start, end, schema.nodes.paragraph)
                if (dispatch) dispatch(tr)
                return true
              }
              const mermaidType = (schema.nodes as any).mermaid_block
              if ($from.parent.type === mermaidType && $from.parent.textContent.length === 0) {
                const start = $from.start()
                const end = $from.end()
                const tr = state.tr.setBlockType(start, end, schema.nodes.paragraph)
                if (dispatch) dispatch(tr)
                return true
              }
              return false
            }
          }),
          new Plugin({
            appendTransaction: (trs, oldState, newState) => {
              const sel = newState.selection
              const $pos = sel.$from
              const parent = $pos.parent
              if (!parent || !parent.isTextblock) return null
              const baseStart = $pos.start()
              const text = parent.textContent || ''
              // reuse inline parser logic
              const markerLenAt = (t: string) => (t.slice(0,2) === '**' ? 2 : 1)
              // simple scan for right-boundary reposition
              let accum = 0
              for (let i = 0; i < parent.childCount; i++) {
                const child = parent.child(i)
                const absFrom = baseStart + accum
                const absTo = absFrom + child.nodeSize
                if (sel.anchor >= absFrom && sel.anchor <= absTo && child.isText) {
                  const content = child.text || ''
                  // check patterns ending at anchor
                  if (content.endsWith('**')) {
                    const newPos = absTo
                    if (sel.anchor === absTo - 2) return newState.tr.setSelection(TextSelection.create(newState.doc, newPos))
                  } else if (content.endsWith('*')) {
                    const newPos = absTo
                    if (sel.anchor === absTo - 1) return newState.tr.setSelection(TextSelection.create(newState.doc, newPos))
                  } else if (content.endsWith('`')) {
                    const newPos = absTo
                    if (sel.anchor === absTo - 1) return newState.tr.setSelection(TextSelection.create(newState.doc, newPos))
                  }
                }
                accum += child.nodeSize
              }
              return null
            }
          }),
          new Plugin({
            props: {
              decorations: (s: EditorState) => {
                const md = buildInlineDecorations(s)
                const mx = buildMathInlineDecorations(s)
                return DecorationSet.create(s.doc, ([] as any[]).concat(md, mx))
              }
            }
          }),
          keymap(baseKeymap),
          inputRules({
            rules: [
              textblockTypeInputRule(/^#\s$/, schema.nodes.heading, { level: 1 }),
              textblockTypeInputRule(/^##\s$/, schema.nodes.heading, { level: 2 }),
              textblockTypeInputRule(/^###\s$/, schema.nodes.heading, { level: 3 }),
              wrappingInputRule(/^>\s$/, schema.nodes.blockquote),
              wrappingInputRule(/^\s*-\s$/, schema.nodes.bullet_list),
              wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.ordered_list, (m) => ({ order: +m[1] }), (m, node) => node.childCount + node.attrs.order == +m[1]),
              new InputRule(/^\[(.+?)\]\((.+?)\)$/, (state, match, start, end) => {
                const text = match[1]
                const href = match[2]
                const mark = schema.marks.link.create({ href })
                const node = state.schema.text(text, [mark])
                let tr = state.tr.replaceRangeWith(start, end, node)
                tr = tr.setSelection(TextSelection.create(tr.doc, start + text.length))
                return tr
              }),
              new InputRule(/^!\[(.*?)\]\((.+?)\)$/, (state, match, start, end) => {
                const alt = match[1] || ''
                const src = match[2] || ''
                const img = (schema.nodes as any).image.create({ src, alt })
                let tr = state.tr.replaceRangeWith(start, end, img)
                tr = tr.setSelection(TextSelection.create(tr.doc, Math.max(1, start + 1)))
                return tr
              }),
              new InputRule(/^\-\s\[( |x|X)\]\s$/, (state, match, start, end) => {
                const checked = (match[1] || ' ').toLowerCase() === 'x'
                const liType = schema.nodes.list_item
                const ulType = schema.nodes.bullet_list
                let tr = state.tr.deleteRange(start, end)
                const ul = ulType.create(null, [liType.create({ checked }, [schema.nodes.paragraph.create(null, [])])])
                tr = tr.insert(start, ul)
                tr = tr.setSelection(TextSelection.create(tr.doc, start + 3))
                return tr
              }),
              new InputRule(/^---$/, (state, match, start, end) => {
                let tr = state.tr.replaceRangeWith(start, end, schema.nodes.horizontal_rule.create())
                return tr
              }),
              new InputRule(/^\$\$\s$/, (state, match, start, end) => {
                let tr = state.tr.replaceRangeWith(start, end, schema.nodes.math_block.create())
                tr = tr.setSelection(TextSelection.create(tr.doc, start + 1))
                return tr
              })
            ]
          }),
          new Plugin({
            appendTransaction: (trs, oldState, newState) => {
              const last = newState.doc.lastChild
              if (!last || last.type !== schema.nodes.paragraph || last.textContent.length !== 0) {
                const tr = newState.tr.insert(newState.doc.content.size, schema.nodes.paragraph.create())
                return tr
              }
              return null
            }
          }),
          new Plugin({
            props: {
              decorations: (s: EditorState) => markerDecorations(s),
              handleDOMEvents: {
                keydown: (view, event: KeyboardEvent) => {
                  const sel = view.state.selection
                  const pos = sel.$from.pos
                  const schema = view.state.schema
                  const strong = schema.marks.strong
                  const em = schema.marks.em
                  const code = schema.marks.code
                  const handleRemove = (markType: any) => {
                    // remove mark around current text node
                    const $pos = view.state.doc.resolve(pos)
                    const parent = $pos.parent
                    let accum = 0
                    for (let i = 0; i < parent.childCount; i++) {
                      const child = parent.child(i)
                      const fromAbs = $pos.start() + accum
                      const toAbs = fromAbs + child.nodeSize
                      if (pos >= fromAbs && pos <= toAbs) {
                        const tr = view.state.tr.removeMark(fromAbs, toAbs, markType)
                        view.dispatch(tr)
                        return true
                      }
                      accum += child.nodeSize
                    }
                    return false
                  }
                  if (event.key === 'Backspace' || event.key === 'Delete') {
                    const target = event.target as HTMLElement
                    const tag = target?.getAttribute?.('data-marker') || ''
                    if (tag.startsWith('strong')) return handleRemove(strong)
                    if (tag.startsWith('em')) return handleRemove(em)
                    if (tag.startsWith('code')) return handleRemove(code)
                  }
                  return false
                }
                , click: (view, event: MouseEvent) => {
                  const target = event.target as HTMLElement
                  if (target && target.closest('a[href]')) {
                    const el = target.closest('a[href]') as HTMLAnchorElement
                    const href = el.getAttribute('href') || ''
                    if (href) {
                      if (event.ctrlKey || (event as any).detail === 2) {
                        event.preventDefault()
                        window.open(href, '_blank')
                        return true
                      }
                      event.preventDefault()
                      const pos = view.posAtDOM(el, 0)
                      const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, Math.max(1, pos)))
                      view.dispatch(tr)
                      return true
                    }
                  }
                  if (target && target.closest('.pm-math-inline')) {
                    const el = target.closest('.pm-math-inline') as HTMLElement
                    const pos = view.posAtDOM(el, 0)
                    const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, Math.max(1, pos + 1)))
                    view.dispatch(tr)
                    return true
                  }
                  return false
                }
                , paste: (view, event: ClipboardEvent) => {
                  const text = event.clipboardData?.getData('text/plain') || ''
                  const m = /^\$\$\s*\n([\s\S]*?)\n\$\$\s*$/.exec(text)
                  if (m) {
                    event.preventDefault()
                    const raw = m[1] || ''
                    const node = schema.nodes.math_block.create({}, schema.text(raw))
                    const tr = view.state.tr.replaceSelectionWith(node, false)
                    view.dispatch(tr)
                    return true
                  }
                  return false
                }
                , input: (view, event: InputEvent) => {
                  const target = event.target as HTMLElement
                  if (target && target.closest('.pm-image-markers')) {
                    return true
                  }
                  const tag = target?.getAttribute?.('data-marker') || ''
                  if (tag === 'link-href') {
                    const fromStr = target.getAttribute('data-link-from') || ''
                    const toStr = target.getAttribute('data-link-to') || ''
                    const from = parseInt(fromStr, 10)
                    const to = parseInt(toStr, 10)
                    if (!Number.isNaN(from) && !Number.isNaN(to)) {
                      const raw = target.textContent || ''
                      const m = /^\((.*)\)$/.exec(raw)
                      const nextHref = m ? m[1] : raw
                      let tr = view.state.tr.removeMark(from, to, view.state.schema.marks.link)
                      tr = tr.addMark(from, to, view.state.schema.marks.link.create({ href: nextHref }))
                      view.dispatch(tr)
                      return true
                    }
                  }
                  if (tag === 'image-alt' || tag === 'image-src') {
                    const posStr = target.getAttribute('data-image-pos') || ''
                    const pos = parseInt(posStr, 10)
                    if (!Number.isNaN(pos)) {
                      const $pos = view.state.doc.resolve(pos)
                      const parent = $pos.parent
                      let accum = 0
                      for (let i = 0; i < parent.childCount; i++) {
                        const child = parent.child(i)
                        const fromAbs = $pos.start() + accum
                        if (fromAbs === pos && child.type.name === 'image') {
                          const nextAlt = tag === 'image-alt' ? (target.textContent || '') : (child.attrs.alt || '')
                          const nextSrc = tag === 'image-src' ? (target.textContent || '') : (child.attrs.src || '')
                          const tr = view.state.tr.setNodeMarkup(pos, undefined, { ...child.attrs, alt: nextAlt, src: nextSrc })
                          view.dispatch(tr)
                          return true
                        }
                        accum += child.nodeSize
                      }
                    }
                  }
                  return false
                }
                , blur: (view, event: FocusEvent) => {
                  const target = event.target as HTMLElement
                  if (target && target.closest('.pm-image-markers')) return true
                  const tag = target?.getAttribute?.('data-marker') || ''
                  if (tag === 'link-href' || tag === 'image-alt' || tag === 'image-src') {
                    return true
                  }
                  return false
                }
              }
            }
          })
        ]
      })
      if (disposed) return
      const view = new EditorView(mountRef.current, {
        state,
        nodeViews: {
          code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos as any, isDark),
          math_block: (node, view, getPos) => new MathBlockView(node, view, getPos as any),
          mermaid_block: (node, view, getPos) => new MermaidBlockView(node, view, getPos as any),
          list_item: (node, view, getPos) => (node.attrs && node.attrs.checked !== null ? new TaskItemView(node, view, getPos as any) : undefined),
          image: (node, view, getPos) => new ImageView(node, view, getPos as any, captionCentered)
        },
        dispatchTransaction: tr => {
          const newState = view.state.apply(tr)
          view.updateState(newState)
          ;(async () => {
            const md = await pmDocToMarkdown(newState.doc as any)
            updateFileContent(md)
          })()
        }
      })
      viewRef.current = view
      setPmView(view)
    }
    run()
    return () => {
      disposed = true
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
      setPmView(null)
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const isDarkNow = config.theme === 'dark'
    const currentDoc = view.state.doc
    const plugins = view.state.plugins
    const mount = mountRef.current
    if (!mount) return
    const newState = EditorState.create({ doc: currentDoc as any, schema, plugins })
    const newView = new EditorView(mount, {
      state: newState,
      nodeViews: {
        code_block: (node, v, getPos) => new CodeBlockView(node, v, getPos as any, isDarkNow),
        math_block: (node, v, getPos) => new MathBlockView(node, v, getPos as any),
        mermaid_block: (node, v, getPos) => new MermaidBlockView(node, v, getPos as any),
        list_item: (node, v, getPos) => (node.attrs && node.attrs.checked !== null ? new TaskItemView(node, v, getPos as any) : undefined),
        image: (node, v, getPos) => new ImageView(node, v, getPos as any, captionCentered)
      },
      dispatchTransaction: tr => {
        const ns = newView.state.apply(tr)
        newView.updateState(ns)
        ;(async () => {
          const md = await pmDocToMarkdown(ns.doc as any)
          updateFileContent(md)
        })()
      }
    })
    view.destroy()
    viewRef.current = newView
    setPmView(newView)
  }, [config.theme])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const isDarkNow = config.theme === 'dark'
    const currentDoc = view.state.doc
    const plugins = view.state.plugins
    const mount = mountRef.current
    if (!mount) return
    const newState = EditorState.create({ doc: currentDoc as any, schema, plugins })
    const newView = new EditorView(mount, {
      state: newState,
      nodeViews: {
        code_block: (node, v, getPos) => new CodeBlockView(node, v, getPos as any, isDarkNow),
        math_block: (node, v, getPos) => new MathBlockView(node, v, getPos as any),
        mermaid_block: (node, v, getPos) => new MermaidBlockView(node, v, getPos as any),
        list_item: (node, v, getPos) => (node.attrs && node.attrs.checked !== null ? new TaskItemView(node, v, getPos as any) : undefined),
        image: (node, v, getPos) => new ImageView(node, v, getPos as any, captionCentered)
      },
      dispatchTransaction: tr => {
        const ns = newView.state.apply(tr)
        newView.updateState(ns)
        ;(async () => {
          const md = await pmDocToMarkdown(ns.doc as any)
          updateFileContent(md)
        })()
      }
    })
    view.destroy()
    viewRef.current = newView
    setPmView(newView)
  }, [config.codeblockThemeLight, config.codeblockThemeDark])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    ;(async () => {
      try {
        const doc = await markdownToPmDoc(schema, markdownSource || activeFile?.content || '')
        const newState = EditorState.create({ doc: doc as any, schema, plugins: view.state.plugins })
        view.updateState(newState)
      } catch {}
    })()
  }, [activeFile?.id])

  return (
    <div
      ref={mountRef}
      className={`pm-editor ${isDark ? 'dark' : 'light'} pm-shell`}
      style={{
        height: '100%',
        width: '100%',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onContextMenu={(e) => { e.preventDefault(); showContextMenu(e.clientX, e.clientY) }}
    />
  )
}
