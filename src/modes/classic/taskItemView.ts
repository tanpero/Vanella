import { EditorView, NodeView } from 'prosemirror-view'
import { Node as PMNode } from 'prosemirror-model'

export class TaskItemView implements NodeView {
  node: PMNode
  view: EditorView
  getPos: () => number
  dom: HTMLElement
  contentDOM: HTMLElement
  checkbox: HTMLInputElement

  constructor(node: PMNode, view: EditorView, getPos: () => number) {
    this.node = node
    this.view = view
    this.getPos = getPos

    const li = document.createElement('li')
    li.className = 'pm-task-item'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = !!(node.attrs as any).checked
    input.addEventListener('change', () => {
      const pos = this.getPos()
      const tr = this.view.state.tr.setNodeMarkup(pos, undefined, { ...this.node.attrs, checked: input.checked })
      this.view.dispatch(tr)
    })
    const content = document.createElement('div')
    content.className = 'pm-task-content'

    li.appendChild(input)
    li.appendChild(content)

    this.dom = li
    this.checkbox = input
    this.contentDOM = content
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    const checked = (node.attrs as any).checked
    this.checkbox.checked = !!checked
    return true
  }

  destroy() {
    this.checkbox.remove()
  }
}
