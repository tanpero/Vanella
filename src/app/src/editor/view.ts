import { EditorView } from 'prosemirror-view'
import { EditorState } from 'prosemirror-state'
import { history, redo, undo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { schema } from './model'

export const setupEditor = (el: HTMLElement) => {
  if (!el) return

  const editorState = EditorState.create({
    schema,
    plugins: [
      keymap({
        'Mod-z': undo,
        'Mod-y': redo,
        'Mod-b': toggleMark(schema.marks.strong), // Ctrl + B 切换加粗
        'Mod-i': toggleMark(schema.marks.italic), // Ctrl + I 切换斜体
        'Mod-d': toggleMark(schema.marks.strikethrough),
        'Mod-u': toggleMark(schema.marks.underline),
        'Mod-l': toggleMark(schema.marks.highlight),
        'Ctrl-0': setBlockType(schema.nodes.paragraph), // Ctrl + 0 设置为段落
        'Ctrl-1': setBlockType(schema.nodes.heading, { level: 1 }), // Ctrl + 1 设置为一级标题
        'Ctrl-2': setBlockType(schema.nodes.heading, { level: 2 }), // Ctrl + 2 设置为二级标题
        'Ctrl-3': setBlockType(schema.nodes.heading, { level: 3 }), // Ctrl + 3 设置为三级标题
        'Ctrl-4': setBlockType(schema.nodes.heading, { level: 4 }), // Ctrl + 4 设置为四级标题
        'Ctrl-5': setBlockType(schema.nodes.heading, { level: 5 }), // Ctrl + 5 设置为五级标题
        'Ctrl-6': setBlockType(schema.nodes.heading, { level: 6 }), // Ctrl + 6 设置为六级标题
        'Ctrl-=': setBlockType(schema.nodes.heading, { level: 1 }, true), // Ctrl + = 提升标题级别
        'Ctrl--': setBlockType(schema.nodes.heading, { level: 1 }, true), // Ctrl + - 降低标题级别
        'Ctrl-Shift-Q': setBlockType(schema.nodes.blockquote),
        'Ctrl-Shift-[': wrapInList(schema.nodes.ordered_list),
        'Ctrl-Shift-]': wrapInList(schema.nodes.bullet_list),
      }),
      history(),
      keymap(baseKeymap)
    ]
  })

  const editorView = new EditorView(el, {
    state: editorState
  })
}

function toggleMark(mark) {
  return function(state, dispatch) {
    const { selection, tr } = state
    tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
      if (node.isText) {
        const from = Math.max(selection.from, pos)
        const to = Math.min(selection.to, pos + node.nodeSize)
        const hasMark = mark.isInSet(tr.storedMarks || node.marks)

        if (hasMark) {
          tr.removeMark(from, to, mark)
        } else {
          tr.addMark(from, to, mark.create())
        }
      }
    })

    if (dispatch) {
      dispatch(tr)
    }

    return true
  }
}

function setBlockType(nodeType, attrs = {}, wrap = false) {
  return function(state, dispatch) {
    const { selection } = state
    const { from, to } = selection
    const hasWrapping = nodeType.spec && nodeType.spec.contains === 'block'
    const isWrapping = hasWrapping && wrap
    if (dispatch) {
      dispatch(state.tr.setBlockType(from, to, isWrapping ? nodeType : nodeType, { ...attrs }))
    }
    return true
  }
}


function wrapInList(nodeType) {
  return function (state, dispatch) {
    const { $from, $to } = state.selection
    const range = $from.blockRange($to)

    if (!range) return false

    // 检查选区内是否已经包含了列表节点，如果是，则取消列表节点的包裹
    const insideList = $from.node(range.depth - 1).type === nodeType
    if (insideList) {
      return unwrapList(state, dispatch)
    }

    if (dispatch) {
      dispatch(state.tr.wrap(range, [{ type: nodeType }]).scrollIntoView())
    }

    return true
  }
}

function unwrapList(state, dispatch) {
  const { $from, $to } = state.selection
  const range = $from.blockRange($to)

  if (!range) return false

  if (dispatch) {
    dispatch(state.tr.lift(range, state.schema.nodes.list_item).scrollIntoView())
  }

  return true
}
