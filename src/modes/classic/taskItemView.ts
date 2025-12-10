import { EditorView, NodeView } from 'prosemirror-view'
import { Node as PMNode } from 'prosemirror-model'

/*
  TaskItemView：GFM 任务清单复选项的 NodeView
  - 将 list_item 的 attrs.checked 映射到复选框
  - 勾选时写回节点属性并触发视图更新
  - contentDOM 承载任务项的文本内容
*/

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
    input.checked = !!(node.attrs as { checked?: boolean | null }).checked
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
    const checked = (node.attrs as { checked?: boolean | null }).checked
    this.checkbox.checked = !!checked
    return true
  }

  destroy() {
    this.checkbox.remove()
  }
}
