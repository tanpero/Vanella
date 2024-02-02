import { EditorView } from "codemirror"
import { Node } from "unified/lib"
import { visitChildren } from 'unist-util-visit-children'
import { Parent } from "unist-util-visit-children/lib"

export const computedPosition = (editor: EditorView, treeData: Node) => {
  visitChildren(
    node => {
      if (node.type !== 'element') return
      const line = node?.position?.start.line as number
      const lineStart = editor.state.doc.line(line).from as number
      const offsetTop = editor.coordsAtPos(lineStart, 1)?.top

      let firstChild: any
      let count = 0
      visitChildren(
        childNode => {
          if (count === 0)
            firstChild = childNode
          count += 1
        }
      )(node as Parent)

      console.log(firstChild.data, offsetTop)
    }
  )
  (treeData as Parent)
}
  