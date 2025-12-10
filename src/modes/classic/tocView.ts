import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView as PMEditorView } from 'prosemirror-view'
import { TextSelection } from 'prosemirror-state'
import { useEditorStore } from '@/stores/editorStore'

/*
  TocView：目录块 NodeView
  - 扫描文档顶层标题，生成可点击跳转的目录列表
  - 目录块样式随主题调整边框颜色
  - 通过全局数组 TOC_VIEWS 提供外部主动刷新（例如事务后重渲染）
*/

export const TOC_VIEWS: TocView[] = []

type TocItem = { level: number; title: string; pos: number }

export class TocView {
  node: PMNode
  view: PMEditorView
  getPos: () => number
  dom: HTMLElement

  constructor(node: PMNode, view: PMEditorView, getPos: () => number) {
    this.node = node
    this.view = view
    this.getPos = getPos

    const wrap = document.createElement('div')
    wrap.className = 'pm-toc-block'
    wrap.style.margin = '.8rem 0'
    const isDark = useEditorStore.getState().config.theme === 'dark'
    wrap.style.border = isDark ? '1px solid #374151' : '1px solid #e5e7eb'
    wrap.style.borderRadius = '8px'
    wrap.style.padding = '10px 12px'
    wrap.style.textAlign = 'left'
    wrap.style.background = 'transparent'

    const titleEl = document.createElement('div')
    titleEl.textContent = '目录'
    titleEl.style.fontWeight = '600'
    titleEl.style.marginBottom = '6px'
    titleEl.style.opacity = '0.85'
    wrap.appendChild(titleEl)

    const list = document.createElement('div')
    list.style.display = 'block'
    list.style.fontSize = '14px'
    list.style.lineHeight = '1.6'
    wrap.appendChild(list)

    this.dom = wrap
    TOC_VIEWS.push(this)
    this.render()
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    return true
  }
  selectNode() {}
  stopEvent() { return true }
  ignoreMutation() { return true }
  destroy() {
    const i = TOC_VIEWS.indexOf(this)
    if (i >= 0) TOC_VIEWS.splice(i, 1)
  }

  render() {
    const list = this.dom.children[1] as HTMLDivElement
    if (!list) return
    const isDark = useEditorStore.getState().config.theme === 'dark'
    ;(this.dom as HTMLDivElement).style.border = isDark ? '1px solid #374151' : '1px solid #e5e7eb'
    list.innerHTML = ''
    const items: TocItem[] = []
    const { doc } = this.view.state
    // 收集顶层标题（h1~h6）作为目录项
    doc.forEach((node, offset) => {
      if (node.type.name === 'heading') {
        items.push({ level: node.attrs.level || 1, title: node.textContent || '', pos: offset + 1 })
      }
    })
    if (!items.length) {
      const empty = document.createElement('div')
      empty.textContent = '（无标题）'
      empty.style.opacity = '0.7'
      list.appendChild(empty)
      return
    }
    for (const it of items) {
      const row = document.createElement('div')
      row.style.cursor = 'pointer'
      row.style.padding = '2px 4px'
      row.style.marginLeft = `${(it.level - 1) * 12}px`
      row.textContent = it.title
      row.addEventListener('click', () => {
        // 跳转到标题位置并平滑滚动到视口
        const tr = this.view.state.tr.setSelection(TextSelection.create(this.view.state.doc, it.pos))
        this.view.dispatch(tr)
        const el = this.view.domAtPos(it.pos).node as HTMLElement
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      list.appendChild(row)
    }
  }
}
